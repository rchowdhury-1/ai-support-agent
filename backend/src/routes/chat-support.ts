/**
 * Support helpers for the public widget API (chat.ts): agent/session loading,
 * origin binding, cap enforcement, answer persistence, and the learning-loop
 * signals. Kept out of the route file so chat.ts is just the endpoints.
 */
import { type Request, type Response } from 'express';
import { z } from 'zod';
import { withSystem, withTenant } from '../db/tenant.js';
import { type GenerationResult } from '../services/generation.js';
import { isWeakRetrieval, type RetrievedChunk } from '../services/retrieval.js';

export interface AgentRow {
  id: string;
  tenant_id: string;
  name: string;
  system_prompt: string;
  welcome_message: string;
  color: string;
  theme: 'light' | 'dark';
  disclaimer: string;
  powered_by: boolean;
  suggested_questions: string[];
  model: 'haiku' | 'sonnet';
  status: 'live' | 'paused';
  allowed_origins: string[];
  monthly_cap: number;
  daily_cap: number;
  session_cap: number;
  tenant_status: 'active' | 'pending' | 'paused' | 'past_due';
}

const AGENT_QUERY = `
  SELECT a.*, t.status AS tenant_status
  FROM agents a JOIN tenants t ON t.id = a.tenant_id
`;

export async function loadAgent(agentId: string): Promise<AgentRow | null> {
  if (!z.string().uuid().safeParse(agentId).success) return null;
  const { rows } = await withSystem((db) => db.query(`${AGENT_QUERY} WHERE a.id = $1`, [agentId]));
  return (rows[0] as AgentRow) ?? null;
}

function normalizeOrigin(o: string): string {
  return o.trim().replace(/\/+$/, '').toLowerCase();
}

/**
 * Origin binding. Browser requests must present an Origin on the agent's
 * allowlist; the matched origin is echoed back (never `*`). Requests without
 * an Origin header (curl, server-side, same-origin GET) pass — they are not
 * CORS-protected and carry no ambient credentials.
 */
export function assertOrigin(req: Request, res: Response, agent: AgentRow): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  const allowed = agent.allowed_origins.map(normalizeOrigin);
  if (allowed.includes(normalizeOrigin(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    return true;
  }
  res.status(403).json({ error: 'Origin not allowed for this agent' });
  return false;
}

export interface SessionCtx {
  id: string;
  messages_count: number;
  agent: AgentRow;
}

export async function resolveSession(sessionId: string): Promise<SessionCtx | null> {
  const { rows } = await withSystem((db) =>
    db.query(
      // a.* also carries an `id` column — alias the conversation id so the
      // two never collide in the result row.
      `SELECT c.id AS conversation_id, c.messages_count, a.*, t.status AS tenant_status
       FROM conversations c
       JOIN agents a ON a.id = c.agent_id
       JOIN tenants t ON t.id = a.tenant_id
       WHERE c.session_id = $1`,
      [sessionId]
    )
  );
  const r = rows[0];
  if (!r) return null;
  const { conversation_id, messages_count, ...agent } = r;
  return { id: conversation_id, messages_count, agent: agent as AgentRow };
}

// A single conversation may hold up to this multiple of the per-session cap
// (user + assistant messages) before it is refused — headroom for a long chat.
const SESSION_CAP_BURST_MULTIPLIER = 2;

/**
 * Cap enforcement. Runs strictly AFTER session ownership is resolved.
 * Fails CLOSED: any error counts as capped — the widget's polite fallback,
 * never an open gate or a broken state.
 */
export async function checkCaps(
  ctx: SessionCtx
): Promise<{ ok: true } | { ok: false; status: 402 | 429 }> {
  try {
    const a = ctx.agent;
    if (a.status === 'paused' || a.tenant_status !== 'active') return { ok: false, status: 402 };
    if (ctx.messages_count >= a.session_cap * SESSION_CAP_BURST_MULTIPLIER) return { ok: false, status: 429 };

    const { rows } = await withTenant(a.tenant_id, (db) =>
      db.query(
        `SELECT COALESCE(SUM(messages), 0)::int AS monthly,
                COALESCE(SUM(messages) FILTER (WHERE day = CURRENT_DATE), 0)::int AS daily
         FROM usage_daily
         WHERE agent_id = $1 AND day >= date_trunc('month', CURRENT_DATE)`,
        [a.id]
      )
    );
    if (rows[0].monthly >= a.monthly_cap) return { ok: false, status: 429 };
    if (rows[0].daily >= a.daily_cap) return { ok: false, status: 429 };
    return { ok: true };
  } catch (err) {
    console.error('cap check failed closed:', err);
    return { ok: false, status: 429 };
  }
}

const INSIGHT_SIMILARITY = 0.85;
// Characters of each retrieved chunk stored as operator-facing telemetry.
const TELEMETRY_EXCERPT_CHARS = 200;
// Insight questions are truncated to the `insights.question` column budget.
const INSIGHT_QUESTION_MAX_CHARS = 500;

export type Citation = { title: string; url?: string };

/** Map generation citation indices back to their sources, deduped by title. */
export function buildCitations(result: GenerationResult, chunks: RetrievedChunk[]): Citation[] {
  const seenTitles = new Set<string>();
  return result.citations
    .map((i) => chunks[i - 1])
    .filter((c): c is RetrievedChunk => Boolean(c))
    .map((c) => ({ title: c.sourceName, ...(c.sourceUrl ? { url: c.sourceUrl } : {}) }))
    .filter((c) => (seenTitles.has(c.title) ? false : (seenTitles.add(c.title), true)));
}

/** Operator-facing retrieval telemetry stored alongside each answer. */
export function buildRetrievalTelemetry(chunks: RetrievedChunk[]) {
  return chunks.map((c) => ({
    src: c.sourceName,
    sim: Number(c.similarity.toFixed(3)),
    excerpt: c.content.slice(0, TELEMETRY_EXCERPT_CHARS),
  }));
}

/** Persist the assistant message, advance the conversation, and meter usage. */
export async function persistAssistantTurn(opts: {
  tenantId: string;
  conversationId: string;
  agent: AgentRow;
  result: GenerationResult;
  citations: Citation[];
  telemetry: ReturnType<typeof buildRetrievalTelemetry>;
}): Promise<string> {
  const { tenantId, conversationId, agent, result, citations, telemetry } = opts;
  return withTenant(tenantId, async (db) => {
    const { rows } = await db.query(
      `INSERT INTO messages (tenant_id, conversation_id, role, content, answer_status,
                             question_type, citations, retrieval, tokens_in, tokens_out)
       VALUES ($1, $2, 'assistant', $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        tenantId,
        conversationId,
        result.answer,
        result.status,
        result.questionType,
        JSON.stringify(citations),
        JSON.stringify(telemetry),
        result.tokensIn,
        result.tokensOut,
      ]
    );
    const newStatus = result.status === 'not_in_kb' ? 'no_answer' : 'answered';
    await db.query(
      `UPDATE conversations
       SET messages_count = messages_count + 2, last_message_at = NOW(),
           status = CASE WHEN status = 'escalated' THEN status ELSE $2 END
       WHERE id = $1`,
      [conversationId, newStatus]
    );
    await db.query(
      `INSERT INTO usage_daily (tenant_id, agent_id, day, messages, tokens_in, tokens_out, cost_usd)
       VALUES ($1, $2, CURRENT_DATE, 1, $3, $4, $5)
       ON CONFLICT (tenant_id, agent_id, day) DO UPDATE
       SET messages = usage_daily.messages + 1,
           tokens_in = usage_daily.tokens_in + EXCLUDED.tokens_in,
           tokens_out = usage_daily.tokens_out + EXCLUDED.tokens_out,
           cost_usd = usage_daily.cost_usd + EXCLUDED.cost_usd`,
      [tenantId, agent.id, result.tokensIn, result.tokensOut, result.costUsd]
    );
    return rows[0].id as string;
  });
}

/**
 * Feed the learning loop (best-effort — never fails the response):
 * unanswered questions become insights; weak-but-answered ones become
 * review-queue items.
 */
export async function recordSignals(opts: {
  tenantId: string;
  agent: AgentRow;
  question: string;
  embedding: number[];
  chunks: RetrievedChunk[];
  result: GenerationResult;
  messageId: string;
}): Promise<void> {
  const { tenantId, agent, question, embedding, chunks, result, messageId } = opts;
  if (result.status === 'not_in_kb') {
    await recordInsight(tenantId, agent.id, question, embedding).catch((err) =>
      console.error('insight error:', err)
    );
  } else if (isWeakRetrieval(chunks)) {
    await withTenant(tenantId, (db) =>
      db.query(`INSERT INTO review_items (tenant_id, type, message_id) VALUES ($1, 'weak', $2)`, [
        tenantId,
        messageId,
      ])
    ).catch((err) => console.error('review item error:', err));
  }
}

async function recordInsight(
  tenantId: string,
  agentId: string,
  question: string,
  embedding: number[]
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  await withTenant(tenantId, async (db) => {
    const { toSql } = await import('pgvector');
    const { rows } = await db.query(
      `SELECT id, 1 - (embedding <=> $1::vector) AS similarity
       FROM insights
       WHERE agent_id = $2 AND month = $3 AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      [toSql(embedding), agentId, month]
    );
    if (rows[0] && rows[0].similarity >= INSIGHT_SIMILARITY) {
      await db.query(
        `UPDATE insights SET count = count + 1, last_asked_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [rows[0].id]
      );
    } else {
      const inserted = await db.query(
        `INSERT INTO insights (tenant_id, agent_id, month, question, embedding)
         VALUES ($1, $2, $3, $4, $5::vector) RETURNING id`,
        [tenantId, agentId, month, question.slice(0, INSIGHT_QUESTION_MAX_CHARS), toSql(embedding)]
      );
      await db.query(
        `INSERT INTO review_items (tenant_id, type, insight_id) VALUES ($1, 'insight', $2)`,
        [tenantId, inserted.rows[0].id]
      );
    }
  });
}
