import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import { getDateChangesByDateRange } from '../services/task-date-changes';

export const analyticsRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

analyticsRoutes.use('*', requireAuth);

analyticsRoutes.get('/date-changes', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const start = Number(c.req.query('start'));
  const end = Number(c.req.query('end'));

  if (!start || !end || isNaN(start) || isNaN(end)) {
    return c.json({ error: 'start and end query params required' }, 400);
  }

  const db = c.get('db');
  const changes = await getDateChangesByDateRange(db, userId, start, end);

  return c.json({
    changes: changes.map((ch) => ({
      id: ch.id,
      taskId: ch.taskId,
      oldDueDate: ch.oldDueDate,
      newDueDate: ch.newDueDate,
      changedAt: ch.changedAt,
    })),
  });
});
