import { test, expect } from '@playwright/test';

test('Visual check of spreadsheet view', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('[data-testid="sidebar"]');

  // Screenshot of empty spreadsheet
  await page.screenshot({
    path: 'test-results/spreadsheet-empty.png',
    fullPage: true,
  });

  // Add a task
  const addTaskInput = page.getByPlaceholder('Add a new task...');
  await addTaskInput.fill('Test Task');
  await page.keyboard.press('Enter');

  // Dismiss the estimate gate modal by clicking a preset
  const estimateButton = page.getByRole('button', { name: '15m' });
  await estimateButton.click();

  // Wait for task detail view
  await page.waitForSelector('.block-input');

  // Screenshot of task detail
  await page.screenshot({
    path: 'test-results/task-detail.png',
    fullPage: true,
  });

  // Go back to spreadsheet
  const backButton = page.getByRole('button', { name: /back/i });
  await backButton.click();

  // Wait for spreadsheet view
  await page.waitForSelector('[data-testid="sidebar"]');

  // Screenshot of spreadsheet with task
  await page.screenshot({
    path: 'test-results/spreadsheet-with-task.png',
    fullPage: true,
  });

  // Verify task is visible in the spreadsheet
  await expect(
    page
      .locator('[data-testid^="task-row-"]')
      .getByRole('button', { name: 'Test Task' })
  ).toBeVisible();
});
