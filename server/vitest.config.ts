import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: {
        // Global floor — route handlers are 0% (tested via E2E), so this stays low.
        // Prevents coverage from eroding further as new code is added.
        lines: 3,
        branches: 1,
        functions: 5,
        statements: 3,
        // Business logic services — the tested layer of the backend
        'src/services/**': {
          lines: 10,
          branches: 5,
          functions: 10,
          statements: 10,
        },
      },
    },
  },
});
