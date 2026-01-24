import { test as customTest, expect } from './fixtures';
import { test as baseTest } from '@playwright/test';
import {
  mockUnauthenticated,
  mockAuthenticated,
  mockTasksApi,
} from './helpers/auth';

// Use custom test with console error checking for most tests
const test = customTest;

test.describe('Authentication', () => {
  test('shows login page when not authenticated', async ({ page }) => {
    await mockUnauthenticated(page);

    await page.goto('/');

    // Should see login page
    await expect(page.getByText('Notetaker')).toBeVisible();
    await expect(page.getByText('Sign in to continue')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
  });

  // Use base test to avoid console error checking - this test expects 500 when navigating to /auth/google
  baseTest('login button initiates Google OAuth flow', async ({ page }) => {
    await mockUnauthenticated(page);

    await page.goto('/');

    // Wait for button to be enabled
    const loginButton = page.getByRole('button', {
      name: /continue with google/i,
    });
    await baseTest.expect(loginButton).toBeEnabled();

    // Click and wait for navigation to start (will go to Google OAuth or /auth/google)
    const navigationPromise = page.waitForURL(
      (url) =>
        url.toString().includes('/auth/google') ||
        url.toString().includes('accounts.google.com'),
      { timeout: 10000 }
    );

    await loginButton.click();
    await navigationPromise;

    // Verify we navigated to Google OAuth (either our endpoint or Google directly)
    const currentUrl = page.url();
    baseTest
      .expect(
        currentUrl.includes('/auth/google') ||
          currentUrl.includes('accounts.google.com')
      )
      .toBe(true);
  });

  test('shows error message from URL params', async ({ page }) => {
    await mockUnauthenticated(page);

    await page.goto('/?auth_error=access_denied');

    // Should see login page
    await expect(page.getByText('Sign in to continue')).toBeVisible();

    // Should see error message - look for text containing the error
    // The error is displayed in a red box with the error text
    const errorElement = page.locator('text=access_denied');
    await expect(errorElement).toBeVisible({ timeout: 5000 });
  });

  test('shows app content when authenticated', async ({ page }) => {
    await mockAuthenticated(page);
    await mockTasksApi(page);

    await page.goto('/');

    // Should see the main app, not login page
    await expect(page.getByText('Sign in to continue')).not.toBeVisible();
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });
});
