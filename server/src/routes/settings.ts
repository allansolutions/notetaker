import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  getUserSettings,
  getOrCreateUserSettings,
  updateUserSettings,
} from '../services/settings';

export const settingsRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

settingsRoutes.use('*', requireAuth);

// Get user settings
settingsRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');
  const settings = await getOrCreateUserSettings(db, userId);

  return c.json({
    settings: {
      theme: settings.theme,
      sidebarWidth: settings.sidebarWidth,
    },
  });
});

// Update user settings
settingsRoutes.put('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  const db = c.get('db');

  // Ensure settings exist
  await getOrCreateUserSettings(db, userId);

  const updateData: { theme?: string; sidebarWidth?: number } = {};
  if (body.theme !== undefined) updateData.theme = body.theme;
  if (body.sidebarWidth !== undefined)
    updateData.sidebarWidth = body.sidebarWidth;

  await updateUserSettings(db, userId, updateData);

  const settings = await getUserSettings(db, userId);

  return c.json({
    settings: settings
      ? {
          theme: settings.theme,
          sidebarWidth: settings.sidebarWidth,
        }
      : null,
  });
});
