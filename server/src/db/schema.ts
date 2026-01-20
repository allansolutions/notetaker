import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  googleAccessToken: text('google_access_token').notNull(),
  googleRefreshToken: text('google_refresh_token'),
  googleTokenExpiry: integer('google_token_expiry'),
  googleEmail: text('google_email'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
