/**
 * Operator API (/api/admin/*) — dense, one user: the operator. System context
 * throughout (the operator sees every tenant). Shapes match
 * web/lib/operator-types.ts, display strings included.
 */
import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { z } from 'zod';
import { requireOperator, type AuthedRequest } from '../middleware/auth.js';
import { withSystem, withTenant } from '../db/tenant.js';
import { asyncHandler } from '../lib/http.js';
import { crawlSite } from '../services/crawler.js';
import {
  createSource,
  pdfToText,
  processSource,
  refreshSource,
  checkDrift,
} from '../services/ingestion.js';
import { embedQuery } from '../services/embeddings.js';
import { retrieveChunks } from '../services/retrieval.js';
import { generateAnswer } from '../services/generation.js';
import { bytesShort, dayMonth, gbp, relTime, thousands, tokensShort, usdToGbp } from '../lib/format.js';

const router = Router();
router.use(requireOperator);

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — PDF source uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

const MODEL_LABEL = { haiku: 'Haiku', sonnet: 'Sonnet' } as const;

// ── Tenants ──────────────────────────────────────────────────────────────

interface TenantListRow {
  id: string;
  name: string;
  domain: string;
  status: string;
  onboarding_step: number | null;
  agent_id: string | null;
  agent_name: string | null;
  system_prompt: string | null;
  disclaimer: string | null;
  color: string | null;
  model: 'haiku' | 'sonnet' | null;
  agent_status: string | null;
  monthly_cap: number | null;
  daily_cap: number | null;
  session_cap: number | null;
  allowed_origins: string[] | null;
  welcome_message: string | null;
  suggested_questions: string[] | null;
  used: number;
  cost_usd: number;
  last_activity: string | null;
  flags: number;
  insights: number;
}

const TENANT_LIST_SQL = `
  SELECT t.id, t.name, t.domain, t.status, t.onboarding_step,
         a.id AS agent_id, a.name AS agent_name, a.system_prompt, a.disclaimer,
         a.color, a.model, a.status AS agent_status,
         a.monthly_cap, a.daily_cap, a.session_cap, a.allowed_origins,
         a.welcome_message, a.suggested_questions,
         COALESCE(u.msgs, 0)::int AS used,
         COALESCE(u.cost, 0)::float AS cost_usd,
         act.last_activity,
         COALESCE(r.flags, 0)::int AS flags,
         COALESCE(r.insights, 0)::int AS insights
  FROM tenants t
  LEFT JOIN LATERAL (
    SELECT * FROM agents WHERE tenant_id = t.id ORDER BY created_at ASC LIMIT 1
  ) a ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(messages) AS msgs, SUM(cost_usd) AS cost
    FROM usage_daily WHERE tenant_id = t.id AND day >= date_trunc('month', CURRENT_DATE)
  ) u ON TRUE
  LEFT JOIN LATERAL (
    SELECT MAX(last_message_at) AS last_activity FROM conversations WHERE tenant_id = t.id
  ) act ON TRUE
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE type IN ('flag','down','weak')) AS flags,
           count(*) FILTER (WHERE type = 'insight') AS insights
    FROM review_items WHERE tenant_id = t.id AND status = 'open'
  ) r ON TRUE
`;

function toTenantDto(t: TenantListRow) {
  return {
    id: t.id,
    name: t.name,
    domain: t.domain,
    status: t.status,
    model: t.model ? MODEL_LABEL[t.model] : 'Haiku',
    used: t.used,
    cap: t.monthly_cap ?? 0,
    cost: gbp(usdToGbp(t.cost_usd)),
    last: t.last_activity ? relTime(t.last_activity) : '—',
    flags: t.flags,
    insights: t.insights,
    agentId: t.agent_id,
    agentName: t.agent_name ?? '',
    agentStatus: t.agent_status ?? 'live',
    systemPrompt: t.system_prompt ?? '',
    disclaimer: t.disclaimer ?? '',
    accent: t.color ?? '#2D5A44',
    welcomeMessage: t.welcome_message ?? '',
    suggestedQuestions: t.suggested_questions ?? [],
    allowedOrigins: t.allowed_origins ?? [],
    caps: {
      monthly: thousands(t.monthly_cap ?? 0),
      daily: thousands(t.daily_cap ?? 0),
      session: thousands(t.session_cap ?? 0),
    },
    ...(t.onboarding_step != null ? { onboardingStep: t.onboarding_step } : {}),
  };
}

router.get(
  '/tenants',
  asyncHandler(async (_req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) => db.query(`${TENANT_LIST_SQL} ORDER BY t.created_at ASC`));
    res.json(rows.map((r) => toTenantDto(r as TenantListRow)));
  })
);

router.get(
  '/tenants/:id',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const detail = await withSystem(async (db) => {
      const { rows } = await db.query(`${TENANT_LIST_SQL} WHERE t.id = $1`, [req.params.id]);
      if (!rows[0]) return null;
      const bars = await db.query(
        `SELECT d::date AS day, COALESCE(SUM(u.messages), 0)::int AS n
         FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day') d
         LEFT JOIN usage_daily u ON u.day = d::date AND u.tenant_id = $1
         GROUP BY d ORDER BY d`,
        [req.params.id]
      );
      const usage = await db.query(
        `SELECT COALESCE(SUM(tokens_in + tokens_out), 0)::bigint AS tokens
         FROM usage_daily WHERE tenant_id = $1 AND day >= date_trunc('month', CURRENT_DATE)`,
        [req.params.id]
      );
      const answers = await db.query(
        `SELECT count(*) FILTER (WHERE answer_status IN ('answered','partial'))::int AS good,
                count(*) FILTER (WHERE answer_status IS NOT NULL)::int AS total
         FROM messages WHERE tenant_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [req.params.id]
      );
      const amounts = await db.query(
        `SELECT monthly_amount_pence, setup_fee_pence FROM tenants WHERE id = $1`,
        [req.params.id]
      );
      return { row: rows[0], bars: bars.rows, usage: usage.rows[0], answers: answers.rows[0], amounts: amounts.rows[0] };
    });
    if (!detail) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    const barMax = Math.max(...detail.bars.map((b: { n: number }) => b.n), 1);
    const t = detail.row as TenantListRow;
    const convCount = await withSystem((db) =>
      db.query(
        `SELECT count(*)::int AS n FROM conversations
         WHERE tenant_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [req.params.id]
      )
    );
    const conversations = convCount.rows[0].n as number;
    res.json({
      ...toTenantDto(t),
      bars: detail.bars.map((b: { n: number }) => Math.round((b.n / barMax) * 100)),
      tokens: tokensShort(Number(detail.usage.tokens)),
      answerRate:
        detail.answers.total > 0
          ? `${Math.round((detail.answers.good / detail.answers.total) * 100)}%`
          : '—',
      avgCostPerConv: conversations > 0 ? gbp(usdToGbp(t.cost_usd) / conversations) : '—',
      monthlyAmountPence: detail.amounts.monthly_amount_pence,
      setupFeePence: detail.amounts.setup_fee_pence,
    });
  })
);

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().max(255).default(''),
  contactName: z.string().max(255).default(''),
  contactEmail: z.string().max(255).default(''),
});

router.post(
  '/tenants',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = createTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Tenant name is required' });
      return;
    }
    const p = parsed.data;
    const result = await withSystem(async (db) => {
      const t = await db.query(
        `INSERT INTO tenants (name, domain, status, contact_name, contact_email, onboarding_step)
         VALUES ($1, $2, 'pending', $3, $4, 2) RETURNING id`,
        [p.name, p.domain, p.contactName, p.contactEmail]
      );
      const a = await db.query(
        `INSERT INTO agents (tenant_id, name, system_prompt)
         VALUES ($1, $2, $3) RETURNING id`,
        [
          t.rows[0].id,
          `${p.name} assistant`,
          `You are the website assistant for ${p.name}. Answer only from the provided context. If the context doesn't contain the answer, say so plainly and offer to take the visitor's details. Keep answers under 80 words, plain British English.`,
        ]
      );
      return { tenantId: t.rows[0].id, agentId: a.rows[0].id };
    });
    res.status(201).json(result);
  })
);

const agentUpdateSchema = z.object({
  agentName: z.string().min(1).max(255).optional(),
  systemPrompt: z.string().max(20000).optional(),
  welcomeMessage: z.string().max(2000).optional(),
  disclaimer: z.string().max(1000).optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  model: z.enum(['haiku', 'sonnet']).optional(),
  suggestedQuestions: z.array(z.string().max(300)).max(4).optional(),
  allowedOrigins: z.array(z.string().max(255)).max(20).optional(),
  poweredBy: z.boolean().optional(),
  monthlyCap: z.number().int().min(0).optional(),
  dailyCap: z.number().int().min(0).optional(),
  sessionCap: z.number().int().min(0).optional(),
  onboardingStep: z.number().int().min(1).max(6).nullable().optional(),
});

router.put(
  '/tenants/:id/agent',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = agentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid payload' });
      return;
    }
    const p = parsed.data;
    const ok = await withSystem(async (db) => {
      const { rows } = await db.query(
        `SELECT id FROM agents WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`,
        [req.params.id]
      );
      if (!rows[0]) return false;
      await db.query(
        `UPDATE agents SET
           name = COALESCE($2, name),
           system_prompt = COALESCE($3, system_prompt),
           welcome_message = COALESCE($4, welcome_message),
           disclaimer = COALESCE($5, disclaimer),
           color = COALESCE($6, color),
           theme = COALESCE($7, theme),
           model = COALESCE($8, model),
           suggested_questions = COALESCE($9, suggested_questions),
           allowed_origins = COALESCE($10, allowed_origins),
           powered_by = COALESCE($11, powered_by),
           monthly_cap = COALESCE($12, monthly_cap),
           daily_cap = COALESCE($13, daily_cap),
           session_cap = COALESCE($14, session_cap),
           updated_at = NOW()
         WHERE id = $1`,
        [
          rows[0].id,
          p.agentName ?? null,
          p.systemPrompt ?? null,
          p.welcomeMessage ?? null,
          p.disclaimer ?? null,
          p.accent ?? null,
          p.theme ?? null,
          p.model ?? null,
          p.suggestedQuestions ? JSON.stringify(p.suggestedQuestions) : null,
          p.allowedOrigins ?? null,
          p.poweredBy ?? null,
          p.monthlyCap ?? null,
          p.dailyCap ?? null,
          p.sessionCap ?? null,
        ]
      );
      if (p.onboardingStep !== undefined) {
        await db.query(`UPDATE tenants SET onboarding_step = $2, updated_at = NOW() WHERE id = $1`, [
          req.params.id,
          p.onboardingStep,
        ]);
      }
      return true;
    });
    if (!ok) {
      res.status(404).json({ error: 'Tenant has no agent' });
      return;
    }
    res.json({ ok: true });
  })
);

/** The kill switch: paused flips every widget for the tenant to contact-form mode. */
router.post('/tenants/:id/pause', (req, res) => setAgentStatus(req, res, 'paused'));
router.post('/tenants/:id/resume', (req, res) => setAgentStatus(req, res, 'live'));

async function setAgentStatus(req: AuthedRequest, res: Response, status: 'live' | 'paused'): Promise<void> {
  try {
    const result = await withSystem((db) =>
      db.query(`UPDATE agents SET status = $2, updated_at = NOW() WHERE tenant_id = $1`, [
        req.params.id,
        status,
      ])
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Tenant has no agent' });
      return;
    }
    res.json({ ok: true, status });
  } catch (err) {
    console.error('pause error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const clientUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(10).max(200),
});

/** Provision the client's dashboard login — no self-serve registration exists. */
router.post(
  '/tenants/:id/client-user',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = clientUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'name, email and a 10+ char password are required' });
      return;
    }
    const hash = await bcrypt.hash(parsed.data.password, 12);
    const { rows } = await withSystem((db) =>
      db.query(
        `INSERT INTO users (tenant_id, role, name, email, password_hash)
         VALUES ($1, 'client', $2, $3, $4)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [req.params.id, parsed.data.name, parsed.data.email.toLowerCase(), hash]
      )
    );
    if (!rows[0]) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    res.status(201).json({ id: rows[0].id });
  })
);

// ── Ingestion: crawl, sources ────────────────────────────────────────────

const crawlSchema = z.object({ url: z.string().url() });

router.post('/tenants/:id/crawl', async (req: AuthedRequest, res: Response) => {
  const parsed = crawlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A valid url is required' });
    return;
  }
  try {
    const pages = await crawlSite(parsed.data.url);
    res.json(
      pages.map((p) => ({
        id: p.url,
        title: p.title,
        path: p.path,
        chunks: `~${Math.max(1, Math.ceil(p.text.length / 2000))} chunks`,
        status: 'queued',
      }))
    );
  } catch (err) {
    console.error('crawl error:', err);
    res.status(400).json({ error: 'Could not crawl that URL' });
  }
});

async function tenantAgent(tenantId: string): Promise<{ tenantId: string; agentId: string } | null> {
  const { rows } = await withSystem((db) =>
    db.query(`SELECT id FROM agents WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`, [tenantId])
  );
  return rows[0] ? { tenantId, agentId: rows[0].id } : null;
}

const sourcesSchema = z.union([
  z.object({ kind: z.literal('site'), urls: z.array(z.string().url()).min(1).max(50) }),
  z.object({ kind: z.literal('text'), name: z.string().min(1).max(255), text: z.string().min(1) }),
]);

router.post(
  '/tenants/:id/sources',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = sourcesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid source payload' });
      return;
    }
    const ta = await tenantAgent(req.params.id!);
    if (!ta) {
      res.status(404).json({ error: 'Tenant has no agent' });
      return;
    }
    const p = parsed.data;
    // Processed synchronously: on serverless, work started after the response
    // is killed with the invocation. Sources that fail land in `error` state.
    if (p.kind === 'text') {
      const sourceId = await createSource({ ...ta, kind: 'text', name: p.name });
      await processSource(sourceId, p.text).catch((err) => console.error('ingest error:', err));
      res.status(202).json({ sourceIds: [sourceId] });
      return;
    }
    const ids: string[] = [];
    for (const url of p.urls.slice(0, 20)) {
      const u = new URL(url);
      const name = u.pathname === '/' || u.pathname === '' ? u.hostname : u.pathname;
      const sourceId = await createSource({ ...ta, kind: 'site', name, url });
      ids.push(sourceId);
      await refreshSource(sourceId).catch((err) => console.error('ingest error:', err));
    }
    res.status(202).json({ sourceIds: ids });
  })
);

router.post(
  '/tenants/:id/sources/pdf',
  upload.single('file'),
  async (req: AuthedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'A PDF file is required' });
        return;
      }
      const ta = await tenantAgent(req.params.id!);
      if (!ta) {
        res.status(404).json({ error: 'Tenant has no agent' });
        return;
      }
      let text: string;
      try {
        text = await pdfToText(req.file.buffer);
      } catch (err) {
        res.status(422).json({ error: (err as Error).message });
        return;
      }
      const sourceId = await createSource({ ...ta, kind: 'pdf', name: req.file.originalname });
      await processSource(sourceId, text).catch((err) => console.error('ingest error:', err));
      res.status(202).json({ sourceIds: [sourceId] });
    } catch (err) {
      console.error('pdf error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

const SOURCE_TYPE_LABEL = { site: 'Web page', pdf: 'PDF', text: 'Text' } as const;

router.get(
  '/tenants/:id/sources',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT s.id, s.kind, s.name, s.status, s.size_bytes, s.last_synced_at, s.error_message,
                (SELECT count(*)::int FROM chunks c WHERE c.source_id = s.id) AS chunk_count
         FROM sources s WHERE s.tenant_id = $1 ORDER BY s.created_at ASC`,
        [req.params.id]
      )
    );
    res.json(
      rows.map((s) => ({
        id: s.id,
        icon: s.kind,
        name: s.name,
        type: SOURCE_TYPE_LABEL[s.kind as keyof typeof SOURCE_TYPE_LABEL],
        size:
          s.status === 'processing'
            ? 'processing…'
            : s.status === 'error'
              ? (s.error_message ?? 'error')
              : `${s.chunk_count} chunks · ${bytesShort(s.size_bytes)}`,
        status: s.status,
        synced: s.last_synced_at ? relTime(s.last_synced_at) : '—',
      }))
    );
  })
);

router.post(
  '/sources/:id/refresh',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    await refreshSource(req.params.id!).catch((err) => console.error('refresh error:', err));
    res.status(202).json({ ok: true });
  })
);

router.post(
  '/tenants/:id/check-drift',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT id, url, content_hash FROM sources WHERE tenant_id = $1 AND kind = 'site' AND status = 'synced'`,
        [req.params.id]
      )
    );
    const results = await Promise.all(rows.map((s) => checkDrift(s)));
    res.json({ drifted: results.filter(Boolean).length });
  })
);

router.delete(
  '/sources/:id',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const result = await withSystem((db) => db.query(`DELETE FROM sources WHERE id = $1`, [req.params.id]));
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    res.json({ ok: true });
  })
);

// ── Sandbox test chat ────────────────────────────────────────────────────

const sandboxSchema = z.object({ question: z.string().min(1).max(2000) });

router.post('/tenants/:id/sandbox', async (req: AuthedRequest, res: Response) => {
  const parsed = sandboxSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A question is required' });
    return;
  }
  try {
    const { rows } = await withSystem((db) =>
      db.query(`SELECT * FROM agents WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`, [
        req.params.id,
      ])
    );
    const agent = rows[0];
    if (!agent) {
      res.status(404).json({ error: 'Tenant has no agent' });
      return;
    }
    const started = Date.now();
    const embedding = await embedQuery(parsed.data.question);
    const chunks = await withTenant(agent.tenant_id, (db) =>
      retrieveChunks(db, agent.id, embedding)
    );
    const result = await generateAnswer({
      model: agent.model,
      agent,
      chunks,
      history: [],
      question: parsed.data.question,
    });
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    const citedTitles = [
      ...new Set(result.citations.map((i) => chunks[i - 1]?.sourceName).filter(Boolean)),
    ];
    res.json({
      text: result.answer,
      srcLine: citedTitles.length ? `From: ${citedTitles.join(' · ')}` : 'No source — not in knowledge base',
      chunks: chunks.map((c) => ({
        src: c.sourceName,
        sim: Number(c.similarity.toFixed(2)),
        excerpt: c.content.slice(0, 160),
      })),
      meta: `${MODEL_LABEL[agent.model as 'haiku' | 'sonnet']} · ${secs}s · ${gbp(usdToGbp(result.costUsd))} · ${result.status}`,
    });
  } catch (err) {
    console.error('sandbox error:', err);
    res.status(502).json({ error: 'Sandbox generation failed' });
  }
});

// ── Insights triage ──────────────────────────────────────────────────────

router.get(
  '/tenants/:id/insights',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT id, question, count, status, last_asked_at FROM insights
         WHERE tenant_id = $1 AND status IN ('new','fixing')
         ORDER BY count DESC, last_asked_at DESC`,
        [req.params.id]
      )
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        question: r.question,
        count: r.count,
        meta: `asked ${r.count} time${r.count === 1 ? '' : 's'} · last ${dayMonth(r.last_asked_at)}`,
      }))
    );
  })
);

const triageSchema = z.object({ action: z.enum(['reviewed', 'added', 'dismissed']) });
/** What the operator sets here is exactly what the client sees. */
const TRIAGE_TO_STATUS = { reviewed: 'fixing', added: 'added', dismissed: 'not_relevant' } as const;

router.post(
  '/insights/:id/triage',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = triageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }
    const status = TRIAGE_TO_STATUS[parsed.data.action];
    const result = await withSystem(async (db) => {
      const r = await db.query(
        `UPDATE insights SET status = $2, updated_at = NOW() WHERE id = $1`,
        [req.params.id, status]
      );
      await db.query(
        `UPDATE review_items SET status = 'resolved', resolved_at = NOW()
         WHERE insight_id = $1 AND status = 'open'`,
        [req.params.id]
      );
      return r;
    });
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Insight not found' });
      return;
    }
    res.json({ ok: true, status });
  })
);

// ── Conversations (operator view) ────────────────────────────────────────

router.get(
  '/tenants/:id/conversations',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT c.id, c.status, c.last_message_at,
                (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user'
                 ORDER BY m.created_at ASC LIMIT 1) AS question,
                (SELECT retrieval FROM messages m WHERE m.conversation_id = c.id AND m.role = 'assistant'
                 ORDER BY m.created_at DESC LIMIT 1) AS retrieval
         FROM conversations c
         WHERE c.tenant_id = $1 AND c.messages_count > 0
         ORDER BY c.last_message_at DESC LIMIT 100`,
        [req.params.id]
      )
    );
    res.json(
      rows.map((c) => {
        const retrieval = (c.retrieval ?? []) as { sim: number }[];
        const top = retrieval[0]?.sim;
        return {
          question: c.question ?? '',
          time: relTime(c.last_message_at),
          status: c.status === 'escalated' ? 'escalated' : 'answered',
          telemetry:
            retrieval.length > 0
              ? `${retrieval.length} chunks · top ${top?.toFixed(2)}`
              : 'no retrieval',
        };
      })
    );
  })
);

// ── Review queue (cross-tenant) ──────────────────────────────────────────

router.get(
  '/review',
  asyncHandler(async (_req: AuthedRequest, res: Response) => {
    const { rows } = await withSystem((db) =>
      db.query(
        `SELECT r.id, r.type, r.created_at, t.name AS tenant,
                m.content AS answer, m.citations, m.retrieval, m.conversation_id,
                i.question AS insight_question, i.count AS insight_count,
                (SELECT content FROM messages um
                 WHERE um.conversation_id = m.conversation_id AND um.role = 'user'
                   AND um.created_at < m.created_at
                 ORDER BY um.created_at DESC LIMIT 1) AS question
         FROM review_items r
         JOIN tenants t ON t.id = r.tenant_id
         LEFT JOIN messages m ON m.id = r.message_id
         LEFT JOIN insights i ON i.id = r.insight_id
         WHERE r.status = 'open'
         ORDER BY r.created_at DESC LIMIT 100`
      )
    );
    res.json(
      rows.map((r) => {
        const citations = (r.citations ?? []) as { title: string }[];
        return {
          id: r.id,
          type: r.type,
          tenant: r.tenant,
          question: r.question ?? r.insight_question ?? '',
          time: relTime(r.created_at),
          context:
            r.type === 'insight'
              ? `Asked ${r.insight_count} time${r.insight_count === 1 ? '' : 's'} — no answer in the knowledge base`
              : (r.question ?? ''),
          answer: r.answer ?? '(no answer given — question was unanswerable)',
          cite: citations.length ? `From: ${citations.map((c) => c.title).join(' · ')}` : '—',
          chunks: ((r.retrieval ?? []) as { src: string; sim: number; excerpt?: string }[]).map(
            (c) => ({ src: c.src, sim: c.sim, excerpt: c.excerpt })
          ),
        };
      })
    );
  })
);

const resolveSchema = z.object({ resolution: z.enum(['resolved', 'content_fix', 'dismissed']) });

router.post(
  '/review/:id/resolve',
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid resolution' });
      return;
    }
    const result = await withSystem((db) =>
      db.query(
        `UPDATE review_items SET status = $2, resolved_at = NOW() WHERE id = $1 AND status = 'open'`,
        [req.params.id, parsed.data.resolution]
      )
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Review item not found or already resolved' });
      return;
    }
    res.json({ ok: true });
  })
);

// ── Usage ────────────────────────────────────────────────────────────────

router.get(
  '/usage',
  asyncHandler(async (_req: AuthedRequest, res: Response) => {
    const data = await withSystem(async (db) => {
      const rows = await db.query(
        `SELECT t.name, a.monthly_cap,
                COALESCE(SUM(u.messages), 0)::int AS msgs,
                COALESCE(SUM(u.tokens_in + u.tokens_out), 0)::bigint AS tokens,
                COALESCE(SUM(u.cost_usd), 0)::float AS cost_usd
         FROM tenants t
         LEFT JOIN LATERAL (SELECT * FROM agents WHERE tenant_id = t.id ORDER BY created_at ASC LIMIT 1) a ON TRUE
         LEFT JOIN usage_daily u ON u.tenant_id = t.id AND u.day >= date_trunc('month', CURRENT_DATE)
         GROUP BY t.id, t.name, a.monthly_cap
         ORDER BY cost_usd DESC`
      );
      const bars = await db.query(
        `SELECT d::date AS day, COALESCE(SUM(u.messages), 0)::int AS n
         FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, '1 day') d
         LEFT JOIN usage_daily u ON u.day = d::date
         GROUP BY d ORDER BY d`
      );
      return { rows: rows.rows, bars: bars.rows };
    });
    res.json({
      rows: data.rows.map((r) => {
        const cap = r.monthly_cap ?? 0;
        const pct = cap > 0 ? r.msgs / cap : 0;
        return {
          name: r.name,
          msgs: r.msgs,
          cap,
          tokens: tokensShort(Number(r.tokens)),
          cost: Number(usdToGbp(r.cost_usd).toFixed(2)),
          alert: pct >= 1 ? 'At cap' : pct >= 0.8 ? `${Math.round(pct * 100)}% of cap` : '',
        };
      }),
      bars: data.bars.map((b: { n: number }) => b.n),
    });
  })
);

export default router;
