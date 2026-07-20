/** Runs once before the test suite: migrate the test database to head. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { runMigrations } from '../db/migrate.js';

export default async function setup(): Promise<void> {
  const envTest = resolve(__dirname, '../../.env.test');
  if (existsSync(envTest)) {
    dotenv.config({ path: envTest, override: true });
  }
  const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('Tests need MIGRATE_DATABASE_URL or DATABASE_URL');
  await runMigrations(url);
}
