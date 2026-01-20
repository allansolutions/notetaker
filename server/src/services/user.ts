import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { users, type User, type NewUser } from '../db/schema';

export function generateUserId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createUser(
  db: Database,
  data: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>
): Promise<User> {
  const id = generateUserId();
  const now = Date.now();

  const values = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(users).values(values);

  return { ...values } as User;
}

export async function getUserById(
  db: Database,
  userId: string
): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getUserByGoogleId(
  db: Database,
  googleId: string
): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);

  return result[0];
}

export async function getUserByEmail(
  db: Database,
  email: string
): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0];
}

export async function updateUser(
  db: Database,
  userId: string,
  data: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<void> {
  await db
    .update(users)
    .set({
      ...data,
      updatedAt: Date.now(),
    })
    .where(eq(users.id, userId));
}

export async function getOrCreateUser(
  db: Database,
  googleId: string,
  email: string,
  name?: string,
  avatarUrl?: string
): Promise<User> {
  const existingUser = await getUserByGoogleId(db, googleId);

  if (existingUser) {
    // Update user info if it changed
    if (
      existingUser.email !== email ||
      existingUser.name !== name ||
      existingUser.avatarUrl !== avatarUrl
    ) {
      await updateUser(db, existingUser.id, { email, name, avatarUrl });
      return {
        ...existingUser,
        email,
        name: name ?? existingUser.name,
        avatarUrl: avatarUrl ?? existingUser.avatarUrl,
        updatedAt: Date.now(),
      };
    }
    return existingUser;
  }

  return createUser(db, { googleId, email, name, avatarUrl });
}
