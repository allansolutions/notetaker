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
    // Team-based query with visibility rules
    const isMember = await isTeamMember(db, teamId, userId);
    if (!isMember) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const userRole = await getUserRole(db, teamId, userId);
    if (!userRole) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const teamTasks = await getTasksByTeam(db, userId, userRole, {
      teamId,
      assigneeIds: assigneeIds?.length ? assigneeIds : undefined,
      assignerIds: assignerIds?.length ? assignerIds : undefined,
    });

    // Transform DB tasks to frontend format
    const transformed = teamTasks.map((task) => ({
      ...task,
      blocks: JSON.parse(task.blocks),
      scheduled: task.scheduled ?? false,
      tags: task.tags ? JSON.parse(task.tags) : [],
      resources: task.resources ? JSON.parse(task.resources) : [],
    }));

    return c.json({ tasks: transformed });
  }

  // Legacy: personal tasks (no team)
  const tasks = await getTasksByUserId(db, userId);

  // Transform DB tasks to frontend format
  const transformed = tasks.map((task) => ({
    ...task,
    blocks: JSON.parse(task.blocks),
    scheduled: task.scheduled ?? false,
    tags: task.tags ? JSON.parse(task.tags) : [],
    resources: task.resources ? JSON.parse(task.resources) : [],
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
  const teamId = c.req.query('teamId');
  const db = c.get('db');

  if (teamId) {
    // Team-based query with visibility rules
    const isMember = await isTeamMember(db, teamId, userId);
    if (!isMember) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const userRole = await getUserRole(db, teamId, userId);
    if (!userRole) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const task = await getTaskByIdWithTeam(
      db,
      taskId,
      userId,
      userRole,
      teamId
    );
    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json({
      task: {
        ...task,
        blocks: JSON.parse(task.blocks),
        scheduled: task.scheduled ?? false,
        tags: task.tags ? JSON.parse(task.tags) : [],
        resources: task.resources ? JSON.parse(task.resources) : [],
      },
    });
  }

  // Legacy: personal task
  const task = await getTaskById(db, taskId, userId);

  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }

  return c.json({
    task: {
      ...task,
      blocks: JSON.parse(task.blocks),
      scheduled: task.scheduled ?? false,
      tags: task.tags ? JSON.parse(task.tags) : [],
      resources: task.resources ? JSON.parse(task.resources) : [],
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

  // If teamId is provided, verify membership and get order index for team
  let maxOrder: number;
  if (body.teamId) {
    const isMember = await isTeamMember(db, body.teamId, userId);
    if (!isMember) {
      return c.json({ error: 'Team not found' }, 404);
    }

    // If assigneeId is provided, verify they are a team member
    if (body.assigneeId) {
      const isAssigneeMember = await isTeamMember(
        db,
        body.teamId,
        body.assigneeId
      );
      if (!isAssigneeMember) {
        return c.json({ error: 'Assignee is not a team member' }, 400);
      }
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
        ...task,
        blocks: JSON.parse(task.blocks),
        scheduled: task.scheduled ?? false,
        tags: task.tags ? JSON.parse(task.tags) : [],
        resources: task.resources ? JSON.parse(task.resources) : [],
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
  if (body.blockedReason !== undefined)
    updateData.blockedReason = body.blockedReason;
  if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
  if (body.resources !== undefined)
    updateData.resources = JSON.stringify(body.resources);
  if (body.timeOfDay !== undefined) updateData.timeOfDay = body.timeOfDay;
  if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
  if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;

  if (teamId) {
    // Team-based update with visibility rules
    const isMember = await isTeamMember(db, teamId, userId);
    if (!isMember) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const userRole = await getUserRole(db, teamId, userId);
    if (!userRole) {
      return c.json({ error: 'Team not found' }, 404);
    }

    // If updating assigneeId, verify they are a team member
    if (body.assigneeId) {
      const isAssigneeMember = await isTeamMember(db, teamId, body.assigneeId);
      if (!isAssigneeMember) {
        return c.json({ error: 'Assignee is not a team member' }, 400);
      }
    }

    // Fetch existing task to detect due date changes
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

    if (!success) {
      return c.json({ error: 'Task not found' }, 404);
    }

    // Log date change if dueDate was modified and both old/new are non-null
    if (
      existingTeamTask &&
      body.dueDate !== undefined &&
      existingTeamTask.dueDate != null &&
      body.dueDate != null &&
      existingTeamTask.dueDate !== body.dueDate
    ) {
      await logDateChange(db, {
        taskId,
        userId,
        oldDueDate: existingTeamTask.dueDate,
        newDueDate: body.dueDate,
      });
    }

    const updatedTask = await getTaskByIdWithTeam(
      db,
      taskId,
      userId,
      userRole,
      teamId
    );

    return c.json({
      task: updatedTask
        ? {
            ...updatedTask,
            blocks: JSON.parse(updatedTask.blocks),
            scheduled: updatedTask.scheduled ?? false,
            tags: updatedTask.tags ? JSON.parse(updatedTask.tags) : [],
            resources: updatedTask.resources
              ? JSON.parse(updatedTask.resources)
              : [],
          }
        : null,
    });
  }

  // Legacy: personal task
  const existingTask = await getTaskById(db, taskId, userId);
  if (!existingTask) {
    return c.json({ error: 'Task not found' }, 404);
  }

  await updateTask(db, taskId, userId, updateData);

  // Log date change if dueDate was modified and both old/new are non-null
  if (
    body.dueDate !== undefined &&
    existingTask.dueDate != null &&
    body.dueDate != null &&
    existingTask.dueDate !== body.dueDate
  ) {
    await logDateChange(db, {
      taskId,
      userId,
      oldDueDate: existingTask.dueDate,
      newDueDate: body.dueDate,
    });
  }

  const updatedTask = await getTaskById(db, taskId, userId);

  return c.json({
    task: updatedTask
      ? {
          ...updatedTask,
          blocks: JSON.parse(updatedTask.blocks),
          scheduled: updatedTask.scheduled ?? false,
          tags: updatedTask.tags ? JSON.parse(updatedTask.tags) : [],
          resources: updatedTask.resources
            ? JSON.parse(updatedTask.resources)
            : [],
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
  const teamId = c.req.query('teamId');
  const db = c.get('db');

  if (teamId) {
    // Team-based delete with visibility rules
    const isMember = await isTeamMember(db, teamId, userId);
    if (!isMember) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const userRole = await getUserRole(db, teamId, userId);
    if (!userRole) {
      return c.json({ error: 'Team not found' }, 404);
    }

    const success = await deleteTaskWithTeam(
      db,
      taskId,
      userId,
      userRole,
      teamId
    );

    if (!success) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json({ success: true });
  }

  // Legacy: personal task
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
