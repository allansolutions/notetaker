import { test, expect } from './fixtures';
import { mockAuthenticated, mockTasksApi } from './helpers/auth';

test.describe('Keyboard Row Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockTasksApi(page, [
      { id: 'task-1', title: 'First Task', estimate: 30 },
      { id: 'task-2', title: 'Second Task', estimate: 60 },
      { id: 'task-3', title: 'Third Task', estimate: 45 },
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

  test('Shift+Down moves the active row down', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate first row
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="task-row-task-1"]')).toHaveClass(
      /ring-2/
    );

    // Get the initial order of rows
    const rowsBefore = await page.locator('tbody tr').allTextContents();
    expect(rowsBefore[0]).toContain('First Task');
    expect(rowsBefore[1]).toContain('Second Task');

    // Press Shift+Down to move the row down
    await page.keyboard.press('Shift+ArrowDown');

    // The row should have moved down - check the new order
    const rowsAfter = await page.locator('tbody tr').allTextContents();
    expect(rowsAfter[0]).toContain('Second Task');
    expect(rowsAfter[1]).toContain('First Task');

    // Active row should still be the moved row (now at index 1)
    await expect(page.locator('[data-testid="task-row-task-1"]')).toHaveClass(
      /ring-2/
    );
  });

  test('Shift+Up moves the active row up', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate second row
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="task-row-task-2"]')).toHaveClass(
      /ring-2/
    );

    // Get the initial order of rows
    const rowsBefore = await page.locator('tbody tr').allTextContents();
    expect(rowsBefore[0]).toContain('First Task');
    expect(rowsBefore[1]).toContain('Second Task');

    // Press Shift+Up to move the row up
    await page.keyboard.press('Shift+ArrowUp');

    // The row should have moved up - check the new order
    const rowsAfter = await page.locator('tbody tr').allTextContents();
    expect(rowsAfter[0]).toContain('Second Task');
    expect(rowsAfter[1]).toContain('First Task');

    // Active row should still be the moved row (now at index 0)
    await expect(page.locator('[data-testid="task-row-task-2"]')).toHaveClass(
      /ring-2/
    );
  });

  test('Shift+Down on last row does nothing', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate last row
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('[data-testid="task-row-task-3"]')).toHaveClass(
      /ring-2/
    );

    // Get the initial order
    const rowsBefore = await page.locator('tbody tr').allTextContents();

    // Press Shift+Down - should do nothing since we're at the bottom
    await page.keyboard.press('Shift+ArrowDown');

    // Order should remain the same
    const rowsAfter = await page.locator('tbody tr').allTextContents();
    expect(rowsAfter).toEqual(rowsBefore);

    // Active row should still be the last row
    await expect(page.locator('[data-testid="task-row-task-3"]')).toHaveClass(
      /ring-2/
    );
  });

  test('Shift+Up on first row does nothing', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate first row
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="task-row-task-1"]')).toHaveClass(
      /ring-2/
    );

    // Get the initial order
    const rowsBefore = await page.locator('tbody tr').allTextContents();

    // Press Shift+Up - should do nothing since we're at the top
    await page.keyboard.press('Shift+ArrowUp');

    // Order should remain the same
    const rowsAfter = await page.locator('tbody tr').allTextContents();
    expect(rowsAfter).toEqual(rowsBefore);

    // Active row should still be the first row
    await expect(page.locator('[data-testid="task-row-task-1"]')).toHaveClass(
      /ring-2/
    );
  });

  test('Shift+Enter opens edit modal for active row', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate first row
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="task-row-task-1"]')).toHaveClass(
      /ring-2/
    );

    // Press Shift+Enter to open edit modal
    await page.keyboard.press('Shift+Enter');

    // Verify the edit modal appears
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify it's the edit modal (title should be "Edit Task")
    await expect(modal.locator('h2')).toHaveText('Edit Task');

    // Verify the task data is pre-populated (title field should have the task title)
    const titleInput = modal.locator('input[id="add-task-title"]');
    await expect(titleInput).toHaveValue('First Task');

    // Close modal by clicking Cancel button
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).not.toBeVisible();
  });

  test('Shift+Enter edit modal focuses Type dropdown for keyboard navigation', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate first row and open edit modal
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Shift+Enter');

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify the Type dropdown trigger is focused
    const typeButton = modal.locator('button[id="add-task-type"]');
    await expect(typeButton).toBeFocused();

    // Press Enter to open the dropdown
    await page.keyboard.press('Enter');

    // Verify dropdown is open (listbox should be visible)
    await expect(page.locator('[role="listbox"]')).toBeVisible();

    // Press Escape to close the dropdown, then Cancel to close modal
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
  });

  test('Shift+Enter edit modal shows Save button instead of Create', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate first row and open edit modal
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Shift+Enter');

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verify the submit button says "Save" not "Create"
    await expect(modal.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(
      modal.getByRole('button', { name: 'Create' })
    ).not.toBeVisible();

    // Close modal by clicking Cancel button
    await modal.getByRole('button', { name: 'Cancel' }).click();
  });

  test('Shift+Enter edit modal saves changes when Save is clicked', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('table');

    await page.click('body');

    // Activate first row and open edit modal
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Shift+Enter');

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Change the title
    const titleInput = modal.locator('input[id="add-task-title"]');
    await titleInput.clear();
    await titleInput.fill('Updated Task Title');

    // Click Save
    await modal.getByRole('button', { name: 'Save' }).click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // Verify the task title was updated in the table
    await expect(
      page
        .locator('[data-testid="task-row-task-1"]')
        .getByText('Updated Task Title')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="task-row-task-1"]').getByText('First Task')
    ).not.toBeVisible();
  });
});
