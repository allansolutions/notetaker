import { test, expect } from '@playwright/test';

test('Visual check of block selection', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForSelector('.block-input');

  const blockInput = page.locator('.block-input').first();
  await blockInput.click();
  await page.keyboard.type('This is a test block');

  // Screenshot before selection
  await page.screenshot({ path: 'test-results/before-selection.png', fullPage: true });

  await page.keyboard.press('Meta+e');
  await page.waitForTimeout(100);

  // Screenshot after Meta+e - should show selection
  await page.screenshot({ path: 'test-results/after-selection.png', fullPage: true });

  // Verify the class is there (using data-block-id to find wrapper)
  const wrapper = page.locator('[data-block-id]').first();
  await expect(wrapper).toHaveClass(/bg-accent-subtle/);
});
