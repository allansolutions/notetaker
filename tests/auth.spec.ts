import { test as customTest, expect } from './fixtures';
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

  test('login button initiates Google OAuth flow', async ({ page }) => {
    await mockUnauthenticated(page);

    // Intercept the /auth/google navigation to avoid needing a real backend
    let authUrl = '';
    await page.route('**/auth/google', async (route) => {
      authUrl = route.request().url();
      await route.fulfill({ status: 200, body: 'redirecting' });
    });

    await page.goto('/');

    const loginButton = page.getByRole('button', {
      name: /continue with google/i,
    });
    await expect(loginButton).toBeEnabled();

    await loginButton.click();

    // Wait for the intercepted navigation
    await page.waitForURL((url) => url.toString().includes('/auth/google'), {
      timeout: 5000,
    });

    expect(authUrl).toContain('/auth/google');
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
