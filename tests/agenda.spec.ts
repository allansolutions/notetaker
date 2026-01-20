import { test, expect } from '@playwright/test';
import { mockAuthenticated, mockTasksApi } from './helpers/auth';

test.describe('Agenda', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth and API mocks
    await mockAuthenticated(page);
    await mockTasksApi(page);

    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="agenda"]');
  });

  test('agenda section is visible in sidebar', async ({ page }) => {
    const agenda = page.getByTestId('agenda');
    await expect(agenda).toBeVisible();
    await expect(page.getByText('Schedule')).toBeVisible();
  });

  test('displays hour markers', async ({ page }) => {
    await expect(page.getByText('6:00 AM')).toBeVisible();
    await expect(page.getByText('12:00 PM')).toBeVisible();
    await expect(page.getByText('10:00 PM')).toBeVisible();
  });
});
