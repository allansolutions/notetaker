import { test, expect } from '@playwright/test';
import {
  mockAuthenticated,
  mockTasksApi,
  addTaskViaModal,
  navigateToTaskDetail,
} from './helpers/auth';

test('Visual check of spreadsheet view', async ({ page }) => {
  // Setup auth and API mocks before navigating
  await mockAuthenticated(page);
  await mockTasksApi(page);

  await page.goto('http://localhost:5173');
  await page.waitForSelector('[data-testid="sidebar"]');

  // Screenshot of empty spreadsheet
  await page.screenshot({
    path: 'test-results/spreadsheet-empty.png',
    fullPage: true,
  });

  // Add a task via modal (stays on spreadsheet after creation)
  await addTaskViaModal(page, 'Test Task');

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

  // Navigate to task detail by clicking the task
  await navigateToTaskDetail(page, 'Test Task');

  // Screenshot of task detail
  await page.screenshot({
    path: 'test-results/task-detail.png',
    fullPage: true,
  });
});
