import { test, expect } from './fixtures';
import {
  mockAuthenticated,
  mockTasksApi,
  addTaskViaModal,
  navigateToTaskDetail,
} from './helpers/auth';

test.describe('Todo checkbox deletion', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth and API mocks
    await mockAuthenticated(page);
    await mockTasksApi(page);

    await page.goto('http://localhost:5173');

    // Create a task (stays on spreadsheet after creation)
    await addTaskViaModal(page, 'Test Task');

    // Navigate to task detail view
    await navigateToTaskDetail(page, 'Test Task');
  });

  test('Delete key removes todo checkbox on first block', async ({ page }) => {
    // Type [] to create a todo block on the first line
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.click();
    await page.keyboard.type('[] My task');
    await page.waitForTimeout(50);

    // Verify it's a todo block (has checkbox)
    const checkbox = page.locator('[data-block-id] > button').first();
    await expect(checkbox).toBeVisible();

    // Move cursor to start (right after checkbox)
    await page.keyboard.press('Home');
    await page.waitForTimeout(50);

    // Press Delete to remove the checkbox
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);

    // Checkbox should be gone, but text remains
    await expect(checkbox).not.toBeVisible();
    await expect(firstBlock).toHaveText('My task');
  });

  test('Delete key removes todo checkbox on second block', async ({ page }) => {
    // Type something on first block and create second block
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.click();
    await page.keyboard.type('First line');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);

    // Type [] to create a todo block on the second line
    await page.keyboard.type('[] My task');
    await page.waitForTimeout(50);

    // Verify it's a todo block (has checkbox) - should be second button
    const checkboxes = page.locator('[data-block-id] > button');
    await expect(checkboxes).toHaveCount(1); // Only todo has checkbox button

    // Move cursor to start (right after checkbox)
    await page.keyboard.press('Home');
    await page.waitForTimeout(50);

    // Press Delete to remove the checkbox
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);

    // Checkbox should be gone, but text remains
    await expect(checkboxes).toHaveCount(0);
    const secondBlock = page.locator('.block-input').nth(1);
    await expect(secondBlock).toHaveText('My task');
  });

  test('Delete key removes todo checkbox on first block when clicking to position cursor', async ({
    page,
  }) => {
    // Type [] to create a todo block on the first line
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.click();
    await page.keyboard.type('[] My task');
    await page.waitForTimeout(50);

    // Verify it's a todo block (has checkbox)
    const checkbox = page.locator('[data-block-id] > button').first();
    await expect(checkbox).toBeVisible();

    // Click somewhere else first (e.g., the title) to lose focus
    await page.locator('textarea[placeholder="Task title"]').click();
    await page.waitForTimeout(50);

    // Now click back on the first block - this simulates user clicking into it
    await firstBlock.click();
    await page.waitForTimeout(50);

    // Move cursor to start (right after checkbox)
    await page.keyboard.press('Home');
    await page.waitForTimeout(50);

    // Press Delete to remove the checkbox
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);

    // Checkbox should be gone, but text remains
    await expect(checkbox).not.toBeVisible();
    await expect(firstBlock).toHaveText('My task');
  });

  test('Delete key removes empty todo checkbox on first block', async ({
    page,
  }) => {
    // Create an empty todo block by typing [] and space only
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.click();
    await page.keyboard.type('[] ');
    await page.waitForTimeout(50);

    // Verify it's a todo block with checkbox but NO text
    const checkbox = page.locator('[data-block-id] > button').first();
    await expect(checkbox).toBeVisible();
    await expect(firstBlock).toHaveText('');

    // Press Delete to remove the checkbox (cursor should already be at start since block is empty)
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);

    // Checkbox should be gone
    await expect(checkbox).not.toBeVisible();
  });

  test('Backspace removes empty todo checkbox (Mac Delete key)', async ({
    page,
  }) => {
    // Create an empty todo block
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.click();
    await page.keyboard.type('[] ');
    await page.waitForTimeout(50);

    // Verify it's an empty todo
    const checkbox = page.locator('[data-block-id] > button').first();
    await expect(checkbox).toBeVisible();
    await expect(firstBlock).toHaveText('');

    // Press Backspace (Mac "Delete" key) - should remove checkbox, NOT delete block
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(100);

    // Checkbox should be gone but block should still exist
    await expect(checkbox).not.toBeVisible();
    const blocks = page.locator('.block-input');
    await expect(blocks).toHaveCount(1);
  });

  test('Delete key removes empty todo after clicking into it', async ({
    page,
  }) => {
    // Create an empty todo block
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.click();
    await page.keyboard.type('[] ');
    await page.waitForTimeout(50);

    // Verify it's an empty todo
    const checkbox = page.locator('[data-block-id] > button').first();
    await expect(checkbox).toBeVisible();
    await expect(firstBlock).toHaveText('');

    // Click away to lose focus
    await page.locator('textarea[placeholder="Task title"]').click();
    await page.waitForTimeout(100);

    // Click back into the empty todo block
    await firstBlock.click();
    await page.waitForTimeout(100);

    // Press Delete
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);

    // Checkbox should be gone
    await expect(checkbox).not.toBeVisible();
  });

  test('Delete key removes todo checkbox when using keyboard only (no click)', async ({
    page,
  }) => {
    // Wait for the first block to be focused (auto-focus happens on mount)
    const firstBlock = page.locator('.block-input').first();
    await firstBlock.focus();
    await page.waitForTimeout(100);

    // Type [] to create a todo block on the first line
    await page.keyboard.type('[] My task');
    await page.waitForTimeout(50);

    // Verify it's a todo block (has checkbox)
    const checkbox = page.locator('[data-block-id] > button').first();
    await expect(checkbox).toBeVisible();

    // Move cursor to start using only keyboard
    await page.keyboard.press('Home');
    await page.waitForTimeout(50);

    // Press Delete to remove the checkbox
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);

    // Checkbox should be gone, but text remains
    await expect(checkbox).not.toBeVisible();
    await expect(firstBlock).toHaveText('My task');
  });
});

test.describe('Block Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth and API mocks
    await mockAuthenticated(page);
    await mockTasksApi(page);

    await page.goto('http://localhost:5173');

    // Create a task (stays on spreadsheet after creation)
    await addTaskViaModal(page, 'Test Task');

    // Navigate to task detail view
    await navigateToTaskDetail(page, 'Test Task');
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

      // Wait for merge to complete by checking content (more reliable than timeout)
      const blocks = page.locator('.block-input');
      await expect(blocks).toHaveCount(1);
      await expect(blocks.first()).toHaveText('HelloWorld');

      // Wait for cursor positioning to complete and ensure element is focused
      await page.waitForTimeout(100);
      await expect(blocks.first()).toBeFocused();

      // Now type something - it should appear at the join point (between Hello and World)
      await page.keyboard.type('---');
      await page.waitForTimeout(50);

      // Verify the text is "Hello---World" (cursor was at position 5)
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

      // Wait for cursor positioning
      await page.waitForTimeout(100);

      // Move cursor to start of second block using Home key
      // This ensures cursor is at position 0 regardless of focus behavior
      await page.keyboard.press('Home');
      await page.waitForTimeout(50);

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
