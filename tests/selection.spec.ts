import { test, expect } from '@playwright/test';

test.describe('Task Spreadsheet View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="sidebar"]');
  });

  test('can add a new task', async ({ page }) => {
    // Add a task using the input
    const addTaskInput = page.getByPlaceholder('Add a new task...');
    await addTaskInput.fill('My new task');
    await page.keyboard.press('Enter');

    // Dismiss the estimate gate modal by clicking a preset
    const estimateButton = page.getByRole('button', { name: '15m' });
    await estimateButton.click();

    // Should navigate to task detail view - wait for the block input
    await page.waitForSelector('.block-input');

    // Should see the task title input
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toHaveValue('My new task');
  });

  test('can navigate back from task detail to spreadsheet', async ({
    page,
  }) => {
    // Add a task
    const addTaskInput = page.getByPlaceholder('Add a new task...');
    await addTaskInput.fill('Test task');
    await page.keyboard.press('Enter');

    // Dismiss the estimate gate modal by clicking a preset
    const estimateButton = page.getByRole('button', { name: '15m' });
    await estimateButton.click();

    // Wait for detail view
    await page.waitForSelector('.block-input');

    // Click back button
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();

    // Should see the spreadsheet view again
    await expect(page.getByPlaceholder('Add a new task...')).toBeVisible();
  });

  test('task persists after page reload', async ({ page }) => {
    // Add a task
    const addTaskInput = page.getByPlaceholder('Add a new task...');
    await addTaskInput.fill('Persistent task');
    await page.keyboard.press('Enter');

    // Dismiss the estimate gate modal by clicking a preset
    const estimateButton = page.getByRole('button', { name: '15m' });
    await estimateButton.click();

    // Wait for navigation and go back
    await page.waitForSelector('.block-input');
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();

    // Wait for localStorage to save (300ms debounce)
    await page.waitForTimeout(400);

    // Reload the page
    await page.reload();
    await page.waitForSelector('[data-testid="sidebar"]');

    // Task should still be there in the spreadsheet
    await expect(
      page
        .locator('[data-testid^="task-row-"]')
        .getByRole('button', { name: 'Persistent task' })
    ).toBeVisible();
  });
});
