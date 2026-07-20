/**
 * Tenant-context query wrappers. ALL database access goes through one of these —
 * never through pool.query directly. RLS policies key off two transaction-local
 * settings:
 *
 *   app.tenant_id  — set by withTenant(); rows visible only for that tenant
 *   app.role       — 'system' (withSystem) sees everything; used by trusted
 *                    internal code paths: auth lookup, operator routes, the
 *                    public widget path (which scopes by agent explicitly)
 *
 * With neither set, every RLS-protected table returns zero rows. The app
 * connects as a role without BYPASSRLS, so there is no way around this.
 */
import type { PoolClient } from 'pg';
import pool from './pool.js';

async function withContext<T>(
  setting: 'app.tenant_id' | 'app.role',
  value: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // set_config with is_local=true scopes the setting to this transaction.
    await client.query('SELECT set_config($1, $2, true)', [setting, value]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Run queries scoped to one tenant. RLS hides every other tenant's rows. */
export function withTenant<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!tenantId) throw new Error('withTenant requires a tenantId');
  return withContext('app.tenant_id', tenantId, fn);
}

/** Run queries with full visibility. Only for trusted internal code paths. */
export function withSystem<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withContext('app.role', 'system', fn);
}
