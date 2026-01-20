import { test, expect } from '@playwright/test';

test.describe('Column Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-testid="sidebar"]');

    // Add a task
    const addTaskInput = page.getByPlaceholder('Add a new task...');
    await addTaskInput.fill('Test Task');
    await page.keyboard.press('Enter');

    // Dismiss the estimate gate modal by clicking a preset
    const estimateButton = page.getByRole('button', { name: '15m' });
    await estimateButton.click();

    // Wait for task detail view
    await page.waitForSelector('.block-input');

    // Go back to spreadsheet
    const backButton = page.getByRole('button', { name: /back/i });
    await backButton.click();

    // Wait for spreadsheet view and task to be visible
    await page.waitForSelector('[data-testid="sidebar"]');
    await expect(
      page
        .locator('[data-testid^="task-row-"]')
        .getByRole('button', { name: 'Test Task' })
    ).toBeVisible();
  });

  test('filter button is visible on hover', async ({ page }) => {
    const typeHeader = page.locator('th').filter({ hasText: 'Type' });
    // Hover on the group div inside the header, not just the th
    const groupDiv = typeHeader.locator('div.group');
    await groupDiv.hover();

    // Wait a bit for the CSS transition
    await page.waitForTimeout(100);

    const filterButton = typeHeader.getByTestId('filter-button');

    // Check if the button is visible (not opacity 0)
    const opacity = await filterButton.evaluate((el) => {
      return window.getComputedStyle(el).opacity;
    });

    console.log('Opacity after hover:', opacity);

    // Should be visible when hovering on the group (0.5 from group-hover:opacity-50)
    expect(Number(opacity)).toBeGreaterThan(0);
  });

  test('clicking filter button opens dropdown', async ({ page }) => {
    const typeHeader = page.locator('th').filter({ hasText: 'Type' });
    await typeHeader.hover();

    const filterButton = typeHeader.getByTestId('filter-button');
    await filterButton.click();

    // Take a screenshot
    await page.screenshot({
      path: 'test-results/filter-dropdown-open.png',
      fullPage: true,
    });

    // Check if dropdown is visible
    const dropdown = page.getByTestId('filter-dropdown');
    await expect(dropdown).toBeVisible();

    // Check that Filter text is visible
    await expect(page.getByText('Filter')).toBeVisible();
  });

  test('can select filter options', async ({ page }) => {
    const typeHeader = page.locator('th').filter({ hasText: 'Type' });
    await typeHeader.hover();

    const filterButton = typeHeader.getByTestId('filter-button');
    await filterButton.click();

    const dropdown = page.getByTestId('filter-dropdown');

    // Should see All and None buttons
    await expect(dropdown.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(dropdown.getByRole('button', { name: 'None' })).toBeVisible();

    // Click on an option (Admin checkbox) - inside the dropdown
    const adminLabel = dropdown.getByText('Admin');
    await adminLabel.click();

    // Filter button should now show active state
    await expect(filterButton).toHaveClass(/bg-accent/);
  });

  test('closes dropdown when pressing Escape', async ({ page }) => {
    const typeHeader = page.locator('th').filter({ hasText: 'Type' });
    await typeHeader.hover();

    const filterButton = typeHeader.getByTestId('filter-button');
    await filterButton.click();

    const dropdown = page.getByTestId('filter-dropdown');
    await expect(dropdown).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();
  });

  test('closes dropdown when clicking outside', async ({ page }) => {
    const typeHeader = page.locator('th').filter({ hasText: 'Type' });
    await typeHeader.hover();

    const filterButton = typeHeader.getByTestId('filter-button');
    await filterButton.click();

    const dropdown = page.getByTestId('filter-dropdown');
    await expect(dropdown).toBeVisible();

    // Click outside (on the table body)
    await page.locator('tbody').click();

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();
  });
});
