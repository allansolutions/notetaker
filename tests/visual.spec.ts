import { test, expect } from '@playwright/test';

test('Visual check of block selection', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForSelector('.block-input');

  const blockInput = page.locator('.block-input').first();
  await blockInput.click();
  await page.keyboard.type('This is a test block');

  // Screenshot before Escape
  await page.screenshot({ path: 'test-results/before-escape.png', fullPage: true });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);

  // Screenshot after Escape - should show selection
  await page.screenshot({ path: 'test-results/after-escape.png', fullPage: true });

  // Verify the class is there
  const wrapper = page.locator('.block-wrapper').first();
  await expect(wrapper).toHaveClass(/block-selected/);
});
