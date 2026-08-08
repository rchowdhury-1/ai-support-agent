import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { type AuthedRequest } from '../../middleware/auth.js';
import { withSystem } from '../../db/tenant.js';
import { asyncHandler } from '../../lib/http.js';
import { gbp, tokensShort, usdToGbp } from '../../lib/format.js';
import { TENANT_LIST_SQL, type TenantListRow, toTenantDto } from './shared.js';

const router = Router();

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
async function setAgentStatus(req: AuthedRequest, res: Response, status: 'live' | 'paused'): Promise<void> {
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
}

router.post(
  '/tenants/:id/pause',
  asyncHandler((req: AuthedRequest, res: Response) => setAgentStatus(req, res, 'paused'))
);
router.post(
  '/tenants/:id/resume',
  asyncHandler((req: AuthedRequest, res: Response) => setAgentStatus(req, res, 'live'))
);

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

export default router;
