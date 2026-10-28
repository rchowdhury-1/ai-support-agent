/**
 * Enquiry (lead) creation and delivery. Split out from chat-support.ts —
 * session/cap/telemetry concerns don't belong in the same file as lead
 * capture and notification fan-out.
 */
import { withTenant } from '../db/tenant.js';
import { type EnquiryIntent, type GenerationResult } from '../services/generation.js';
import { sendEnquiryEmail } from '../services/notify.js';
import { type AgentRow } from './chat-support.js';

export type EnquirySource = 'no_answer' | 'quota_fallback' | 'agent_paused' | 'error' | 'in_conversation';

/**
 * Insert an enquiry and notify the tenant's configured channels immediately
 * (email only today — see services/notify.ts). Used by both the widget's
 * explicit /chat/escalate form and the in-conversation qualification flow,
 * so every enquiry source shares one write path and one notification path.
 */
export async function createEnquiry(opts: {
  tenantId: string;
  agent: AgentRow;
  conversationId: string | null;
  name: string;
  contact: string;
  question: string;
  source: EnquirySource;
  intent?: EnquiryIntent | null;
}): Promise<void> {
  const { tenantId, agent, conversationId, name, contact, question, source, intent } = opts;
  const targets = await withTenant(tenantId, async (db) => {
    await db.query(
      `INSERT INTO enquiries (tenant_id, agent_id, conversation_id, name, contact, question, source, intent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenantId, agent.id, conversationId, name, contact, question, source, intent ?? null]
    );
    const { rows: channels } = await db.query(
      `SELECT target FROM notification_channels WHERE agent_id = $1 AND type = 'email' AND enabled`,
      [agent.id]
    );
    if (channels.length > 0) return channels.map((c) => c.target as string);
    const { rows: tenantRows } = await db.query(`SELECT contact_email FROM tenants WHERE id = $1`, [tenantId]);
    const fallback = tenantRows[0]?.contact_email as string | undefined;
    return fallback ? [fallback] : [];
  });

  await Promise.all(
    targets.map((to) =>
      sendEnquiryEmail(to, { agentName: agent.name, leadName: name, contact, question, intent: intent ?? null }).catch(
        (err) => console.error('notify: enquiry email failed:', err)
      )
    )
  );
}

/** Best-effort — never fails the chat response the lead capture arrived on. */
export async function captureLeadIfPresent(opts: {
  tenantId: string;
  agent: AgentRow;
  conversationId: string;
  result: GenerationResult;
}): Promise<void> {
  const { leadCapture } = opts.result;
  if (!leadCapture) return;
  await createEnquiry({
    tenantId: opts.tenantId,
    agent: opts.agent,
    conversationId: opts.conversationId,
    name: leadCapture.name,
    contact: leadCapture.contact,
    question: leadCapture.summary,
    source: 'in_conversation',
    intent: opts.result.enquiryIntent,
  }).catch((err) => console.error('lead capture error:', err));
}
