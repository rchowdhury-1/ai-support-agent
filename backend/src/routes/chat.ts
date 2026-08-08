/**
 * Public widget API — the exact contract the deployed v2 widget speaks
 * (see vault doc "08 - v2 API Contract"). Origin-bound per agent via
 * agents.allowed_origins; no CORS wildcard. Caps and billing-state checks
 * fail closed into 402/429, which the widget renders as the polite
 * contact-form fallback — never a broken state. Ownership/authz resolution
 * always precedes any quota lookup.
 */
import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { withSystem, withTenant } from '../db/tenant.js';
import { asyncHandler } from '../lib/http.js';
import { embedQuery } from '../services/embeddings.js';
import { generateAnswer, type GenerationResult } from '../services/generation.js';
import { isWeakRetrieval, retrieveChunks, type RetrievedChunk } from '../services/retrieval.js';

const router = Router();

interface AgentRow {
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

async function loadAgent(agentId: string): Promise<AgentRow | null> {
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
function assertOrigin(req: Request, res: Response, agent: AgentRow): boolean {
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

/**
 * Preflight: echo the requesting origin so the browser proceeds to the real
 * request, where the per-agent allowlist is enforced (the agent id lives in
 * the body, which preflights don't carry). Preflight itself exposes no data.
 */
router.options(/.*/, (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

// ── GET /chat/config ─────────────────────────────────────────────────────

router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const agent = await loadAgent(String(req.query.agentId ?? ''));
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (!assertOrigin(req, res, agent)) return;

    const paused = agent.status === 'paused' || agent.tenant_status !== 'active';
    res.json({
      agentName: agent.name,
      color: agent.color,
      theme: agent.theme,
      welcomeMessage: agent.welcome_message,
      suggestedQuestions: agent.suggested_questions,
      disclaimer: agent.disclaimer,
      poweredBy: agent.powered_by,
      status: paused ? 'paused' : 'live',
    });
  })
);

// ── POST /chat/start ─────────────────────────────────────────────────────

const startSchema = z.object({ agentId: z.string().uuid() });

router.post(
  '/start',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'agentId is required' });
      return;
    }
    const agent = await loadAgent(parsed.data.agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (!assertOrigin(req, res, agent)) return;

    const sessionId = randomUUID();
    const { rows } = await withTenant(agent.tenant_id, (db) =>
      db.query(
        `INSERT INTO conversations (tenant_id, agent_id, session_id) VALUES ($1, $2, $3) RETURNING id`,
        [agent.tenant_id, agent.id, sessionId]
      )
    );
    res.json({
      sessionId,
      conversationId: rows[0].id,
      welcomeMessage: agent.welcome_message,
      agentName: agent.name,
      color: agent.color,
    });
  })
);

// ── GET /chat/:sessionId/history ─────────────────────────────────────────

router.get(
  '/:sessionId/history',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const conv = await resolveSession(req.params.sessionId!);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    if (!assertOrigin(req, res, conv.agent)) return;

    const { rows } = await withTenant(conv.agent.tenant_id, (db) =>
      db.query(
        `SELECT id, role, content, citations, answer_status
         FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [conv.id]
      )
    );
    res.json({
      messages: rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations ?? undefined,
        answer_status: m.answer_status ?? undefined,
      })),
    });
  })
);

// ── POST /chat/message ───────────────────────────────────────────────────

interface SessionCtx {
  id: string;
  messages_count: number;
  agent: AgentRow;
}

async function resolveSession(sessionId: string): Promise<SessionCtx | null> {
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
async function checkCaps(ctx: SessionCtx): Promise<{ ok: true } | { ok: false; status: 402 | 429 }> {
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

const messageSchema = z.object({
  sessionId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

const INSIGHT_SIMILARITY = 0.85;
// Characters of each retrieved chunk stored as operator-facing telemetry.
const TELEMETRY_EXCERPT_CHARS = 200;
// Insight questions are truncated to the `insights.question` column budget.
const INSIGHT_QUESTION_MAX_CHARS = 500;

type Citation = { title: string; url?: string };

/** Map generation citation indices back to their sources, deduped by title. */
function buildCitations(result: GenerationResult, chunks: RetrievedChunk[]): Citation[] {
  const seenTitles = new Set<string>();
  return result.citations
    .map((i) => chunks[i - 1])
    .filter((c): c is RetrievedChunk => Boolean(c))
    .map((c) => ({ title: c.sourceName, ...(c.sourceUrl ? { url: c.sourceUrl } : {}) }))
    .filter((c) => (seenTitles.has(c.title) ? false : (seenTitles.add(c.title), true)));
}

/** Operator-facing retrieval telemetry stored alongside each answer. */
function buildRetrievalTelemetry(chunks: RetrievedChunk[]) {
  return chunks.map((c) => ({
    src: c.sourceName,
    sim: Number(c.similarity.toFixed(3)),
    excerpt: c.content.slice(0, TELEMETRY_EXCERPT_CHARS),
  }));
}

/** Persist the assistant message, advance the conversation, and meter usage. */
async function persistAssistantTurn(opts: {
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
async function recordSignals(opts: {
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

router.post('/message', async (req: Request, res: Response): Promise<void> => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'sessionId and content are required' });
    return;
  }
  const { sessionId, content } = parsed.data;
  const wantsSse = (req.headers.accept ?? '').includes('text/event-stream');

  try {
    // 1. Authz: resolve the session to its conversation/agent/tenant. This
    //    MUST come before any quota work — a quota check first would leak
    //    tenant state to holders of invalid sessions.
    const ctx = await resolveSession(sessionId);
    if (!ctx) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    if (!assertOrigin(req, res, ctx.agent)) return;

    // 2. Quota — fails closed.
    const caps = await checkCaps(ctx);
    if (!caps.ok) {
      res.status(caps.status).json({ error: 'Message limit reached' });
      return;
    }

    const agent = ctx.agent;
    const tenantId = agent.tenant_id;

    const history = await withTenant(tenantId, async (db) => {
      const { rows } = await db.query(
        `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 30`,
        [ctx.id]
      );
      await db.query(
        `INSERT INTO messages (tenant_id, conversation_id, role, content) VALUES ($1, $2, 'user', $3)`,
        [tenantId, ctx.id, content]
      );
      return rows as { role: 'user' | 'assistant'; content: string }[];
    });

    const queryEmbedding = await embedQuery(content);
    const chunks = await withTenant(tenantId, (db) => retrieveChunks(db, agent.id, queryEmbedding));

    let sse: ((event: string, data: unknown) => void) | null = null;
    if (wantsSse) {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      sse = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
    }

    let result: GenerationResult;
    try {
      result = await generateAnswer({
        model: agent.model,
        agent,
        chunks,
        history,
        question: content,
        onDelta: sse ? (text) => sse!('delta', { text }) : undefined,
      });
    } catch (err) {
      console.error('generation error:', err);
      if (sse) {
        sse('error', { message: 'generation failed' });
        res.end();
      } else {
        res.status(502).json({ error: 'Failed to generate a response' });
      }
      return;
    }

    const dedupedCitations = buildCitations(result, chunks);
    const messageId = await persistAssistantTurn({
      tenantId,
      conversationId: ctx.id,
      agent,
      result,
      citations: dedupedCitations,
      telemetry: buildRetrievalTelemetry(chunks),
    });
    await recordSignals({
      tenantId,
      agent,
      question: content,
      embedding: queryEmbedding,
      chunks,
      result,
      messageId,
    });

    const meta = {
      messageId,
      answerStatus: result.status,
      citations: dedupedCitations,
    };
    if (sse) {
      sse('done', meta);
      res.end();
    } else {
      // v1-compat JSON shape (old widget.js sends no Accept header).
      res.json({ response: result.answer, agentName: agent.name, ...meta });
    }
  } catch (err) {
    console.error('message error:', err);
    if (res.headersSent) {
      res.write(`event: error\ndata: {}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

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

// ── POST /chat/feedback ──────────────────────────────────────────────────

const feedbackSchema = z.object({
  messageId: z.string().uuid(),
  rating: z.enum(['up', 'down']),
});

router.post(
  '/feedback',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'messageId and rating are required' });
      return;
    }
    const { messageId, rating } = parsed.data;
    await withSystem(async (db) => {
      const { rows } = await db.query(
        `UPDATE messages SET feedback = $2 WHERE id = $1 AND role = 'assistant' RETURNING tenant_id`,
        [messageId, rating]
      );
      if (rows[0] && rating === 'down') {
        await db.query(
          `INSERT INTO review_items (tenant_id, type, message_id) VALUES ($1, 'down', $2)`,
          [rows[0].tenant_id, messageId]
        );
      }
    });
    res.json({ ok: true });
  })
);

// ── POST /chat/escalate ──────────────────────────────────────────────────

const escalateSchema = z.object({
  agentId: z.string().uuid(),
  sessionId: z.string().optional(),
  name: z.string().min(1).max(255),
  contact: z.string().min(1).max(255),
  message: z.string().min(1).max(4000),
  source: z.enum(['no_answer', 'quota_fallback', 'agent_paused', 'error']),
});

/** Plain DB write — designed to keep working when the LLM is down. */
router.post(
  '/escalate',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = escalateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid escalation payload' });
      return;
    }
    const p = parsed.data;
    const agent = await loadAgent(p.agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (!assertOrigin(req, res, agent)) return;

    await withTenant(agent.tenant_id, async (db) => {
      let conversationId: string | null = null;
      if (p.sessionId) {
        const { rows } = await db.query(
          `SELECT id FROM conversations WHERE session_id = $1 AND agent_id = $2`,
          [p.sessionId, agent.id]
        );
        conversationId = rows[0]?.id ?? null;
        if (conversationId) {
          await db.query(`UPDATE conversations SET status = 'escalated', visitor_name = $2 WHERE id = $1`, [
            conversationId,
            p.name,
          ]);
        }
      }
      await db.query(
        `INSERT INTO enquiries (tenant_id, agent_id, conversation_id, name, contact, question, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [agent.tenant_id, agent.id, conversationId, p.name, p.contact, p.message, p.source]
      );
    });
    res.json({ ok: true });
  })
);

export default router;
