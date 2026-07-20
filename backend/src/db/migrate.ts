/**
 * Migration runner. Applies src/db/migrations/NNN_*.sql in filename order,
 * each in its own transaction, tracked in schema_migrations. Run with:
 *   npm run migrate            (uses MIGRATE_DATABASE_URL / DATABASE_URL from .env)
 *
 * Migrations run as the table owner; the app runs as APP_DB_ROLE (no BYPASSRLS —
 * Neon's default owner role has BYPASSRLS, which would make RLS a silent no-op),
 * so after migrating we (re-)grant table access to the app role.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { assertSafeMigrationTarget } from './guard.js';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function runMigrations(databaseUrl: string): Promise<void> {
  assertSafeMigrationTarget(databaseUrl);

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
        ? undefined
        : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      console.log(`Applying ${file}...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }

    const appRole = process.env.APP_DB_ROLE;
    if (appRole) {
      await client.query(`GRANT USAGE ON SCHEMA public TO ${pg.escapeIdentifier(appRole)}`);
      await client.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${pg.escapeIdentifier(appRole)}`
      );
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${pg.escapeIdentifier(appRole)}`
      );
    }

    console.log('Migrations up to date.');
  } finally {
    await client.end();
  }
}

const isCliEntry =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isCliEntry) {
  dotenv.config();
  const databaseUrl = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('MIGRATE_DATABASE_URL / DATABASE_URL is not set');
    process.exit(1);
  }
  runMigrations(databaseUrl).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
