import { afterEach, describe, expect, it } from 'vitest';
import { assertSafeBootTarget, assertSafeMigrationTarget } from './guard.js';

const V1_PROD = 'postgresql://u:p@ep-empty-base-abjllfpt-pooler.eu-west-2.aws.neon.tech/neondb';
const DEV = 'postgresql://u:p@ep-royal-salad-abvgnac0.eu-west-2.aws.neon.tech/supportai_v2';
const V2_PROD = 'postgresql://u:p@ep-v2-prod-host.eu-west-2.aws.neon.tech/supportai_v2';

afterEach(() => {
  delete process.env.PROD_DB_HOSTS;
  delete process.env.MIGRATE_PROD;
});

describe('assertSafeBootTarget', () => {
  it('always refuses the v1 production database, even with NODE_ENV=production', () => {
    expect(() => assertSafeBootTarget(V1_PROD, 'development')).toThrow(/v1 production/);
    expect(() => assertSafeBootTarget(V1_PROD, 'production')).toThrow(/v1 production/);
  });

  it('allows dev branches outside production', () => {
    expect(() => assertSafeBootTarget(DEV, 'development')).not.toThrow();
    expect(() => assertSafeBootTarget(DEV, 'test')).not.toThrow();
    expect(() => assertSafeBootTarget(DEV, undefined)).not.toThrow();
  });

  it('refuses a PROD_DB_HOSTS host unless NODE_ENV=production', () => {
    process.env.PROD_DB_HOSTS = 'ep-v2-prod-host';
    expect(() => assertSafeBootTarget(V2_PROD, 'development')).toThrow(/production database/);
    expect(() => assertSafeBootTarget(V2_PROD, undefined)).toThrow(/production database/);
    expect(() => assertSafeBootTarget(V2_PROD, 'production')).not.toThrow();
  });

  it('rejects malformed URLs', () => {
    expect(() => assertSafeBootTarget('not a url', 'development')).toThrow(/not a valid URL/);
  });
});

describe('assertSafeMigrationTarget', () => {
  it('never migrates the v1 production database', () => {
    process.env.MIGRATE_PROD = '1';
    expect(() => assertSafeMigrationTarget(V1_PROD)).toThrow(/never run/);
  });

  it('migrates dev/test freely, prod only with MIGRATE_PROD=1', () => {
    expect(() => assertSafeMigrationTarget(DEV)).not.toThrow();
    process.env.PROD_DB_HOSTS = 'ep-v2-prod-host';
    expect(() => assertSafeMigrationTarget(V2_PROD)).toThrow(/MIGRATE_PROD=1/);
    process.env.MIGRATE_PROD = '1';
    expect(() => assertSafeMigrationTarget(V2_PROD)).not.toThrow();
  });
});
