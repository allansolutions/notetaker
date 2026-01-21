import { test, expect } from './fixtures';
import {
  mockAuthenticated,
  mockTasksApi,
  addTaskViaModal,
  navigateToTaskDetail,
} from './helpers/auth';

test.describe('Task Spreadsheet View', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth and API mocks
    await mockAuthenticated(page);
    await mockTasksApi(page);

    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="sidebar"]');
  });

  test('can add a new task', async ({ page }) => {
    // Add a task using the modal (stays on spreadsheet after creation)
    await addTaskViaModal(page, 'My new task');

    // Task should be visible in the spreadsheet
    await expect(
      page
        .locator('[data-testid^="task-row-"]')
        .getByRole('button', { name: 'My new task' })
    ).toBeVisible();
  });

  test('can navigate back from task detail to spreadsheet', async ({
    page,
  }) => {
    // Add a task (stays on spreadsheet after creation)
    await addTaskViaModal(page, 'Test task');

    // Navigate to task detail by clicking the task
    await navigateToTaskDetail(page, 'Test task');

    // Click back button
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();

    // Should see the spreadsheet view again - look for add task button
    await expect(page.getByRole('button', { name: 'Add task' })).toBeVisible();
  });

  test('task persists after page reload', async ({ page }) => {
    // Add a task (stays on spreadsheet after creation)
    await addTaskViaModal(page, 'Persistent task');

    // Wait for API to save (small delay to ensure mock updates)
    await page.waitForTimeout(200);

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
