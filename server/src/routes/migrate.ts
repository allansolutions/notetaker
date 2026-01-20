import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import { createTask, getTasksByUserId } from '../services/tasks';
import { createTimeSessions } from '../services/time-sessions';
import {
  updateUserSettings,
  getOrCreateUserSettings,
} from '../services/settings';

interface LocalStorageTask {
  id: string;
  type: string;
  title: string;
  status: string;
  importance: string;
  blocks: Array<{ id: string; type: string; content: string }>;
  scheduled?: boolean;
  startTime?: number;
  duration?: number;
  estimate?: number;
  sessions?: Array<{ id: string; startTime: number; endTime?: number }>;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
}

interface MigrationPayload {
  tasks: LocalStorageTask[];
  settings?: {
    theme?: string;
    sidebarWidth?: number;
  };
}

export const migrateRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

migrateRoutes.use('*', requireAuth);

// Import localStorage data
migrateRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = (await c.req.json()) as MigrationPayload;
  const db = c.get('db');

  // Check if user already has tasks
  const existingTasks = await getTasksByUserId(db, userId);
  if (existingTasks.length > 0) {
    return c.json(
      {
        error:
          'Cannot migrate: user already has tasks. Migration is only allowed for new accounts.',
      },
      400
    );
  }

  const importedTasks: Array<{ localId: string; serverId: string }> = [];

  // Import tasks
  for (let i = 0; i < body.tasks.length; i++) {
    const localTask = body.tasks[i];

    const task = await createTask(db, userId, {
      type: localTask.type,
      title: localTask.title,
      status: localTask.status,
      importance: localTask.importance,
      blocks: JSON.stringify(localTask.blocks),
      scheduled: localTask.scheduled ?? false,
      startTime: localTask.startTime,
      duration: localTask.duration,
      estimate: localTask.estimate,
      dueDate: localTask.dueDate,
      orderIndex: i,
    });

    importedTasks.push({ localId: localTask.id, serverId: task.id });

    // Import time sessions for this task
    if (localTask.sessions && localTask.sessions.length > 0) {
      await createTimeSessions(
        db,
        task.id,
        localTask.sessions.map((s) => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      );
    }
  }

  // Import settings
  if (body.settings) {
    await getOrCreateUserSettings(db, userId);
    await updateUserSettings(db, userId, {
      theme: body.settings.theme,
      sidebarWidth: body.settings.sidebarWidth,
    });
  }

  return c.json({
    success: true,
    imported: {
      tasks: importedTasks.length,
      idMapping: importedTasks,
    },
  });
});
