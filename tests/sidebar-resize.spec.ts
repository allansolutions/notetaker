import { test, expect } from './fixtures';
import { mockAuthenticated, mockTasksApi } from './helpers/auth';

test.describe('Sidebar Resize', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth and API mocks
    await mockAuthenticated(page);
    await mockTasksApi(page);

    await page.goto('http://localhost:5173');

    // Clear localStorage for sidebar width after page loads
    await page.evaluate(() =>
      localStorage.removeItem('notetaker-sidebar-width')
    );

    await page.waitForSelector('[data-testid="sidebar"]');
  });

  test('resize handle has correct cursor style', async ({ page }) => {
    const handle = page.getByTestId('sidebar-resize-handle');
    await expect(handle).toBeVisible();

    const cursor = await handle.evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor).toBe('col-resize');
  });

  test('sidebar starts at default width', async ({ page }) => {
    const sidebar = page.getByTestId('sidebar');
    const boundingBox = await sidebar.boundingBox();

    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBe(240); // DEFAULT_SIDEBAR_WIDTH
  });
});
