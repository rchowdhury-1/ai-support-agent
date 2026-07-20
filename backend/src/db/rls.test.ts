/**
 * Tenant isolation suite — the priority tests. Proves RLS is doing the
 * isolation at the database layer, not app-level WHERE clauses:
 * a query that "forgets" tenant filtering must return nothing it shouldn't.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import pool from './pool.js';
import { withSystem, withTenant } from './tenant.js';
import {
  createAgent,
  createConversation,
  createMessage,
  createTenant,
  createUser,
  truncateAll,
} from '../test/factories.js';

let tenantA: { id: string };
let tenantB: { id: string };
let convA: { id: string };
let convB: { id: string };

beforeAll(async () => {
  await truncateAll();
  tenantA = await createTenant({ name: 'Brampton & Hale' });
  tenantB = await createTenant({ name: 'Aldergate Solicitors' });
  const agentA = await createAgent(tenantA.id);
  const agentB = await createAgent(tenantB.id);
  convA = await createConversation(tenantA.id, agentA.id);
  convB = await createConversation(tenantB.id, agentB.id);
  await createMessage(tenantA.id, convA.id, { content: 'Tenant A secret answer' });
  await createMessage(tenantB.id, convB.id, { content: 'Tenant B privileged legal matter' });
  await createUser({ tenantId: tenantA.id, role: 'client' });
  await createUser({ tenantId: tenantB.id, role: 'client' });
});

describe('the app role cannot bypass RLS', () => {
  it('connects as a role without superuser or BYPASSRLS', async () => {
    const { rows } = await pool.query(
      'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user'
    );
    expect(rows[0].rolsuper).toBe(false);
    expect(rows[0].rolbypassrls).toBe(false);
  });
});

describe('no tenant context', () => {
  it.each(['tenants', 'users', 'agents', 'conversations', 'messages'])(
    'an unscoped query against %s returns zero rows even though rows exist',
    async (table) => {
      const viaSystem = await withSystem((db) => db.query(`SELECT count(*)::int AS n FROM ${table}`));
      expect(viaSystem.rows[0].n).toBeGreaterThan(0);
      // The dangerous case: app code that forgot withTenant entirely.
      const bare = await pool.query(`SELECT * FROM ${table}`);
      expect(bare.rows).toHaveLength(0);
    }
  );
});

describe('withTenant', () => {
  it('sees only its own conversations and messages', async () => {
    const conversations = await withTenant(tenantA.id, (db) => db.query('SELECT id FROM conversations'));
    expect(conversations.rows.map((r) => r.id)).toEqual([convA.id]);

    const messages = await withTenant(tenantA.id, (db) => db.query('SELECT content FROM messages'));
    expect(messages.rows).toHaveLength(1);
    expect(messages.rows[0].content).toContain('Tenant A');
  });

  it('cannot read another tenant′s law-firm conversations even by direct id', async () => {
    const { rows } = await withTenant(tenantA.id, (db) =>
      db.query('SELECT * FROM conversations WHERE id = $1', [convB.id])
    );
    expect(rows).toHaveLength(0);
  });

  it('cannot update or delete another tenant′s rows', async () => {
    const upd = await withTenant(tenantA.id, (db) =>
      db.query(`UPDATE conversations SET status = 'escalated' WHERE id = $1`, [convB.id])
    );
    expect(upd.rowCount).toBe(0);
    const del = await withTenant(tenantA.id, (db) =>
      db.query('DELETE FROM messages WHERE tenant_id = $1', [tenantB.id])
    );
    expect(del.rowCount).toBe(0);
  });

  it('cannot insert rows attributed to another tenant', async () => {
    await expect(
      withTenant(tenantA.id, (db) =>
        db.query(
          `INSERT INTO enquiries (tenant_id, agent_id, name, contact, question)
           SELECT $1, a.id, 'Mallory', 'm@evil.io', 'planted'
           FROM agents a WHERE a.tenant_id = $1`,
          [tenantB.id]
        )
      )
    ).resolves.toMatchObject({ rowCount: 0 }); // sub-select sees no B agents from A's context
    await expect(
      withTenant(tenantA.id, (db) =>
        db.query(
          `INSERT INTO conversations (tenant_id, agent_id, session_id)
           VALUES ($1, (SELECT id FROM agents LIMIT 1), 'forged-session')`,
          [tenantB.id]
        )
      )
    ).rejects.toThrow(/row-level security|violates/i);
  });

  it('sees only its own tenant row and users', async () => {
    const tenants = await withTenant(tenantA.id, (db) => db.query('SELECT id FROM tenants'));
    expect(tenants.rows.map((r) => r.id)).toEqual([tenantA.id]);
    const users = await withTenant(tenantA.id, (db) => db.query('SELECT tenant_id FROM users'));
    expect(users.rows.every((r) => r.tenant_id === tenantA.id)).toBe(true);
  });
});

describe('system-only tables', () => {
  it('refresh_tokens are invisible outside system context', async () => {
    const bare = await pool.query('SELECT * FROM refresh_tokens');
    expect(bare.rows).toHaveLength(0);
    const scoped = await withTenant(tenantA.id, (db) => db.query('SELECT * FROM refresh_tokens'));
    expect(scoped.rows).toHaveLength(0);
  });
});
