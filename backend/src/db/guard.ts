/**
 * Database target guard — prevents local dev/test from ever touching production.
 *
 * The v1 production endpoint is hard-refused by v2 code entirely (its schema is
 * frozen; v2 never reads or writes it). Any host listed in PROD_DB_HOSTS is
 * treated as v2 production: usable only when NODE_ENV=production, and by the
 * migration runner only with an explicit MIGRATE_PROD=1.
 */

/** v1 production Neon endpoint (both direct and pooled hostnames match on this). */
const V1_PROD_MARKER = 'ep-empty-base-abjllfpt';

function hostOf(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
}

function prodHosts(): string[] {
  return (process.env.PROD_DB_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
}

export function isV1Prod(databaseUrl: string): boolean {
  return hostOf(databaseUrl).includes(V1_PROD_MARKER);
}

export function isV2Prod(databaseUrl: string): boolean {
  const host = hostOf(databaseUrl);
  return prodHosts().some((p) => host.includes(p));
}

/** Called at boot, before the pool is created. Throws on unsafe targets. */
export function assertSafeBootTarget(databaseUrl: string, nodeEnv: string | undefined): void {
  if (isV1Prod(databaseUrl)) {
    throw new Error(
      'Refusing to start: DATABASE_URL points at the v1 production database ' +
        `(${V1_PROD_MARKER}). v2 never connects to it — use the v2-dev/v2-test branch.`
    );
  }
  if (nodeEnv !== 'production' && isV2Prod(databaseUrl)) {
    throw new Error(
      'Refusing to start: DATABASE_URL points at a production database but ' +
        `NODE_ENV is "${nodeEnv ?? 'unset'}". Point local dev at the v2-dev branch.`
    );
  }
}

/** Called by the migration runner. Stricter: prod migration needs MIGRATE_PROD=1. */
export function assertSafeMigrationTarget(databaseUrl: string): void {
  if (isV1Prod(databaseUrl)) {
    throw new Error(
      `Refusing to migrate: this is the v1 production database (${V1_PROD_MARKER}). ` +
        'v2 migrations must never run against it.'
    );
  }
  if (isV2Prod(databaseUrl) && process.env.MIGRATE_PROD !== '1') {
    throw new Error(
      'Refusing to migrate a production database without MIGRATE_PROD=1.'
    );
  }
}
