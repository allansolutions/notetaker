import { test, expect } from '@playwright/test';

test.describe('Block Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Wait for the editor to load
    await page.waitForSelector('.block-input');
  });

  test('Meta+e key should select the block', async ({ page }) => {
    // Find the first block input
    const blockInput = page.locator('.block-input').first();

    // Click to focus and type something
    await blockInput.click();
    await blockInput.fill('Test content');

    // Verify we're in edit mode (input is focused)
    await expect(blockInput).toBeFocused();

    // Press Meta+e to select block
    await page.keyboard.press('Meta+e');

    // Wait a moment for state to update
    await page.waitForTimeout(100);

    // Check if the block-selected class is applied
    const wrapper = page.locator('.block-wrapper').first();
    const hasSelectedClass = await wrapper.evaluate(el => el.classList.contains('block-selected'));

    console.log('Has block-selected class:', hasSelectedClass);

    // Get the wrapper's classes for debugging
    const wrapperClasses = await wrapper.evaluate(el => el.className);
    console.log('Wrapper classes:', wrapperClasses);

    // Check if input is still focused
    const inputStillFocused = await blockInput.evaluate(el => document.activeElement === el);
    console.log('Input still focused:', inputStillFocused);

    // Check what element has focus
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        className: el?.className,
        id: el?.id
      };
    });
    console.log('Focused element:', focusedElement);

    // The wrapper should have the selected class
    await expect(wrapper).toHaveClass(/block-selected/);
  });

  test('Enter should return to edit mode after Meta+e', async ({ page }) => {
    const blockInput = page.locator('.block-input').first();

    await blockInput.click();
    await blockInput.fill('Test content');
    await page.keyboard.press('Meta+e');
    await page.waitForTimeout(100);

    // Now press Enter to return to edit mode
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    // The input should be focused again
    const inputFocused = await blockInput.evaluate(el => document.activeElement === el);
    console.log('Input focused after Enter:', inputFocused);

    // Check if selected class is removed
    const wrapper = page.locator('.block-wrapper').first();
    const hasSelectedClass = await wrapper.evaluate(el => el.classList.contains('block-selected'));
    console.log('Has block-selected class after Enter:', hasSelectedClass);
  });

  test('Debug: Check component state after Meta+e', async ({ page }) => {
    const blockInput = page.locator('.block-input').first();

    await blockInput.click();
    await page.keyboard.type('Hello');

    // Log before Meta+e
    console.log('=== Before Meta+e ===');
    let wrapperClasses = await page.locator('.block-wrapper').first().evaluate(el => el.className);
    console.log('Wrapper classes:', wrapperClasses);

    // Press Meta+e and watch what happens
    await page.keyboard.press('Meta+e');

    // Check immediately
    console.log('=== Immediately after Meta+e ===');
    wrapperClasses = await page.locator('.block-wrapper').first().evaluate(el => el.className);
    console.log('Wrapper classes:', wrapperClasses);

    // Wait and check again
    await page.waitForTimeout(50);
    console.log('=== 50ms after Meta+e ===');
    wrapperClasses = await page.locator('.block-wrapper').first().evaluate(el => el.className);
    console.log('Wrapper classes:', wrapperClasses);

    await page.waitForTimeout(100);
    console.log('=== 150ms after Meta+e ===');
    wrapperClasses = await page.locator('.block-wrapper').first().evaluate(el => el.className);
    console.log('Wrapper classes:', wrapperClasses);

    // Check contentEditable state
    const isContentEditable = await blockInput.evaluate(el => el.contentEditable);
    console.log('contentEditable:', isContentEditable);
  });
});
