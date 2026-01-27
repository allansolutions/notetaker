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

// Teams
export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type DbTeam = typeof teams.$inferSelect;
export type NewDbTeam = typeof teams.$inferInsert;

// Team Members
export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey(),
  teamId: text('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  createdAt: integer('created_at').notNull(),
});

export type DbTeamMember = typeof teamMembers.$inferSelect;
export type NewDbTeamMember = typeof teamMembers.$inferInsert;

// Team Invites
export const teamInvites = sqliteTable('team_invites', {
  id: text('id').primaryKey(),
  teamId: text('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  invitedBy: text('invited_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  acceptedAt: integer('accepted_at'),
  createdAt: integer('created_at').notNull(),
});

export type DbTeamInvite = typeof teamInvites.$inferSelect;
export type NewDbTeamInvite = typeof teamInvites.$inferInsert;

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  teamId: text('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  assigneeId: text('assignee_id').references(() => users.id, {
    onDelete: 'set null',
  }),
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
  blockedReason: text('blocked_reason'),
  tags: text('tags').default('[]'),
  resources: text('resources').default('[]'),
  orderIndex: integer('order_index').notNull().default(0),
  deletedAt: integer('deleted_at'),
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
  activeTeamId: text('active_team_id').references(() => teams.id, {
    onDelete: 'set null',
  }),
  updatedAt: integer('updated_at').notNull(),
});

export type DbUserSettings = typeof userSettings.$inferSelect;
export type NewDbUserSettings = typeof userSettings.$inferInsert;

// Cross-module entity linking table
export const entityLinks = sqliteTable('entity_links', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sourceType: text('source_type').notNull(), // 'task' | 'contact' | 'company' | 'wiki-page'
  sourceId: text('source_id').notNull(),
  targetType: text('target_type').notNull(), // 'task' | 'contact' | 'company' | 'wiki-page'
  targetId: text('target_id').notNull(),
  createdAt: integer('created_at').notNull(),
});

export type DbEntityLink = typeof entityLinks.$inferSelect;
export type NewDbEntityLink = typeof entityLinks.$inferInsert;

// CRM - Companies
export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  street: text('street'),
  city: text('city'),
  country: text('country'),
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type DbCompany = typeof companies.$inferSelect;
export type NewDbCompany = typeof companies.$inferInsert;

// CRM - Contacts
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  linkedIn: text('linked_in'),
  instagram: text('instagram'),
  street: text('street'),
  city: text('city'),
  country: text('country'),
  companyId: text('company_id').references(() => companies.id, {
    onDelete: 'set null',
  }),
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type DbContact = typeof contacts.$inferSelect;
export type NewDbContact = typeof contacts.$inferInsert;

// Wiki - Pages
export const wikiPages = sqliteTable('wiki_pages', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default(''),
  slug: text('slug').notNull(),
  parentId: text('parent_id'),
  order: integer('order').notNull().default(0),
  icon: text('icon'),
  type: text('type'),
  category: text('category'),
  tags: text('tags').default('[]'),
  blocks: text('blocks').notNull().default('[]'),
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type DbWikiPage = typeof wikiPages.$inferSelect;
export type NewDbWikiPage = typeof wikiPages.$inferInsert;

// Webhook Tokens
export const webhookTokens = sqliteTable('webhook_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  token: text('token').notNull(),
  webhookSecret: text('webhook_secret'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type DbWebhookToken = typeof webhookTokens.$inferSelect;
export type NewDbWebhookToken = typeof webhookTokens.$inferInsert;

// Task Date Changes (delay tracking)
export const taskDateChanges = sqliteTable('task_date_changes', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  oldDueDate: integer('old_due_date').notNull(),
  newDueDate: integer('new_due_date').notNull(),
  changedAt: integer('changed_at').notNull(),
});

export type DbTaskDateChange = typeof taskDateChanges.$inferSelect;
export type NewDbTaskDateChange = typeof taskDateChanges.$inferInsert;
