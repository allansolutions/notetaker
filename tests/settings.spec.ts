import { test, expect } from './fixtures';
import { test as baseTest } from '@playwright/test';
import {
  mockAuthenticated,
  mockUnauthenticated,
  mockTasksApi,
} from './helpers/auth';

test.describe('Settings Menu', () => {
  test('settings menu opens and shows options', async ({ page }) => {
    await mockAuthenticated(page);
    await mockTasksApi(page);

    await page.goto('/');

    // Wait for app to load
    await expect(page.getByTestId('sidebar')).toBeVisible();

    // Click settings button
    await page.getByRole('button', { name: 'Settings' }).click();

    // Should show user email and menu options
    await expect(page.getByText('test@example.com')).toBeVisible();
    await expect(page.getByText('Export Data')).toBeVisible();
    await expect(page.getByText('Logout')).toBeVisible();
  });

  test('export downloads JSON file', async ({ page }) => {
    await mockAuthenticated(page);
    await mockTasksApi(page);

    // Mock export API
    await page.route('**/api/export', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exportedAt: Date.now(),
          version: '1.0',
          tasks: [{ id: 'task-1', title: 'Test Task' }],
          wikiPages: [],
          crm: { contacts: [], companies: [] },
          entityLinks: [],
        }),
      });
    });

    await page.goto('/');

    // Wait for app to load
    await expect(page.getByTestId('sidebar')).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click settings button
    await page.getByRole('button', { name: 'Settings' }).click();

    // Click export
    await page.getByText('Export Data').click();

    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/notetaker-export-.*\.json/);
  });

  // Use base test because logout causes navigation that may trigger console errors from unmocked endpoints
  baseTest('logout redirects to login page', async ({ page }) => {
    await mockAuthenticated(page);
    await mockTasksApi(page);

    // Mock logout endpoint
    await page.route('**/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/');

    // Wait for app to load
    await baseTest.expect(page.getByTestId('sidebar')).toBeVisible();

    // Click settings button
    await page.getByRole('button', { name: 'Settings' }).click();

    // Click logout
    await page.getByText('Logout').click();

    // Mock the auth check that happens after logout to return unauthenticated
    await mockUnauthenticated(page);

    // Should show login page
    await baseTest
      .expect(page.getByText('Sign in to continue'))
      .toBeVisible({ timeout: 5000 });
  });

  test('settings menu closes when clicking outside', async ({ page }) => {
    await mockAuthenticated(page);
    await mockTasksApi(page);

    await page.goto('/');

    // Wait for app to load
    await expect(page.getByTestId('sidebar')).toBeVisible();

    // Open settings menu
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Export Data')).toBeVisible();

    // Click outside the popover (on the main content area)
    await page.getByTestId('sidebar').click({ position: { x: 10, y: 200 } });

    // Menu should close
    await expect(page.getByText('Export Data')).not.toBeVisible();
  });
});
