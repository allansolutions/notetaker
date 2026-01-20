import { Page } from '@playwright/test';

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
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  await page.route('**/api/tasks', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(tasks),
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
        estimate: body.estimate, // undefined triggers EstimateGate
        dueDate: body.dueDate,
        orderIndex: tasks.length,
        createdAt: now,
        updatedAt: now,
      };
      tasks.push(newTask);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newTask),
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
          body: JSON.stringify(tasks[taskIndex]),
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
          body: JSON.stringify(task),
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
        body: JSON.stringify([]),
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
        body: JSON.stringify(newSession),
      });
    } else {
      await route.continue();
    }
  });
}
