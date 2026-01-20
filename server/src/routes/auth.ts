import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env, Variables } from '../types';
import {
  createSession,
  getSession,
  deleteSession,
  updateSession,
} from '../services/session';
import {
  buildOAuthUrl,
  exchangeCodeForTokens,
  getUserProfile,
  revokeToken,
} from '../services/google-calendar';
import { getOrCreateUser, getUserById } from '../services/user';
import { getUserSettings } from '../services/settings';

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

authRoutes.get('/google', (c) => {
  const redirectUri = new URL('/auth/callback', c.req.url).toString();
  const state = crypto.randomUUID();

  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 10,
    path: '/',
  });

  const authUrl = buildOAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri, state);
  return c.redirect(authUrl);
});

authRoutes.get('/callback', async (c) => {
  const { code, state, error } = c.req.query();
  const savedState = getCookie(c, 'oauth_state');

  deleteCookie(c, 'oauth_state');

  if (error) {
    return c.redirect(
      `${c.env.FRONTEND_URL}?auth_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state || state !== savedState) {
    return c.redirect(`${c.env.FRONTEND_URL}?auth_error=invalid_state`);
  }

  try {
    const redirectUri = new URL('/auth/callback', c.req.url).toString();
    const tokens = await exchangeCodeForTokens(
      code,
      c.env.GOOGLE_CLIENT_ID,
      c.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const profile = await getUserProfile(tokens.access_token);

    const db = c.get('db');

    // Create or get user
    const user = await getOrCreateUser(
      db,
      profile.id,
      profile.email,
      profile.name,
      profile.picture
    );

    // Create session linked to user
    const sessionId = await createSession(db, {
      userId: user.id,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleTokenExpiry: Date.now() + tokens.expires_in * 1000,
      googleEmail: profile.email,
    });

    setCookie(c, 'session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return c.redirect(c.env.FRONTEND_URL);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.redirect(
      `${c.env.FRONTEND_URL}?auth_error=${encodeURIComponent(message)}`
    );
  }
});

authRoutes.get('/status', async (c) => {
  const sessionId = getCookie(c, 'session');

  if (!sessionId) {
    return c.json({ isConnected: false });
  }

  const db = c.get('db');
  const session = await getSession(db, sessionId);

  if (!session) {
    deleteCookie(c, 'session');
    return c.json({ isConnected: false });
  }

  return c.json({
    isConnected: true,
    email: session.googleEmail,
  });
});

authRoutes.get('/me', async (c) => {
  const sessionId = getCookie(c, 'session');

  if (!sessionId) {
    return c.json({ user: null }, 401);
  }

  const db = c.get('db');
  const session = await getSession(db, sessionId);

  if (!session || !session.userId) {
    deleteCookie(c, 'session');
    return c.json({ user: null }, 401);
  }

  const user = await getUserById(db, session.userId);

  if (!user) {
    deleteCookie(c, 'session');
    return c.json({ user: null }, 401);
  }

  const settings = await getUserSettings(db, user.id);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    settings: settings
      ? {
          theme: settings.theme,
          sidebarWidth: settings.sidebarWidth,
        }
      : null,
  });
});

authRoutes.post('/logout', async (c) => {
  const sessionId = getCookie(c, 'session');

  if (sessionId) {
    const db = c.get('db');
    const session = await getSession(db, sessionId);

    if (session) {
      try {
        await revokeToken(session.googleAccessToken);
      } catch {
        // Ignore revocation errors
      }
      await deleteSession(db, sessionId);
    }
  }

  deleteCookie(c, 'session');
  return c.json({ success: true });
});
