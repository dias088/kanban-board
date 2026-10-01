import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // All test files share one database and truncate tables between cases,
    // so they must not run in parallel.
    fileParallelism: false,
    globals: false,
    include: ['src/tests/**/*.test.ts'],
    setupFiles: ['src/tests/setup.ts'],
    testTimeout: 15_000,
  },
});
