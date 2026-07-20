/**
 * Vitest setup. Loads .env.test (overriding any .env values) so tests can
 * never inherit a dev/prod DATABASE_URL by accident. CI provides DATABASE_URL
 * directly (local pgvector container) and has no .env.test — env wins there.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

const envTest = resolve(__dirname, '../../.env.test');
if (existsSync(envTest)) {
  dotenv.config({ path: envTest, override: true });
}

process.env.NODE_ENV = 'test';

if (!process.env.DATABASE_URL) {
  throw new Error('Tests need DATABASE_URL (from .env.test locally, or CI env).');
}
