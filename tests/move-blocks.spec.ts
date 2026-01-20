import { test, expect } from '@playwright/test';
import { mockAuthenticated, mockTasksApi } from './helpers/auth';

test.describe('Task Detail View', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth and API mocks
    await mockAuthenticated(page);
    await mockTasksApi(page);

    await page.goto('http://localhost:5173');

    // Create a task and navigate to its detail view
    const addTaskInput = page.getByPlaceholder('Add a new task...');
    await addTaskInput.fill('Test Task');
    await page.keyboard.press('Enter');

    // Dismiss the estimate gate modal by clicking a preset
    const estimateButton = page.getByRole('button', { name: '15m' });
    await estimateButton.click();

    // Wait for the task detail view to load
    await page.waitForSelector('.block-input');
  });

  test('can edit task title', async ({ page }) => {
    const titleInput = page.locator('input[type="text"]').first();

    // Clear and type new title
    await titleInput.fill('Updated Task Title');
    await titleInput.blur();

    // Go back to spreadsheet
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();

    // Wait for localStorage debounce
    await page.waitForTimeout(400);

    // Verify title was updated in the spreadsheet (use testid to avoid agenda match)
    await expect(
      page
        .locator('[data-testid^="task-row-"]')
        .getByRole('button', { name: 'Updated Task Title' })
    ).toBeVisible();
  });

  test('can add content blocks', async ({ page }) => {
    // Type in the first block
    const blockInput = page.locator('.block-input').first();
    await blockInput.click();
    await page.keyboard.type('First block content');
    await page.keyboard.press('Enter');

    // Wait for second block to be created and focused
    const blocks = page.locator('.block-input');
    await expect(blocks).toHaveCount(2);
    await page.waitForTimeout(100); // Wait for focus to settle

    // Type in second block (should already be focused)
    await page.keyboard.type('Second block content');

    // Verify content
    await expect(blocks.first()).toHaveText('First block content');
    await expect(blocks.nth(1)).toHaveText('Second block content');
  });

  test('block content persists after reload', async ({ page }) => {
    // Add content
    const blockInput = page.locator('.block-input').first();
    await blockInput.click();
    await page.keyboard.type('Persistent content');

    // Go back and wait for save
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();
    await page.waitForTimeout(400);

    // Click on the task in the spreadsheet to go back to detail view
    const taskTitle = page
      .locator('[data-testid^="task-row-"]')
      .getByRole('button', { name: 'Test Task' });
    await taskTitle.click();

    // Wait for detail view
    await page.waitForSelector('.block-input');

    // Content should be there
    const content = await page.locator('.block-input').first().textContent();
    expect(content).toBe('Persistent content');
  });
});
