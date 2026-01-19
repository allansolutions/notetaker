import { test, expect } from '@playwright/test';

test.describe('Agenda', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure consistent starting state
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.removeItem('notetaker-blocks');
      localStorage.removeItem('notetaker-todo-metadata');
    });
    await page.reload();
    await page.waitForSelector('[data-testid="agenda"]');
  });

  test('agenda section is visible in sidebar', async ({ page }) => {
    const agenda = page.getByTestId('agenda');
    await expect(agenda).toBeVisible();
    await expect(page.getByText('Agenda')).toBeVisible();
  });

  test('displays hour markers', async ({ page }) => {
    await expect(page.getByText('6:00 AM')).toBeVisible();
    await expect(page.getByText('12:00 PM')).toBeVisible();
    await expect(page.getByText('10:00 PM')).toBeVisible();
  });

  test('scheduling a todo shows it in the agenda', async ({ page }) => {
    // Create a todo block
    const editor = page.locator('.block-input').first();
    await editor.click();
    await editor.fill('[] My scheduled task');
    await page.keyboard.press('Enter');

    // Wait for the todo to appear in the sidebar
    await expect(page.getByRole('checkbox').first()).toBeVisible();

    // Check the schedule checkbox
    const scheduleCheckbox = page.getByRole('checkbox').first();
    await scheduleCheckbox.click();

    // Wait for the block to appear in the agenda
    const agendaBlock = page.locator('[data-testid^="agenda-block-"]').first();
    await expect(agendaBlock).toBeVisible();
    await expect(agendaBlock).toContainText('My scheduled task');
  });

  test('unscheduling a todo removes it from the agenda', async ({ page }) => {
    // Create a todo block
    const editor = page.locator('.block-input').first();
    await editor.click();
    await editor.fill('[] Task to unschedule');
    await page.keyboard.press('Enter');

    // Schedule it
    const scheduleCheckbox = page.getByRole('checkbox').first();
    await scheduleCheckbox.click();

    // Verify it appears
    const agendaBlock = page.locator('[data-testid^="agenda-block-"]').first();
    await expect(agendaBlock).toBeVisible();

    // Unschedule it
    await scheduleCheckbox.click();

    // Verify it's removed
    await expect(agendaBlock).not.toBeVisible();
  });

  test('agenda block has draggable cursor', async ({ page }) => {
    // Create a todo block
    const editor = page.locator('.block-input').first();
    await editor.click();
    await editor.fill('[] Draggable task');
    await page.keyboard.press('Enter');

    // Schedule it
    const scheduleCheckbox = page.getByRole('checkbox').first();
    await scheduleCheckbox.click();

    // Get the agenda block
    const agendaBlock = page.locator('[data-testid^="agenda-block-"]').first();
    await expect(agendaBlock).toBeVisible();

    // Check that the block has the cursor-move class for drag indication
    await expect(agendaBlock).toHaveClass(/cursor-move/);
  });

  test('resize handle has correct cursor style', async ({ page }) => {
    // Create a todo block
    const editor = page.locator('.block-input').first();
    await editor.click();
    await editor.fill('[] Resizable task');
    await page.keyboard.press('Enter');

    // Schedule it
    const scheduleCheckbox = page.getByRole('checkbox').first();
    await scheduleCheckbox.click();

    // Get the resize handle (inside the block, at the bottom)
    const resizeHandle = page.locator('[data-testid^="agenda-block-resize-"]');
    await expect(resizeHandle).toBeVisible();

    // Check that the resize handle has the correct cursor
    await expect(resizeHandle).toHaveClass(/cursor-ns-resize/);
  });

  test('block position persists after reload', async ({ page }) => {
    // Create a todo block
    const editor = page.locator('.block-input').first();
    await editor.click();
    await editor.fill('[] Persistent task');
    await page.keyboard.press('Enter');

    // Schedule it
    const scheduleCheckbox = page.getByRole('checkbox').first();
    await scheduleCheckbox.click();

    // Get the agenda block
    const agendaBlock = page.locator('[data-testid^="agenda-block-"]').first();
    await expect(agendaBlock).toBeVisible();

    // Get initial position
    const initialBox = await agendaBlock.boundingBox();
    expect(initialBox).not.toBeNull();

    // Drag the block down
    await page.mouse.move(
      initialBox!.x + initialBox!.width / 2,
      initialBox!.y + initialBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      initialBox!.x + initialBox!.width / 2,
      initialBox!.y + initialBox!.height / 2 + 96
    );
    await page.mouse.up();

    // Get position after drag
    const afterDragBox = await agendaBlock.boundingBox();
    expect(afterDragBox).not.toBeNull();

    // Wait for localStorage debounce (300ms) to save
    await page.waitForTimeout(400);

    // Reload the page
    await page.reload();
    await page.waitForSelector('[data-testid^="agenda-block-"]');

    // Check position persisted
    const afterReloadBox = await page
      .locator('[data-testid^="agenda-block-"]')
      .first()
      .boundingBox();
    expect(afterReloadBox).not.toBeNull();
    // Allow small tolerance for rounding
    expect(Math.abs(afterReloadBox!.y - afterDragBox!.y)).toBeLessThanOrEqual(
      2
    );
  });
});
