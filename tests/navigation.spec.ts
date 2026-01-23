import { test, expect } from './fixtures';
import { mockAuthenticated, mockTasksApi } from './helpers/auth';

test.describe('URL-Based Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockTasksApi(page, [
      { id: 'task-1', title: 'Test Task 1' },
      { id: 'task-2', title: 'Test Task 2' },
    ]);
  });

  test.describe('Basic URL Routing', () => {
    test('loads spreadsheet view at root URL', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Should show the task table
      await expect(page.locator('table')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Test Task 1' })
      ).toBeVisible();
    });

    test('loads task detail view from URL', async ({ page }) => {
      await page.goto('http://localhost:5173/task/task-1');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Should show task detail view with block editor
      await expect(page.locator('.block-input')).toBeVisible();
      // Should have back button
      await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    });

    test('loads details view from URL', async ({ page }) => {
      await page.goto('http://localhost:5173/details');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Should show task details view
      await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    });

    test('loads archive view from URL', async ({ page }) => {
      await page.goto('http://localhost:5173/archive');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Should show archive view
      await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    });

    test('redirects invalid task ID to spreadsheet', async ({ page }) => {
      await page.goto('http://localhost:5173/task/nonexistent');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Should redirect to spreadsheet
      await expect(page.locator('table')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Test Task 1' })
      ).toBeVisible();
    });
  });

  test.describe('Navigation Updates URL', () => {
    test('clicking task updates URL to task detail', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Click on a task
      await page.getByRole('button', { name: 'Test Task 1' }).click();

      // Wait for task detail view
      await page.waitForSelector('.block-input');

      // URL should be updated
      await expect(page).toHaveURL(/\/task\/task-1$/);
    });

    test('clicking back updates URL to spreadsheet', async ({ page }) => {
      await page.goto('http://localhost:5173/task/task-1');
      await page.waitForSelector('.block-input');

      // Click back button
      await page.getByRole('button', { name: 'Back' }).click();

      // Wait for spreadsheet
      await page.waitForSelector('table');

      // URL should be root
      await expect(page).toHaveURL(/\/$/);
    });

    test('navigating to archive updates URL', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Click archive link
      await page.getByRole('button', { name: 'Archive' }).click();

      // Wait for archive view
      await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();

      // URL should be /archive
      await expect(page).toHaveURL(/\/archive$/);
    });
  });

  test.describe('Filter Preservation in URL', () => {
    test('date filter is preserved in URL', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Open date filter menu and select "This Week"
      await page.getByRole('button', { name: /Date: All/i }).click();
      // The popover content contains buttons for each preset
      await page
        .locator('[data-radix-popper-content-wrapper]')
        .getByRole('button', { name: 'This Week' })
        .click();

      // URL should include date filter
      await expect(page).toHaveURL(/date=this-week/);
    });

    test('filter state persists after page refresh', async ({ page }) => {
      // Navigate directly to a filtered URL
      await page.goto('http://localhost:5173/?date=this-week');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Date filter should be active - button shows "Date: This Week"
      const filterButton = page.getByRole('button', {
        name: /Date: This Week/i,
      });
      await expect(filterButton).toBeVisible();
    });

    test('type filter is preserved in URL', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Open type column filter
      const typeHeader = page.locator('th').filter({ hasText: 'Type' });
      await typeHeader.hover();
      await typeHeader.getByTestId('filter-button').click();

      // Select Admin
      const dropdown = page.getByTestId('filter-dropdown');
      await dropdown.getByText('Admin').click();

      // Press Escape to close dropdown
      await page.keyboard.press('Escape');

      // URL should include type filter
      await expect(page).toHaveURL(/type=admin/);
    });
  });

  test.describe('Browser Back/Forward Navigation', () => {
    test('browser back returns to previous view', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Navigate to task detail
      await page.getByRole('button', { name: 'Test Task 1' }).click();
      await page.waitForSelector('.block-input');
      await expect(page).toHaveURL(/\/task\/task-1$/);

      // Go back using browser
      await page.goBack();

      // Should be on spreadsheet
      await page.waitForSelector('table');
      await expect(page).toHaveURL(/\/$/);
    });

    test('browser forward returns to next view', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Navigate to task detail
      await page.getByRole('button', { name: 'Test Task 1' }).click();
      await page.waitForSelector('.block-input');

      // Go back
      await page.goBack();
      await page.waitForSelector('table');

      // Go forward
      await page.goForward();

      // Should be on task detail
      await page.waitForSelector('.block-input');
      await expect(page).toHaveURL(/\/task\/task-1$/);
    });
  });

  test.describe('Keyboard Navigation Shortcuts', () => {
    test('Cmd+[ navigates back', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Navigate to task detail
      await page.getByRole('button', { name: 'Test Task 1' }).click();
      await page.waitForSelector('.block-input');

      // Click on sidebar to defocus the block-input (shortcuts don't work when typing)
      await page.getByTestId('sidebar').click();

      // Use Cmd+[ to go back (Meta+[ on Mac)
      await page.keyboard.press('Meta+[');

      // Should be on spreadsheet
      await page.waitForSelector('table');
      await expect(page).toHaveURL(/\/$/);
    });

    test('Cmd+] navigates forward', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Navigate to task detail
      await page.getByRole('button', { name: 'Test Task 1' }).click();
      await page.waitForSelector('.block-input');

      // Go back first
      await page.goBack();
      await page.waitForSelector('table');

      // Use Cmd+] to go forward
      await page.keyboard.press('Meta+]');

      // Should be on task detail
      await page.waitForSelector('.block-input');
      await expect(page).toHaveURL(/\/task\/task-1$/);
    });

    test('keyboard shortcuts do not trigger when typing', async ({ page }) => {
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Navigate to task detail
      await page.getByRole('button', { name: 'Test Task 1' }).click();
      await page.waitForSelector('.block-input');

      // Focus on the block input (contenteditable)
      await page.locator('.block-input').first().click();

      // Type Cmd+[ while focused on text input
      await page.keyboard.press('Meta+[');

      // Should still be on task detail (shortcut should not trigger)
      await expect(page.locator('.block-input')).toBeVisible();
    });
  });

  test.describe('URL with Multiple Filters', () => {
    test('loads page with multiple filter params', async ({ page }) => {
      await page.goto('http://localhost:5173/?date=this-week&type=admin');
      await page.waitForSelector('[data-testid="sidebar"]');

      // Both filters should be applied
      // Date filter shows "Date: This Week"
      const dateFilterButton = page.getByRole('button', {
        name: /Date: This Week/i,
      });
      await expect(dateFilterButton).toBeVisible();

      // Type filter should be active (blue button)
      const typeHeader = page.locator('th').filter({ hasText: 'Type' });
      await typeHeader.hover();
      const filterButton = typeHeader.getByTestId('filter-button');
      await expect(filterButton).toHaveClass(/bg-accent/);
    });
  });
});
