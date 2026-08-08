/**
 * Shared helpers for the operator API sub-routers. System context throughout
 * (the operator sees every tenant). Display strings match web/lib/operator-types.ts.
 */
import { withSystem } from '../../db/tenant.js';
import { gbp, relTime, thousands, usdToGbp } from '../../lib/format.js';

export const MODEL_LABEL = { haiku: 'Haiku', sonnet: 'Sonnet' } as const;

export interface TenantListRow {
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

export const TENANT_LIST_SQL = `
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

export function toTenantDto(t: TenantListRow) {
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

/** The tenant's single agent (first created), or null if none exists yet. */
export async function tenantAgent(
  tenantId: string
): Promise<{ tenantId: string; agentId: string } | null> {
  const { rows } = await withSystem((db) =>
    db.query(`SELECT id FROM agents WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`, [tenantId])
  );
  return rows[0] ? { tenantId, agentId: rows[0].id } : null;
}
