import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import {
  userSettings,
  type DbUserSettings,
  type NewDbUserSettings,
} from '../db/schema';

export async function getUserSettings(
  db: Database,
  userId: string
): Promise<DbUserSettings | undefined> {
  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return result[0];
}

export async function createUserSettings(
  db: Database,
  userId: string,
  data?: Partial<Omit<NewDbUserSettings, 'userId' | 'updatedAt'>>
): Promise<DbUserSettings> {
  const now = Date.now();
  const values: NewDbUserSettings = {
    userId,
    theme: data?.theme ?? 'system',
    sidebarWidth: data?.sidebarWidth ?? 320,
    updatedAt: now,
  };

  await db.insert(userSettings).values(values);

  return values as DbUserSettings;
}

export async function updateUserSettings(
  db: Database,
  userId: string,
  data: Partial<Omit<DbUserSettings, 'userId' | 'updatedAt'>>
): Promise<void> {
  await db
    .update(userSettings)
    .set({
      ...data,
      updatedAt: Date.now(),
    })
    .where(eq(userSettings.userId, userId));
}

export async function getOrCreateUserSettings(
  db: Database,
  userId: string
): Promise<DbUserSettings> {
  const existing = await getUserSettings(db, userId);

  if (existing) {
    return existing;
  }

  return createUserSettings(db, userId);
}
