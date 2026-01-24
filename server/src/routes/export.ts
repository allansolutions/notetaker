import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import { getTasksByUserId } from '../services/tasks';
import { getSessionsByTaskId } from '../services/time-sessions';
import { getWikiPagesByUserId } from '../services/wiki';
import { getContactsByUserId } from '../services/contacts';
import { getCompaniesByUserId } from '../services/companies';
import { getEntityLinksByUserId } from '../services/entity-links';

export const exportRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

exportRoutes.use('*', requireAuth);

// Export all user data
exportRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');

  // Fetch all data in parallel
  const [tasks, wikiPages, contacts, companies, entityLinks] =
    await Promise.all([
      getTasksByUserId(db, userId),
      getWikiPagesByUserId(db, userId),
      getContactsByUserId(db, userId),
      getCompaniesByUserId(db, userId),
      getEntityLinksByUserId(db, userId),
    ]);

  // Fetch time sessions for each task
  const tasksWithSessions = await Promise.all(
    tasks.map(async (task) => {
      const sessions = await getSessionsByTaskId(db, task.id);
      return {
        ...task,
        blocks: JSON.parse(task.blocks),
        sessions,
      };
    })
  );

  // Transform wiki pages (parse blocks JSON)
  const wikiPagesTransformed = wikiPages.map((page) => ({
    ...page,
    blocks: JSON.parse(page.blocks),
  }));

  const exportData = {
    exportedAt: Date.now(),
    version: '1.0',
    tasks: tasksWithSessions,
    wikiPages: wikiPagesTransformed,
    crm: {
      contacts,
      companies,
    },
    entityLinks,
  };

  return c.json(exportData);
});
