import { test, expect } from '@playwright/test';

test.describe('Move Blocks with Cmd+Shift+Arrow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('http://localhost:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.block-input');
  });

  async function typeInNewBlock(page, text: string) {
    // Wait for the focused block to be ready
    await page.waitForTimeout(150);
    await page.keyboard.type(text);
  }

  test('Cmd+Shift+Down should move block down', async ({ page }) => {
    // Create two blocks
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.click();
    await page.keyboard.type('First block');
    await page.keyboard.press('Enter');

    // Wait for new block and type
    await typeInNewBlock(page, 'Second block');

    // Take screenshot to debug
    await page.screenshot({
      path: 'test-results/two-blocks-created.png',
      fullPage: true,
    });

    // Go back to first block and select it
    const blocks = page.locator('.block-input');
    await blocks.first().click();
    await page.waitForTimeout(50);
    await page.keyboard.press('Meta+e');
    await page.waitForTimeout(100);

    // Verify first block is selected (using data-block-id to find wrapper)
    const wrapper = page.locator('[data-block-id]').first();
    await expect(wrapper).toHaveClass(/bg-accent-subtle/);

    // Move it down with Cmd+Shift+Down
    await page.keyboard.press('Meta+Shift+ArrowDown');
    await page.waitForTimeout(100);

    await page.screenshot({
      path: 'test-results/after-move-down.png',
      fullPage: true,
    });

    // Now "First block" should be second
    const blockTexts = await blocks.allTextContents();
    console.log('Block order after move:', blockTexts);

    expect(blockTexts[0]).toBe('Second block');
    expect(blockTexts[1]).toBe('First block');
  });

  test('Cmd+Shift+Up should move block up', async ({ page }) => {
    // Create two blocks
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.click();
    await page.keyboard.type('First block');
    await page.keyboard.press('Enter');
    await typeInNewBlock(page, 'Second block');

    // Select second block (current one)
    await page.keyboard.press('Meta+e');
    await page.waitForTimeout(100);

    // Move it up
    await page.keyboard.press('Meta+Shift+ArrowUp');
    await page.waitForTimeout(100);

    // Now "Second block" should be first
    const blocks = page.locator('.block-input');
    const blockTexts = await blocks.allTextContents();
    console.log('Block order after move up:', blockTexts);

    expect(blockTexts[0]).toBe('Second block');
    expect(blockTexts[1]).toBe('First block');
  });

  test('Visual verification of block move', async ({ page }) => {
    // Create three blocks
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.click();
    await page.keyboard.type('Block A');
    await page.keyboard.press('Enter');
    await typeInNewBlock(page, 'Block B');
    await page.keyboard.press('Enter');
    await typeInNewBlock(page, 'Block C');

    await page.screenshot({
      path: 'test-results/before-move.png',
      fullPage: true,
    });

    // Go to Block B and select it
    const blocks = page.locator('.block-input');
    await blocks.nth(1).click();
    await page.waitForTimeout(50);
    await page.keyboard.press('Meta+e');
    await page.waitForTimeout(100);

    await page.screenshot({
      path: 'test-results/block-b-selected.png',
      fullPage: true,
    });

    // Move Block B up
    await page.keyboard.press('Meta+Shift+ArrowUp');
    await page.waitForTimeout(100);

    await page.screenshot({
      path: 'test-results/after-move-up.png',
      fullPage: true,
    });

    // Verify order
    const blockTexts = await blocks.allTextContents();
    expect(blockTexts).toEqual(['Block B', 'Block A', 'Block C']);
  });
});
