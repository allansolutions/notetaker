import { test, expect } from './fixtures';
import { mockAuthenticated, mockTasksApi } from './helpers/auth';

test.describe('Archive View', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
  });

  test('archive button is visible in spreadsheet view', async ({ page }) => {
    await mockTasksApi(page);
    await page.goto('/');
    await page
      .waitForSelector('[data-testid^="task-row-"]', {
        state: 'attached',
        timeout: 5000,
      })
      .catch(() => {});

    await expect(page.getByRole('button', { name: /archive/i })).toBeVisible();
  });

  test('clicking archive button navigates to archive view', async ({
    page,
  }) => {
    await mockTasksApi(page);
    await page.goto('/');
    await page
      .waitForSelector('[data-testid^="task-row-"]', {
        state: 'attached',
        timeout: 5000,
      })
      .catch(() => {});

    await page.getByRole('button', { name: /archive/i }).click();

    // Archive view should show header with "Archive" title
    await expect(page.getByRole('heading', { name: 'Archive' })).toBeVisible();
    // Back button should be visible
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
  });

  test('archive view shows empty state when no done tasks', async ({
    page,
  }) => {
    await mockTasksApi(page, [
      { id: 'task-1', title: 'Active Task', status: 'todo' },
    ]);
    await page.goto('/');
    await page.waitForSelector('[data-testid^="task-row-"]');

    await page.getByRole('button', { name: /archive/i }).click();

    await expect(page.getByText('No archived tasks.')).toBeVisible();
  });

  test('done tasks appear in archive view', async ({ page }) => {
    await mockTasksApi(page, [
      { id: 'task-1', title: 'Active Task', status: 'todo' },
      { id: 'task-2', title: 'Done Task', status: 'done' },
    ]);
    await page.goto('/');
    await page.waitForSelector('[data-testid^="task-row-"]');

    await page.getByRole('button', { name: /archive/i }).click();

    // Done task should be visible
    await expect(page.getByRole('button', { name: 'Done Task' })).toBeVisible();
    // Active task should not be in archive
    await expect(
      page.getByRole('button', { name: 'Active Task' })
    ).not.toBeVisible();
  });

  test('done tasks do not appear in spreadsheet view', async ({ page }) => {
    await mockTasksApi(page, [
      { id: 'task-1', title: 'Active Task', status: 'todo' },
      { id: 'task-2', title: 'Done Task', status: 'done' },
    ]);
    await page.goto('/');
    await page.waitForSelector('[data-testid^="task-row-"]');

    // Active task should be visible
    await expect(
      page.getByRole('button', { name: 'Active Task' })
    ).toBeVisible();
    // Done task should not be in spreadsheet
    await expect(
      page.getByRole('button', { name: 'Done Task' })
    ).not.toBeVisible();
  });

  test('back button returns to spreadsheet view', async ({ page }) => {
    await mockTasksApi(page, [
      { id: 'task-1', title: 'Active Task', status: 'todo' },
    ]);
    await page.goto('/');
    await page.waitForSelector('[data-testid^="task-row-"]');

    // Navigate to archive
    await page.getByRole('button', { name: /archive/i }).click();
    await expect(page.getByRole('heading', { name: 'Archive' })).toBeVisible();

    // Click back
    await page.getByRole('button', { name: /back/i }).click();

    // Should be back in spreadsheet - Task Details button visible
    await expect(
      page.getByRole('button', { name: /task details/i })
    ).toBeVisible();
    // Active task visible again
    await expect(
      page.getByRole('button', { name: 'Active Task' })
    ).toBeVisible();
  });

  test('changing task status to done moves it from spreadsheet to archive', async ({
    page,
  }) => {
    await mockTasksApi(page, [
      { id: 'task-1', title: 'My Task', status: 'todo' },
    ]);
    await page.goto('/');
    await page.waitForSelector('[data-testid^="task-row-"]');

    // Task visible in spreadsheet
    await expect(page.getByRole('button', { name: 'My Task' })).toBeVisible();

    // Change status to done - select with "To-do" value visible
    const taskRow = page.locator('[data-testid="task-row-task-1"]');
    const statusSelect = taskRow
      .getByRole('combobox')
      .filter({ hasText: 'To-do' });
    await statusSelect.selectOption('done');

    // Task should disappear from spreadsheet
    await expect(
      page.getByRole('button', { name: 'My Task' })
    ).not.toBeVisible();

    // Navigate to archive
    await page.getByRole('button', { name: /archive/i }).click();

    // Task should appear in archive
    await expect(page.getByRole('button', { name: 'My Task' })).toBeVisible();
  });

  test('changing task status from done moves it from archive to spreadsheet', async ({
    page,
  }) => {
    await mockTasksApi(page, [
      { id: 'task-1', title: 'Archived Task', status: 'done' },
    ]);
    await page.goto('/');

    // Navigate to archive
    await page.getByRole('button', { name: /archive/i }).click();
    await expect(
      page.getByRole('button', { name: 'Archived Task' })
    ).toBeVisible();

    // Change status to todo - select with "Done" value visible
    const taskRow = page.locator('[data-testid="task-row-task-1"]');
    const statusSelect = taskRow
      .getByRole('combobox')
      .filter({ hasText: 'Done' });
    await statusSelect.selectOption('todo');

    // Task should disappear from archive
    await expect(
      page.getByRole('button', { name: 'Archived Task' })
    ).not.toBeVisible();

    // Navigate back to spreadsheet
    await page.getByRole('button', { name: /back/i }).click();

    // Task should appear in spreadsheet
    await expect(
      page.getByRole('button', { name: 'Archived Task' })
    ).toBeVisible();
  });

  test('can click on archived task to view details', async ({ page }) => {
    await mockTasksApi(page, [
      { id: 'task-1', title: 'Done Task', status: 'done' },
    ]);
    await page.goto('/');

    // Navigate to archive
    await page.getByRole('button', { name: /archive/i }).click();

    // Click on task
    await page.getByRole('button', { name: 'Done Task' }).click();

    // Should show task detail view - textarea with task title as value
    await expect(
      page.locator('textarea[placeholder="Task title"]')
    ).toHaveValue('Done Task');
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
  });

  test('archive view has date filter menu', async ({ page }) => {
    await mockTasksApi(page, [
      { id: 'task-1', title: 'Done Task', status: 'done' },
    ]);
    await page.goto('/');

    // Navigate to archive
    await page.getByRole('button', { name: /archive/i }).click();

    // Date filter menu button should be visible
    const dateFilterButton = page.getByRole('button', { name: /date: all/i });
    await expect(dateFilterButton).toBeVisible();

    // Click to open the menu and verify preset options
    await dateFilterButton.click();

    // Verify preset label text appears in the popover
    await expect(page.getByText('Today')).toBeVisible();
    await expect(page.getByText('Tomorrow')).toBeVisible();
    await expect(page.getByText('This Week')).toBeVisible();
  });
});
