import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    globalSetup: ['src/test/globalSetup.ts'],
    // DB-backed suites share one database; run files serially to avoid
    // cross-file truncation races. Tests within a file still run in order.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
