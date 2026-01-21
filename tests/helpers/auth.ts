import { Page, expect } from '@playwright/test';

export const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User',
};

/**
 * Sets up route handlers to mock an authenticated user.
 * Call this before navigating to any page.
 */
export async function mockAuthenticated(page: Page): Promise<void> {
  // Mock auth endpoint
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: mockUser,
        settings: null,
      }),
    });
  });
}

/**
 * Sets up route handlers to mock an unauthenticated state.
 * Call this before navigating to any page.
 */
export async function mockUnauthenticated(page: Page): Promise<void> {
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: null }),
    });
  });
}

/**
 * Sets up route handlers to mock the tasks API.
 * This stores tasks in memory so they persist across requests.
 */
export async function mockTasksApi(
  page: Page,
  initialTasks: Array<{
    id: string;
    title: string;
    type?: string;
    status?: string;
    importance?: string;
    blocks?: unknown[];
    scheduled?: boolean;
    orderIndex?: number;
    estimate?: number;
    startTime?: number;
    duration?: number;
    dueDate?: number;
  }> = []
): Promise<void> {
  let tasks = initialTasks.map((t, i) => ({
    id: t.id,
    userId: mockUser.id,
    type: t.type ?? 'admin',
    title: t.title,
    status: t.status ?? 'todo',
    importance: t.importance ?? 'mid',
    blocks: t.blocks ?? [],
    scheduled: t.scheduled ?? false,
    orderIndex: t.orderIndex ?? i,
    estimate: t.estimate,
    startTime: t.startTime ?? 360,
    duration: t.duration ?? 30,
    dueDate: t.dueDate,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  await page.route('**/api/tasks', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tasks }),
      });
    } else if (method === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const now = Date.now();
      const newTask = {
        id: `task-${now}`,
        userId: mockUser.id,
        type: body.type ?? 'admin',
        title: body.title ?? '',
        status: body.status ?? 'todo',
        importance: body.importance ?? 'mid',
        blocks: body.blocks ?? [],
        scheduled: body.scheduled ?? false,
        startTime: body.startTime ?? 360, // 6:00 AM default
        duration: body.duration ?? 30,
        estimate: body.estimate,
        dueDate: body.dueDate,
        orderIndex: tasks.length,
        createdAt: now,
        updatedAt: now,
      };
      tasks.push(newTask);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ task: newTask }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/tasks/*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const taskId = url.split('/api/tasks/')[1]?.split('/')[0];

    if (method === 'PUT') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const taskIndex = tasks.findIndex((t) => t.id === taskId);
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          ...body,
          updatedAt: Date.now(),
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ task: tasks[taskIndex] }),
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    } else if (method === 'DELETE') {
      tasks = tasks.filter((t) => t.id !== taskId);
      await route.fulfill({ status: 204 });
    } else if (method === 'GET') {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ task }),
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    } else {
      await route.continue();
    }
  });

  // Mock sessions endpoints
  await page.route('**/api/tasks/*/sessions', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessions: [] }),
      });
    } else if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const newSession = {
        id: `session-${Date.now()}`,
        taskId: route.request().url().split('/api/tasks/')[1]?.split('/')[0],
        startTime: body.startTime,
        endTime: body.endTime,
        createdAt: Date.now(),
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ session: newSession }),
      });
    } else {
      await route.continue();
    }
  });
}

const TYPE_LABELS: Record<string, string> = {
  admin: 'Admin',
  personal: 'Personal',
  operations: 'Operations',
  business: 'Business Dev',
  'jardin-casa': 'Jardin: Casa',
  'jardin-finca': 'Jardin: Finca',
  fitness: 'Fitness',
};

const IMPORTANCE_LABELS: Record<string, string> = {
  high: 'High',
  mid: 'Mid',
  low: 'Low',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'To-do',
  'in-progress': 'In progress',
  done: 'Done',
};

/**
 * Adds a task using the Add Task modal.
 * Opens the modal, fills in required fields, and submits.
 * After submission, the user stays on the spreadsheet view.
 */
export async function addTaskViaModal(
  page: Page,
  title: string,
  options: {
    type?: string;
    importance?: string;
    status?: string;
    estimate?: string;
  } = {}
): Promise<void> {
  const {
    type = 'admin',
    importance = 'mid',
    status,
    estimate = '15m',
  } = options;

  // Click the add task button
  await page.getByRole('button', { name: 'Add task' }).click();

  // Wait for modal to open by checking for heading text
  const addTaskHeading = page.locator('h2', { hasText: 'Add Task' });
  await expect(addTaskHeading).toBeVisible();
  const modal = page.locator('[role="dialog"]').filter({ has: addTaskHeading });

  // Type dropdown auto-opens - select the type option
  const typeLabel = TYPE_LABELS[type] ?? 'Admin';
  await page.getByRole('option', { name: typeLabel }).click();

  // Fill in Task title (should have focus after type selection)
  await modal.getByLabel('Task').fill(title);

  // Select Importance from dropdown
  await modal.getByRole('combobox', { name: /Importance/i }).click();
  const importanceLabel = IMPORTANCE_LABELS[importance] ?? 'Mid';
  await page.getByRole('option', { name: importanceLabel }).click();

  // Fill in estimate using text input (format: "15m", "1h 30m", etc.)
  await modal.getByLabel('Estimate').fill(estimate);

  // Optionally change status (defaults to 'todo')
  if (status) {
    await modal.getByRole('combobox', { name: /Status/i }).click();
    const statusLabel = STATUS_LABELS[status] ?? 'To-do';
    await page.getByRole('option', { name: statusLabel }).click();
  }

  // Click Create
  await modal.getByRole('button', { name: 'Create' }).click();

  // Wait for task to appear in spreadsheet
  await expect(
    page
      .locator('[data-testid^="task-row-"]')
      .getByRole('button', { name: title })
  ).toBeVisible();
}

/**
 * Navigates to a task's detail view by clicking on it in the spreadsheet.
 */
export async function navigateToTaskDetail(
  page: Page,
  taskTitle: string
): Promise<void> {
  const taskRow = page
    .locator('[data-testid^="task-row-"]')
    .getByRole('button', { name: taskTitle });
  await taskRow.click();

  // Wait for task detail view to load
  await page.waitForSelector('.block-input');
}
