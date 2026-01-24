import { test, expect } from './fixtures';
import { mockAuthenticated, mockTasksApi } from './helpers/auth';

test.describe('Keyboard Row Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockTasksApi(page, [
      { id: 'task-1', title: 'First Task' },
      { id: 'task-2', title: 'Second Task' },
      { id: 'task-3', title: 'Third Task' },
    ]);
  });

  test('pressing down arrow activates first row when none selected', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    // Click on body to ensure no input is focused
    await page.click('body');

    // Press down arrow
    await page.keyboard.press('ArrowDown');

    // First row should have active indicator (ring)
    const firstRow = page.locator('[data-testid="task-row-task-1"]');
    await expect(firstRow).toHaveClass(/ring-2/);
  });

  test('pressing up arrow activates last row when none selected', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');
    await page.keyboard.press('ArrowUp');

    // Last row should have active indicator
    const lastRow = page.locator('[data-testid="task-row-task-3"]');
    await expect(lastRow).toHaveClass(/ring-2/);
  });

  test('down arrow moves through rows', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate first row
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="task-row-task-1"]')).toHaveClass(
      /ring-2/
    );

    // Move to second row
    await page.keyboard.press('ArrowDown');
    await expect(
      page.locator('[data-testid="task-row-task-1"]')
    ).not.toHaveClass(/ring-2/);
    await expect(page.locator('[data-testid="task-row-task-2"]')).toHaveClass(
      /ring-2/
    );
  });

  test('up arrow moves through rows', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate last row
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('[data-testid="task-row-task-3"]')).toHaveClass(
      /ring-2/
    );

    // Move to second row
    await page.keyboard.press('ArrowUp');
    await expect(
      page.locator('[data-testid="task-row-task-3"]')
    ).not.toHaveClass(/ring-2/);
    await expect(page.locator('[data-testid="task-row-task-2"]')).toHaveClass(
      /ring-2/
    );
  });

  test('pressing up on first row deactivates selection', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate first row
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="task-row-task-1"]')).toHaveClass(
      /ring-2/
    );

    // Press up - should deactivate
    await page.keyboard.press('ArrowUp');
    await expect(
      page.locator('[data-testid="task-row-task-1"]')
    ).not.toHaveClass(/ring-2/);
  });

  test('pressing down on last row deactivates selection', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate last row
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('[data-testid="task-row-task-3"]')).toHaveClass(
      /ring-2/
    );

    // Press down - should deactivate
    await page.keyboard.press('ArrowDown');
    await expect(
      page.locator('[data-testid="task-row-task-3"]')
    ).not.toHaveClass(/ring-2/);
  });

  test('pressing Enter on active row navigates to task', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate second row
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="task-row-task-2"]')).toHaveClass(
      /ring-2/
    );

    // Press Enter - should navigate to task
    await page.keyboard.press('Enter');

    // Should be on task detail view
    await page.waitForSelector('.block-input');
    await expect(page).toHaveURL(/\/task\/task-2$/);
  });

  test('pressing Escape deactivates the active row', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate second row
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="task-row-task-2"]')).toHaveClass(
      /ring-2/
    );

    // Press Escape - should deactivate
    await page.keyboard.press('Escape');
    await expect(
      page.locator('[data-testid="task-row-task-2"]')
    ).not.toHaveClass(/ring-2/);

    // Down arrow should now activate first row again
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="task-row-task-1"]')).toHaveClass(
      /ring-2/
    );
  });

  test('keyboard navigation does not trigger when input is focused', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    // Click on a task to navigate to detail view (which has inputs)
    await page.getByRole('button', { name: 'First Task' }).click();
    await page.waitForSelector('.block-input');

    // Click on a block input
    await page.locator('.block-input').first().click();

    // Press down arrow - should not activate row navigation
    await page.keyboard.press('ArrowDown');

    // Should still be on task detail (not navigated away)
    await expect(page.locator('.block-input')).toBeVisible();
  });
});
