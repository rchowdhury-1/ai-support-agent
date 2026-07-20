/**
 * Vercel build: transpile-only (type-checking runs in CI). tsc's dual-package
 * type resolution differs between local macOS and Vercel's environment for
 * helmet/express-rate-limit; esbuild sidesteps it.
 */
import { build } from 'esbuild';
import { cpSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const entryPoints = readdirSync('src', { recursive: true })
  .map(String)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.startsWith('test/'))
  .map((f) => join('src', f));

await build({
  entryPoints,
  outdir: 'dist',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'error',
});

cpSync('src/db/migrations', 'dist/db/migrations', { recursive: true });
console.log(`built ${entryPoints.length} files`);
