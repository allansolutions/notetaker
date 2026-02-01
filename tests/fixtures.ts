import { test as base, expect } from '@playwright/test';
import type { Page, ConsoleMessage } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const COVERAGE_DIR = path.resolve(process.cwd(), '.nyc_output');

// Extend the base test to automatically fail on console errors
export const test = base.extend<{ consoleErrors: ConsoleMessage[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: ConsoleMessage[] = [];

      const handler = (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
          errors.push(msg);
        }
      };

      page.on('console', handler);

      // Provide the errors array to the test (for inspection if needed)
      await use(errors);

      // Collect browser coverage if running in coverage mode
      if (process.env.COVERAGE) {
        const coverage = await page.evaluate(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (window as Record<string, any>).__coverage__;
        });
        if (coverage) {
          fs.mkdirSync(COVERAGE_DIR, { recursive: true });
          const id = crypto.randomBytes(8).toString('hex');
          fs.writeFileSync(
            path.join(COVERAGE_DIR, `playwright-${id}.json`),
            JSON.stringify(coverage)
          );
        }
      }

      // After test completes, fail if any console errors occurred
      if (errors.length > 0) {
        const errorMessages = errors.map((e) => e.text()).join('\n  - ');
        throw new Error(
          `Test failed due to ${errors.length} console error(s):\n  - ${errorMessages}`
        );
      }
    },
    { auto: true }, // Automatically use this fixture in every test
  ],
});

export { expect };

// Re-export types that tests might need
export type { Page, ConsoleMessage };
