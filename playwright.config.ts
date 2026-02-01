import { defineConfig } from '@playwright/test';

const isCoverage = !!process.env.COVERAGE;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: isCoverage ? 'http://localhost:5174' : 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  ...(isCoverage && {
    webServer: {
      command: 'VITE_COVERAGE=true bunx vite --port 5174',
      port: 5174,
      reuseExistingServer: false,
    },
  }),
});
