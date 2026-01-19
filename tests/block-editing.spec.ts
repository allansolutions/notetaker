import { test, expect } from '@playwright/test';

test.describe('Block Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Create a task and navigate to its detail view
    const addTaskInput = page.getByPlaceholder('Add a new task...');
    await addTaskInput.fill('Test Task');
    await page.keyboard.press('Enter');

    // Dismiss the estimate gate modal by clicking a preset
    const estimateButton = page.getByRole('button', { name: '15m' });
    await estimateButton.click();

    // Wait for the task detail view to load
    await page.waitForSelector('.block-input');
  });

  test.describe('Backspace merge', () => {
    test('merges block with previous when backspace at start of non-empty block', async ({
      page,
    }) => {
      // Type in first block
      const firstBlock = page.locator('.block-input').first();
      await firstBlock.click();
      await page.keyboard.type('Hello');
      await page.keyboard.press('Enter');

      // Wait for second block and type in it
      await page.waitForTimeout(50);
      await page.keyboard.type('World');

      // Verify we have two blocks
      const blocks = page.locator('.block-input');
      await expect(blocks).toHaveCount(2);
      await expect(blocks.first()).toHaveText('Hello');
      await expect(blocks.nth(1)).toHaveText('World');

      // Move cursor to start of second block
      await page.keyboard.press('Home');
      await page.waitForTimeout(50);

      // Press Backspace to merge
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(100);

      // Should now have one block with merged content
      await expect(blocks).toHaveCount(1);
      await expect(blocks.first()).toHaveText('HelloWorld');
    });

    test('cursor is positioned at join point after merge', async ({ page }) => {
      // Type in first block
      const firstBlock = page.locator('.block-input').first();
      await firstBlock.click();
      await page.keyboard.type('Hello');
      await page.keyboard.press('Enter');

      // Wait for second block and type in it
      await page.waitForTimeout(50);
      await page.keyboard.type('World');

      // Move cursor to start of second block
      await page.keyboard.press('Home');
      await page.waitForTimeout(50);

      // Press Backspace to merge
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(100);

      // Now type something - it should appear at the join point (between Hello and World)
      await page.keyboard.type('---');
      await page.waitForTimeout(50);

      // Verify the text is "Hello---World" (cursor was at position 5)
      const blocks = page.locator('.block-input');
      await expect(blocks.first()).toHaveText('Hello---World');
    });

    test('deletes empty block when backspace at start', async ({ page }) => {
      // Type in first block
      const firstBlock = page.locator('.block-input').first();
      await firstBlock.click();
      await page.keyboard.type('Content');
      await page.keyboard.press('Enter');

      // Second block is empty, press Backspace immediately
      await page.waitForTimeout(50);
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(100);

      // Should still have one block
      const blocks = page.locator('.block-input');
      await expect(blocks).toHaveCount(1);
      await expect(blocks.first()).toHaveText('Content');
    });
  });

  test.describe('Enter split', () => {
    test('creates new block and moves text after cursor to it', async ({
      page,
    }) => {
      // Type in first block
      const firstBlock = page.locator('.block-input').first();
      await firstBlock.click();
      await page.keyboard.type('HelloWorld');

      // Move cursor to middle (after "Hello")
      await page.keyboard.press('Home');
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowRight');
      }

      // Press Enter to split
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);

      // Should have two blocks with split content
      const blocks = page.locator('.block-input');
      await expect(blocks).toHaveCount(2);
      await expect(blocks.first()).toHaveText('Hello');
      await expect(blocks.nth(1)).toHaveText('World');
    });

    test('creates empty new block when cursor at end', async ({ page }) => {
      // Type in first block
      const firstBlock = page.locator('.block-input').first();
      await firstBlock.click();
      await page.keyboard.type('Complete line');

      // Press Enter at end
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);

      // Should have two blocks, second one empty
      const blocks = page.locator('.block-input');
      await expect(blocks).toHaveCount(2);
      await expect(blocks.first()).toHaveText('Complete line');
      await expect(blocks.nth(1)).toHaveText('');
    });

    test('cursor is at beginning of new block after split', async ({
      page,
    }) => {
      // Type in first block
      const firstBlock = page.locator('.block-input').first();
      await firstBlock.click();
      await page.keyboard.type('HelloWorld');

      // Move cursor to middle (after "Hello")
      await page.keyboard.press('Home');
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowRight');
      }

      // Press Enter to split
      await page.keyboard.press('Enter');

      // Wait for second block to exist and verify split worked
      const blocks = page.locator('.block-input');
      await expect(blocks).toHaveCount(2);
      await expect(blocks.first()).toHaveText('Hello');
      await expect(blocks.nth(1)).toHaveText('World');
      await page.waitForTimeout(150);

      // Type something that won't trigger markdown (avoid: # - * > [] ` etc)
      await page.keyboard.type('NEW');
      await page.waitForTimeout(50);

      // NEW should be at start of second block: "NEWWorld"
      // If focus is wrong, it might be at end of first block: "HelloNEW"
      await expect(blocks).toHaveCount(2);
      await expect(blocks.first()).toHaveText('Hello');
      await expect(blocks.nth(1)).toHaveText('NEWWorld');
    });
  });
});
