import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('shows login page when not authenticated', async ({ page }) => {
    // Mock unauthenticated state
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null }),
      });
    });

    await page.goto('/');

    // Should see login page
    await expect(page.getByText('Notetaker')).toBeVisible();
    await expect(page.getByText('Sign in to continue')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible();
  });

  test('login button initiates Google OAuth flow', async ({ page }) => {
    // Mock unauthenticated state
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null }),
      });
    });

    await page.goto('/');

    // Wait for button to be enabled
    const loginButton = page.getByRole('button', {
      name: /continue with google/i,
    });
    await expect(loginButton).toBeEnabled();

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
    expect(
      currentUrl.includes('/auth/google') ||
        currentUrl.includes('accounts.google.com')
    ).toBe(true);
  });

  test('shows error message from URL params', async ({ page }) => {
    // Mock unauthenticated state
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null }),
      });
    });

    await page.goto('/?auth_error=access_denied');

    // Should see login page
    await expect(page.getByText('Sign in to continue')).toBeVisible();

    // Should see error message - look for text containing the error
    // The error is displayed in a red box with the error text
    const errorElement = page.locator('text=access_denied');
    await expect(errorElement).toBeVisible({ timeout: 5000 });
  });

  test('shows app content when authenticated', async ({ page }) => {
    // Mock authenticated state
    await page.route('**/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-1',
            email: 'test@example.com',
            name: 'Test User',
          },
          settings: null,
        }),
      });
    });

    // Mock empty tasks
    await page.route('**/api/tasks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Should see the main app, not login page
    await expect(page.getByText('Sign in to continue')).not.toBeVisible();
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });
});
