import { test, expect } from '@playwright/test';

test.describe('Sidebar Resize', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure consistent starting state
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.removeItem('notetaker-sidebar-width');
      localStorage.removeItem('notetaker-tasks');
    });
    await page.reload();
    await page.waitForSelector('[data-testid="sidebar"]');
  });

  test('resize handle has correct cursor style', async ({ page }) => {
    const handle = page.getByTestId('sidebar-resize-handle');
    await expect(handle).toBeVisible();

    const cursor = await handle.evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor).toBe('col-resize');
  });

  test('sidebar starts at default width', async ({ page }) => {
    const sidebar = page.getByTestId('sidebar');
    const boundingBox = await sidebar.boundingBox();

    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBe(240); // DEFAULT_SIDEBAR_WIDTH
  });

  test('dragging handle left increases sidebar width', async ({ page }) => {
    const handle = page.getByTestId('sidebar-resize-handle');
    const sidebar = page.getByTestId('sidebar');

    const initialBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialWidth = initialBox!.width;

    // Get the handle's position
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Drag the handle 100px to the left (increases width)
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x - 100,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    const finalBox = await sidebar.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(finalBox!.width).toBeGreaterThan(initialWidth);
    // Allow small tolerance for border/handle width
    expect(finalBox!.width).toBeGreaterThanOrEqual(initialWidth + 95);
    expect(finalBox!.width).toBeLessThanOrEqual(initialWidth + 105);
  });

  test('dragging handle right decreases sidebar width', async ({ page }) => {
    const handle = page.getByTestId('sidebar-resize-handle');
    const sidebar = page.getByTestId('sidebar');

    const initialBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialWidth = initialBox!.width;

    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Drag the handle 50px to the right (decreases width)
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + 50,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    const finalBox = await sidebar.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(finalBox!.width).toBeLessThan(initialWidth);
    // Allow small tolerance for border/handle width
    expect(finalBox!.width).toBeGreaterThanOrEqual(initialWidth - 55);
    expect(finalBox!.width).toBeLessThanOrEqual(initialWidth - 45);
  });

  test('sidebar width respects minimum constraint', async ({ page }) => {
    const handle = page.getByTestId('sidebar-resize-handle');
    const sidebar = page.getByTestId('sidebar');

    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Try to drag very far right to go below minimum
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x + 500,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    const finalBox = await sidebar.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(finalBox!.width).toBe(180); // MIN_SIDEBAR_WIDTH
  });

  test('sidebar width respects maximum constraint', async ({ page }) => {
    const handle = page.getByTestId('sidebar-resize-handle');
    const sidebar = page.getByTestId('sidebar');

    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Try to drag very far left to exceed maximum
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x - 500,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    const finalBox = await sidebar.boundingBox();
    expect(finalBox).not.toBeNull();
    expect(finalBox!.width).toBe(500); // MAX_SIDEBAR_WIDTH
  });

  test('sidebar width persists after reload', async ({ page }) => {
    const handle = page.getByTestId('sidebar-resize-handle');
    const sidebar = page.getByTestId('sidebar');

    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Drag to change width
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox!.x - 60,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.up();

    const widthAfterDrag = (await sidebar.boundingBox())!.width;
    // Allow small tolerance for border/handle width
    expect(widthAfterDrag).toBeGreaterThanOrEqual(295);
    expect(widthAfterDrag).toBeLessThanOrEqual(305);

    // Wait for localStorage debounce (300ms) to save the width
    await page.waitForTimeout(400);

    // Reload the page
    await page.reload();
    await page.waitForSelector('[data-testid="sidebar"]');

    // Check width persisted (should be within 1px of original)
    const widthAfterReload = (await page.getByTestId('sidebar').boundingBox())!
      .width;
    expect(Math.abs(widthAfterReload - widthAfterDrag)).toBeLessThanOrEqual(1);
  });

  test('text is not selected while dragging', async ({ page }) => {
    const handle = page.getByTestId('sidebar-resize-handle');

    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();

    // Start dragging
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2
    );
    await page.mouse.down();

    // Check that select-none class is applied during drag
    const mainContainer = page.locator('.flex.min-h-screen');
    await expect(mainContainer).toHaveClass(/select-none/);

    await page.mouse.up();

    // Check that select-none class is removed after drag
    await expect(mainContainer).not.toHaveClass(/select-none/);
  });
});
