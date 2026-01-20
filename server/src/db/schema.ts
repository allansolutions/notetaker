import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  googleId: text('google_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  googleAccessToken: text('google_access_token').notNull(),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: integer('google_token_expiry'),
  googleEmail: text('google_email'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('admin'),
  title: text('title').notNull().default(''),
  status: text('status').notNull().default('todo'),
  importance: text('importance').notNull().default('mid'),
  blocks: text('blocks').notNull().default('[]'),
  scheduled: integer('scheduled', { mode: 'boolean' }).default(false),
  startTime: integer('start_time'),
  duration: integer('duration'),
  estimate: integer('estimate'),
  dueDate: integer('due_date'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type DbTask = typeof tasks.$inferSelect;
export type NewDbTask = typeof tasks.$inferInsert;

export const timeSessions = sqliteTable('time_sessions', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time'),
  createdAt: integer('created_at').notNull(),
});

export type DbTimeSession = typeof timeSessions.$inferSelect;
export type NewDbTimeSession = typeof timeSessions.$inferInsert;

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').default('system'),
  sidebarWidth: integer('sidebar_width').default(320),
  updatedAt: integer('updated_at').notNull(),
});

export type DbUserSettings = typeof userSettings.$inferSelect;
export type NewDbUserSettings = typeof userSettings.$inferInsert;
