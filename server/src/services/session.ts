import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { sessions, type Session, type NewSession } from '../db/schema';

export function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession(
  db: Database,
  data: Omit<NewSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateSessionId();
  const now = Date.now();

  await db.insert(sessions).values({
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function getSession(
  db: Database,
  sessionId: string
): Promise<Session | undefined> {
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  return result[0];
}

export async function updateSession(
  db: Database,
  sessionId: string,
  data: Partial<Omit<Session, 'id' | 'createdAt'>>
): Promise<void> {
  await db
    .update(sessions)
    .set({
      ...data,
      updatedAt: Date.now(),
    })
    .where(eq(sessions.id, sessionId));
}

export async function deleteSession(
  db: Database,
  sessionId: string
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function isTokenExpired(session: Session): boolean {
  return !session.googleTokenExpiry || Date.now() >= session.googleTokenExpiry;
}
