import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  getTasksByUserId,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getMaxOrderIndex,
} from '../services/tasks';
import {
  getSessionsByTaskId,
  getSessionById,
  createTimeSession,
  updateTimeSession,
  deleteTimeSession,
  verifyTaskOwnership,
} from '../services/time-sessions';

export const taskRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

taskRoutes.use('*', requireAuth);

// Get all tasks for user
taskRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');
  const tasks = await getTasksByUserId(db, userId);

  // Transform DB tasks to frontend format
  const transformed = tasks.map((task) => ({
    ...task,
    blocks: JSON.parse(task.blocks),
    scheduled: task.scheduled ?? false,
  }));

  return c.json({ tasks: transformed });
});

// Reorder tasks - MUST be before /:id routes to avoid matching "reorder" as an ID
taskRoutes.put('/reorder', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const db = c.get('db');

  if (!Array.isArray(body.taskOrders)) {
    return c.json({ error: 'Invalid taskOrders format' }, 400);
  }

  await reorderTasks(db, userId, body.taskOrders);

  return c.json({ success: true });
});

// Get single task
taskRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const taskId = c.req.param('id');
  const db = c.get('db');
  const task = await getTaskById(db, taskId, userId);

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({
    task: {
      ...task,
      blocks: JSON.parse(task.blocks),
      scheduled: task.scheduled ?? false,
    },
  });
});

// Create task
taskRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const db = c.get('db');

  // Get next order index
  const maxOrder = await getMaxOrderIndex(db, userId);

  const task = await createTask(db, userId, {
    type: body.type ?? 'admin',
    title: body.title ?? '',
    status: body.status ?? 'todo',
    importance: body.importance ?? 'mid',
    blocks: JSON.stringify(body.blocks ?? []),
    scheduled: body.scheduled ?? false,
    startTime: body.startTime,
    duration: body.duration,
    estimate: body.estimate,
    dueDate: body.dueDate,
    orderIndex: body.orderIndex ?? maxOrder + 1,
  });

  return c.json(
    {
      task: {
        ...task,
        blocks: JSON.parse(task.blocks),
        scheduled: task.scheduled ?? false,
      },
    },
    201
  );
});

// Update task
taskRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const taskId = c.req.param('id');
  const body = await c.req.json();
  const db = c.get('db');

  const existingTask = await getTaskById(db, taskId, userId);
  if (!existingTask) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const updateData: Record<string, unknown> = {};

  if (body.type !== undefined) updateData.type = body.type;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.importance !== undefined) updateData.importance = body.importance;
  if (body.blocks !== undefined)
    updateData.blocks = JSON.stringify(body.blocks);
  if (body.scheduled !== undefined) updateData.scheduled = body.scheduled;
  if (body.startTime !== undefined) updateData.startTime = body.startTime;
  if (body.duration !== undefined) updateData.duration = body.duration;
  if (body.estimate !== undefined) updateData.estimate = body.estimate;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
  if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;

  await updateTask(db, taskId, userId, updateData);

  const updatedTask = await getTaskById(db, taskId, userId);

  return c.json({
    task: updatedTask
      ? {
          ...updatedTask,
          blocks: JSON.parse(updatedTask.blocks),
          scheduled: updatedTask.scheduled ?? false,
        }
      : null,
  });
});

// Delete task
taskRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const taskId = c.req.param('id');
  const db = c.get('db');

  const existingTask = await getTaskById(db, taskId, userId);
  if (!existingTask) {
    return c.json({ error: 'Task not found' }, 404);
  }

  await deleteTask(db, taskId, userId);

  return c.json({ success: true });
});

// Time session routes (nested under tasks)

// Get all sessions for a task
taskRoutes.get('/:taskId/sessions', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const taskId = c.req.param('taskId');
  const db = c.get('db');

  // Verify task belongs to user
  const hasAccess = await verifyTaskOwnership(db, taskId, userId);
  if (!hasAccess) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const sessions = await getSessionsByTaskId(db, taskId);

  return c.json({ sessions });
});

// Create session for a task
taskRoutes.post('/:taskId/sessions', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const taskId = c.req.param('taskId');
  const body = await c.req.json();
  const db = c.get('db');

  // Verify task belongs to user
  const hasAccess = await verifyTaskOwnership(db, taskId, userId);
  if (!hasAccess) {
    return c.json({ error: 'Task not found' }, 404);
  }

  if (typeof body.startTime !== 'number') {
    return c.json({ error: 'startTime is required' }, 400);
  }

  const session = await createTimeSession(db, taskId, {
    startTime: body.startTime,
    endTime: body.endTime,
  });

  return c.json({ session }, 201);
});

// Update session
taskRoutes.put('/:taskId/sessions/:sessionId', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const taskId = c.req.param('taskId');
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json();
  const db = c.get('db');

  // Verify task belongs to user
  const hasAccess = await verifyTaskOwnership(db, taskId, userId);
  if (!hasAccess) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const existingSession = await getSessionById(db, sessionId, taskId);
  if (!existingSession) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const updateData: { startTime?: number; endTime?: number } = {};
  if (body.startTime !== undefined) updateData.startTime = body.startTime;
  if (body.endTime !== undefined) updateData.endTime = body.endTime;

  await updateTimeSession(db, sessionId, taskId, updateData);

  const updatedSession = await getSessionById(db, sessionId, taskId);

  return c.json({ session: updatedSession });
});

// Delete session
taskRoutes.delete('/:taskId/sessions/:sessionId', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const taskId = c.req.param('taskId');
  const sessionId = c.req.param('sessionId');
  const db = c.get('db');

  // Verify task belongs to user
  const hasAccess = await verifyTaskOwnership(db, taskId, userId);
  if (!hasAccess) {
    return c.json({ error: 'Task not found' }, 404);
  }

  const existingSession = await getSessionById(db, sessionId, taskId);
  if (!existingSession) {
    return c.json({ error: 'Session not found' }, 404);
  }

  await deleteTimeSession(db, sessionId, taskId);

  return c.json({ success: true });
});
