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
  getTasksByTeam,
  getTaskByIdWithTeam,
  updateTaskWithTeam,
  deleteTaskWithTeam,
  getMaxOrderIndexForTeam,
} from '../services/tasks';
import { isTeamMember, getUserRole } from '../services/teams';
import { getUserById } from '../services/user';
import {
  getSessionsByTaskId,
  getSessionById,
  createTimeSession,
  updateTimeSession,
  deleteTimeSession,
  verifyTaskOwnership,
} from '../services/time-sessions';
import { logDateChange } from '../services/task-date-changes';
import type { Database } from '../db';

function transformTask<
  T extends {
    blocks: string;
    scheduled: boolean | null;
    tags: string | null;
    resources: string | null;
  },
>(task: T) {
  return {
    ...task,
    blocks: JSON.parse(task.blocks),
    scheduled: task.scheduled ?? false,
    tags: task.tags ? JSON.parse(task.tags) : [],
    resources: task.resources ? JSON.parse(task.resources) : [],
  };
}

/** Verify team membership and return the user's role, or null if unauthorized. */
async function verifyTeamAccess(db: Database, teamId: string, userId: string) {
  const isMember = await isTeamMember(db, teamId, userId);
  if (!isMember) return null;
  return getUserRole(db, teamId, userId);
}

/** Log a due date change if the date actually changed and both old/new are non-null. */
async function logDateChangeIfNeeded(
  db: Database,
  taskId: string,
  userId: string,
  oldDueDate: number | null | undefined,
  newDueDate: number | null | undefined
) {
  if (
    newDueDate !== undefined &&
    oldDueDate != null &&
    newDueDate != null &&
    oldDueDate !== newDueDate
  ) {
    await logDateChange(db, { taskId, userId, oldDueDate, newDueDate });
  }
}

export const taskRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

taskRoutes.use('*', requireAuth);

// Get all tasks for user (with optional team filtering)
taskRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');

  // Check for team filter
  const teamId = c.req.query('teamId');
  const assigneeIds = c.req.queries('assigneeId');
  const assignerIds = c.req.queries('assignerId');

  if (teamId) {
    const userRole = await verifyTeamAccess(db, teamId, userId);
    if (!userRole) return c.json({ error: 'Team not found' }, 404);

    const teamTasks = await getTasksByTeam(db, userId, userRole, {
      teamId,
      assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
      assignerIds: assignerIds?.length ? assignerIds : undefined,
    });

    return c.json({ tasks: teamTasks.map(transformTask) });
  }

  const tasks = await getTasksByUserId(db, userId);
  return c.json({ tasks: tasks.map(transformTask) });
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
  const teamId = c.req.query('teamId');
  const db = c.get('db');

  if (teamId) {
    const userRole = await verifyTeamAccess(db, teamId, userId);
    if (!userRole) return c.json({ error: 'Team not found' }, 404);

    const task = await getTaskByIdWithTeam(
      db,
      taskId,
      userId,
      userRole,
      teamId
    );
    if (!task) return c.json({ error: 'Task not found' }, 404);

    return c.json({ task: transformTask(task) });
  }

  const task = await getTaskById(db, taskId, userId);
  if (!task) return c.json({ error: 'Task not found' }, 404);

  return c.json({ task: transformTask(task) });
});

// Create task
taskRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const db = c.get('db');

  let maxOrder: number;
  if (body.teamId) {
    const teamRole = await verifyTeamAccess(db, body.teamId, userId);
    if (!teamRole) return c.json({ error: 'Team not found' }, 404);

    if (body.assigneeId) {
      const isAssigneeMember = await isTeamMember(
        db,
        body.teamId,
        body.assigneeId
      );
      if (!isAssigneeMember)
        return c.json({ error: 'Assignee is not a team member' }, 400);
    }

    maxOrder = await getMaxOrderIndexForTeam(db, body.teamId);
  } else {
    maxOrder = await getMaxOrderIndex(db, userId);
  }

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
    blockedReason: body.blockedReason,
    timeOfDay: body.timeOfDay ?? null,
    tags: JSON.stringify(body.tags ?? []),
    resources: JSON.stringify(body.resources ?? []),
    orderIndex: body.orderIndex ?? maxOrder + 1,
    teamId: body.teamId ?? null,
    assigneeId: body.assigneeId ?? null,
  });

  const [assigner, assignee] = await Promise.all([
    getUserById(db, userId),
    task.assigneeId ? getUserById(db, task.assigneeId) : undefined,
  ]);

  const toUserObj = (u: typeof assigner) =>
    u
      ? { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl }
      : null;

  return c.json(
    {
      task: {
        ...transformTask(task),
        assigner: toUserObj(assigner),
        assignee: toUserObj(assignee),
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
  const teamId = c.req.query('teamId');
  const body = await c.req.json();
  const db = c.get('db');

  // Fields that require JSON serialization
  const jsonFields = { blocks: true, tags: true, resources: true } as const;
  const allowedFields = [
    'type',
    'title',
    'status',
    'importance',
    'blocks',
    'scheduled',
    'startTime',
    'duration',
    'estimate',
    'dueDate',
    'blockedReason',
    'tags',
    'resources',
    'timeOfDay',
    'orderIndex',
    'assigneeId',
  ] as const;

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] =
        field in jsonFields ? JSON.stringify(body[field]) : body[field];
    }
  }

  if (teamId) {
    const userRole = await verifyTeamAccess(db, teamId, userId);
    if (!userRole) return c.json({ error: 'Team not found' }, 404);

    if (body.assigneeId) {
      const isAssigneeMember = await isTeamMember(db, teamId, body.assigneeId);
      if (!isAssigneeMember)
        return c.json({ error: 'Assignee is not a team member' }, 400);
    }

    const existingTeamTask = await getTaskByIdWithTeam(
      db,
      taskId,
      userId,
      userRole,
      teamId
    );
    const success = await updateTaskWithTeam(
      db,
      taskId,
      userId,
      userRole,
      teamId,
      updateData
    );
    if (!success) return c.json({ error: 'Task not found' }, 404);

    await logDateChangeIfNeeded(
      db,
      taskId,
      userId,
      existingTeamTask?.dueDate,
      body.dueDate
    );

    const updatedTask = await getTaskByIdWithTeam(
      db,
      taskId,
      userId,
      userRole,
      teamId
    );
    return c.json({ task: updatedTask ? transformTask(updatedTask) : null });
  }

  const existingTask = await getTaskById(db, taskId, userId);
  if (!existingTask) return c.json({ error: 'Task not found' }, 404);

  await updateTask(db, taskId, userId, updateData);
  await logDateChangeIfNeeded(
    db,
    taskId,
    userId,
    existingTask.dueDate,
    body.dueDate
  );

  const updatedTask = await getTaskById(db, taskId, userId);
  return c.json({ task: updatedTask ? transformTask(updatedTask) : null });
});

// Delete task
taskRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const taskId = c.req.param('id');
  const teamId = c.req.query('teamId');
  const db = c.get('db');

  if (teamId) {
    const userRole = await verifyTeamAccess(db, teamId, userId);
    if (!userRole) return c.json({ error: 'Team not found' }, 404);

    const success = await deleteTaskWithTeam(
      db,
      taskId,
      userId,
      userRole,
      teamId
    );
    if (!success) return c.json({ error: 'Task not found' }, 404);

    return c.json({ success: true });
  }

  const existingTask = await getTaskById(db, taskId, userId);
  if (!existingTask) return c.json({ error: 'Task not found' }, 404);

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
