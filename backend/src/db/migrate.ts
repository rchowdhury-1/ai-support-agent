/**
 * Migration runner. Applies src/db/migrations/NNN_*.sql in filename order,
 * each in its own transaction, tracked in schema_migrations. Run with:
 *   npm run migrate            (uses DATABASE_URL from .env)
 *   DATABASE_URL=... npm run migrate
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { assertSafeMigrationTarget } from './guard.js';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
assertSafeMigrationTarget(databaseUrl);

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

async function migrate(): Promise<void> {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl:
      databaseUrl!.includes('localhost') || databaseUrl!.includes('127.0.0.1')
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
    console.log('Migrations up to date.');
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
