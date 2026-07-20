/** Test data factories. All writes go through withSystem (trusted context). */
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { withSystem } from '../db/tenant.js';

export const TEST_PASSWORD = 'correct-horse-battery';
let passwordHash: string | null = null;

async function testHash(): Promise<string> {
  passwordHash ??= await bcrypt.hash(TEST_PASSWORD, 4);
  return passwordHash;
}

export async function truncateAll(): Promise<void> {
  // DELETE, not TRUNCATE: the app role deliberately lacks TRUNCATE (it would
  // bypass RLS). Deleting tenants cascades to all tenant-scoped tables.
  await withSystem(async (db) => {
    await db.query('DELETE FROM tenants');
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM webhook_events');
  });
}

export async function createTenant(over: Record<string, unknown> = {}): Promise<{ id: string; name: string; status: string }> {
  const name = (over.name as string) ?? `Tenant ${randomUUID().slice(0, 8)}`;
  const { rows } = await withSystem((db) =>
    db.query(
      `INSERT INTO tenants (name, domain, status, contact_name, contact_email, monthly_amount_pence)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, status`,
      [
        name,
        (over.domain as string) ?? 'example.co.uk',
        (over.status as string) ?? 'active',
        (over.contact_name as string) ?? 'Test Contact',
        (over.contact_email as string) ?? `${randomUUID().slice(0, 8)}@example.co.uk`,
        (over.monthly_amount_pence as number) ?? 9900,
      ]
    )
  );
  return rows[0];
}

export async function createUser(
  over: { tenantId?: string | null; role?: 'operator' | 'client'; email?: string; name?: string } = {}
): Promise<{ id: string; email: string }> {
  const email = over.email ?? `${randomUUID().slice(0, 8)}@test.co.uk`;
  const { rows } = await withSystem(async (db) =>
    db.query(
      `INSERT INTO users (tenant_id, role, name, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email`,
      [over.tenantId ?? null, over.role ?? 'client', over.name ?? 'Test User', email, await testHash()]
    )
  );
  return rows[0];
}

export async function createAgent(
  tenantId: string,
  over: Record<string, unknown> = {}
): Promise<{ id: string }> {
  const { rows } = await withSystem((db) =>
    db.query(
      `INSERT INTO agents (tenant_id, name, system_prompt, welcome_message, status, allowed_origins,
                           monthly_cap, daily_cap, session_cap, suggested_questions, disclaimer, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        tenantId,
        (over.name as string) ?? 'Test Agent',
        (over.system_prompt as string) ?? 'You are a helpful assistant for a test business.',
        (over.welcome_message as string) ?? 'Hello!',
        (over.status as string) ?? 'live',
        (over.allowed_origins as string[]) ?? [],
        (over.monthly_cap as number) ?? 1000,
        (over.daily_cap as number) ?? 200,
        (over.session_cap as number) ?? 40,
        JSON.stringify(over.suggested_questions ?? []),
        (over.disclaimer as string) ?? '',
        (over.model as string) ?? 'haiku',
      ]
    )
  );
  return rows[0];
}

export async function createConversation(
  tenantId: string,
  agentId: string,
  over: Record<string, unknown> = {}
): Promise<{ id: string; session_id: string }> {
  const { rows } = await withSystem((db) =>
    db.query(
      `INSERT INTO conversations (tenant_id, agent_id, session_id, visitor_name, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, session_id`,
      [
        tenantId,
        agentId,
        (over.session_id as string) ?? randomUUID(),
        (over.visitor_name as string) ?? null,
        (over.status as string) ?? 'answered',
      ]
    )
  );
  return rows[0];
}

export async function createMessage(
  tenantId: string,
  conversationId: string,
  over: Record<string, unknown> = {}
): Promise<{ id: string }> {
  const { rows } = await withSystem((db) =>
    db.query(
      `INSERT INTO messages (tenant_id, conversation_id, role, content, answer_status, citations)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        tenantId,
        conversationId,
        (over.role as string) ?? 'assistant',
        (over.content as string) ?? 'Test answer.',
        (over.answer_status as string) ?? null,
        over.citations ? JSON.stringify(over.citations) : null,
      ]
    )
  );
  return rows[0];
}
