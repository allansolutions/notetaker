import { getCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';
import { getSession, updateSession, isTokenExpired } from '../services/session';
import { refreshAccessToken } from '../services/google-calendar';

export const requireAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const sessionId = getCookie(c, 'session');

  if (!sessionId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const db = c.get('db');
  const session = await getSession(db, sessionId);

  if (!session) {
    return c.json({ error: 'Session not found' }, 401);
  }

  if (isTokenExpired(session) && session.googleRefreshToken) {
    try {
      const tokens = await refreshAccessToken(
        session.googleRefreshToken,
        c.env.GOOGLE_CLIENT_ID,
        c.env.GOOGLE_CLIENT_SECRET
      );

      await updateSession(db, sessionId, {
        googleAccessToken: tokens.access_token,
        googleTokenExpiry: Date.now() + tokens.expires_in * 1000,
      });

      session.googleAccessToken = tokens.access_token;
    } catch {
      return c.json({ error: 'Failed to refresh token' }, 401);
    }
  } else if (isTokenExpired(session)) {
    return c.json({ error: 'Token expired, please re-authenticate' }, 401);
  }

  c.set('sessionId', sessionId);
  await next();
};
