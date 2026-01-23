import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDb } from './db';
import { authRoutes } from './routes/auth';
import { calendarRoutes } from './routes/calendar';
import { taskRoutes } from './routes/tasks';
import { settingsRoutes } from './routes/settings';
import { migrateRoutes } from './routes/migrate';
import { contactRoutes } from './routes/contacts';
import { companyRoutes } from './routes/companies';
import type { Env, Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.FRONTEND_URL,
    credentials: true,
  });
  return corsMiddleware(c, next);
});

app.use('*', async (c, next) => {
  c.set('db', createDb(c.env.DB));
  await next();
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

app.route('/auth', authRoutes);
app.route('/api/calendar', calendarRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/migrate', migrateRoutes);
app.route('/api/contacts', contactRoutes);
app.route('/api/companies', companyRoutes);

export default app;
