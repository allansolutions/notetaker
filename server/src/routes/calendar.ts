import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import { getSession } from '../services/session';
import {
  fetchCalendarEvents,
  transformGoogleEvent,
  isDeclinedByUser,
} from '../services/google-calendar';

export const calendarRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

calendarRoutes.use('*', requireAuth);

calendarRoutes.get('/events', async (c) => {
  const date = c.req.query('date');
  const timezone = c.req.query('timezone') || 'UTC';
  const offset = c.req.query('offset') || '+00:00';

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, 400);
  }

  const sessionId = getCookie(c, 'session');
  if (!sessionId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const db = c.get('db');
  const session = await getSession(db, sessionId);

  if (!session) {
    return c.json({ error: 'Session not found' }, 401);
  }

  try {
    const googleEvents = await fetchCalendarEvents(
      session.googleAccessToken,
      date,
      timezone,
      offset
    );
    // Filter out events the user has declined
    const events = googleEvents
      .filter((event) => !isDeclinedByUser(event))
      .map(transformGoogleEvent);

    return c.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});
