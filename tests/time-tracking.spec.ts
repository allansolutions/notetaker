import { test, expect } from '@playwright/test';
import { mockAuthenticated, mockTasksApi } from './helpers/auth';

// Parse minutes from time display text like "5m / 15m" or "1h 30m / 2h"
function parseMinutes(text: string): number {
  // Try simple minute format: "5m / 15m"
  const simpleMatch = text.match(/^(\d+)m\s*\//);
  if (simpleMatch) return parseInt(simpleMatch[1], 10);

  // Try hour+minute format: "1h 30m / 2h"
  const hourMatch = text.match(/^(\d+)h(?:\s*(\d+)m)?\s*\//);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    const mins = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
    return hours * 60 + mins;
  }

  return 0;
}

test.describe('Time Tracking', () => {
  test('should not show time flash when entering task', async ({ page }) => {
    // Setup auth and API mocks
    await mockAuthenticated(page);
    await mockTasksApi(page);

    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.text().includes('[useTimeTracking]') ||
        msg.text().includes('[useTasks]')
      ) {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');

    // Create a task
    const addTaskInput = page.getByPlaceholder('Add a new task...');
    await addTaskInput.fill('Time Test Task');
    await page.keyboard.press('Enter');

    // Set estimate to enable time tracking
    const estimateButton = page.getByRole('button', { name: '15m' });
    await estimateButton.click();

    // Wait for the task detail view and time display to appear
    await page.waitForSelector('.block-input');

    // Get the time display element
    const timeDisplay = page.locator('button:has-text("/")').first();
    await expect(timeDisplay).toBeVisible();

    // Wait a moment for any initial settling
    await page.waitForTimeout(100);

    // Clear logs from initial load
    consoleLogs.length = 0;

    // Navigate back to list
    const backButton = page.getByRole('button', { name: 'Back' });
    await backButton.click();

    // Wait for list view
    await expect(addTaskInput).toBeVisible();
    await page.waitForTimeout(100);

    // Navigate back to the task - click the task row button specifically
    const taskRow = page
      .getByTestId(/^task-row-/)
      .getByRole('button', { name: 'Time Test Task' });
    await taskRow.click();

    // Wait for time display to appear
    await expect(timeDisplay).toBeVisible();

    // Capture the time values shown
    const timeValues: string[] = [];

    // Check time display multiple times over 600ms
    for (let i = 0; i < 6; i++) {
      const text = await timeDisplay.textContent();
      timeValues.push(text || '');
      await page.waitForTimeout(100);
    }

    // Log what we captured
    console.log('Console logs:', consoleLogs);
    console.log('Time values over 600ms:', timeValues);

    const minutes = timeValues.map(parseMinutes);
    console.log('Parsed minutes:', minutes);

    // Check that time never decreases
    for (let i = 1; i < minutes.length; i++) {
      expect(minutes[i]).toBeGreaterThanOrEqual(minutes[i - 1]);
    }
  });

  test('should correctly track time across navigation with existing session', async ({
    page,
  }) => {
    // Setup auth and API mocks
    await mockAuthenticated(page);
    await mockTasksApi(page);

    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.text().includes('[useTimeTracking]') ||
        msg.text().includes('[useTasks]')
      ) {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="sidebar"]');

    // Create a task
    const addTaskInput = page.getByPlaceholder('Add a new task...');
    await addTaskInput.fill('Session Test Task');
    await page.keyboard.press('Enter');

    // Set estimate
    await page.getByRole('button', { name: '15m' }).click();
    await page.waitForSelector('.block-input');

    // Wait 2 seconds to accumulate some time
    await page.waitForTimeout(2000);

    const timeDisplay = page.locator('button:has-text("/")').first();
    const initialTime = await timeDisplay.textContent();
    console.log('Initial time after 2 seconds:', initialTime);

    // Clear logs
    consoleLogs.length = 0;

    // Navigate away
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(addTaskInput).toBeVisible();

    // Small wait
    await page.waitForTimeout(200);

    // Navigate back - click the task row button specifically
    await page
      .getByTestId(/^task-row-/)
      .getByRole('button', { name: 'Session Test Task' })
      .click();
    await expect(timeDisplay).toBeVisible();

    // Capture time immediately and after settling
    const immediateTime = await timeDisplay.textContent();
    await page.waitForTimeout(600);
    const settledTime = await timeDisplay.textContent();

    console.log('Console logs during re-entry:', consoleLogs);
    console.log('Immediate time on re-entry:', immediateTime);
    console.log('Settled time after 600ms:', settledTime);

    const immediateMs = parseMinutes(immediateTime || '');
    const settledMs = parseMinutes(settledTime || '');

    console.log(
      `Time comparison: immediate=${immediateMs}m, settled=${settledMs}m`
    );

    // Time should not decrease
    expect(settledMs).toBeGreaterThanOrEqual(immediateMs);
  });

  test('should handle pre-existing task with estimate', async ({ page }) => {
    // This test simulates viewing a task that already has an estimate
    // Setup auth and API mocks with a pre-seeded task
    await mockAuthenticated(page);
    await mockTasksApi(page, [
      {
        id: 'task-preseeded',
        title: 'Pre-seeded Task',
        type: 'admin',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: false,
        estimate: 15, // 15 minute estimate
      },
    ]);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.text().includes('[useTimeTracking]') ||
        msg.text().includes('[useTasks]')
      ) {
        consoleLogs.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="sidebar"]');

    // Navigate to the pre-seeded task
    const taskRow = page
      .getByTestId(/^task-row-/)
      .getByRole('button', { name: 'Pre-seeded Task' });
    await taskRow.click();

    // Wait for task detail view to load
    await page.waitForSelector('.block-input');

    // Wait for time display (format: "Xm / Ym" where X is elapsed and Y is estimate)
    const timeDisplay = page.locator('button:has-text("/")').first();
    await expect(timeDisplay).toBeVisible({ timeout: 10000 });

    // Capture time values over 2 seconds to catch the flash
    // The flash happens when the interval timer corrects elapsedMs
    const timeValues: string[] = [];
    for (let i = 0; i < 20; i++) {
      const text = await timeDisplay.textContent();
      timeValues.push(text || '');
      await page.waitForTimeout(100);
    }

    console.log('Console logs:', consoleLogs);
    console.log('Time values over 2 seconds:', timeValues);

    const minutes = timeValues.map(parseMinutes);
    console.log('Parsed minutes:', minutes);

    // Check if time ever decreases - this indicates the flash bug
    let foundDecrease = false;
    for (let i = 1; i < minutes.length; i++) {
      if (minutes[i] < minutes[i - 1]) {
        console.log(
          `BUG DETECTED: Time decreased from ${minutes[i - 1]}m to ${minutes[i]}m at index ${i}`
        );
        foundDecrease = true;
      }
    }

    // The bug causes time to flash high then drop
    // This test documents the bug - it should FAIL until fixed
    // Time should never decrease
    expect(foundDecrease).toBe(false);
  });
});
