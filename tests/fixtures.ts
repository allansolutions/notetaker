import { test as base, expect } from '@playwright/test';
import type { Page, ConsoleMessage } from '@playwright/test';

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
