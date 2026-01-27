import { eq, and, gte, lte } from 'drizzle-orm';
import type { Database } from '../db';
import { taskDateChanges, type DbTaskDateChange } from '../db/schema';

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `tdc-${timestamp}-${random}`;
}

export async function logDateChange(
  db: Database,
  params: {
    taskId: string;
    userId: string;
    oldDueDate: number;
    newDueDate: number;
  }
): Promise<void> {
  await db.insert(taskDateChanges).values({
    id: generateId(),
    taskId: params.taskId,
    userId: params.userId,
    oldDueDate: params.oldDueDate,
    newDueDate: params.newDueDate,
    changedAt: Date.now(),
  });
}

export async function getDateChangesByDateRange(
  db: Database,
  userId: string,
  start: number,
  end: number
): Promise<DbTaskDateChange[]> {
  return db
    .select()
    .from(taskDateChanges)
    .where(
      and(
        eq(taskDateChanges.userId, userId),
        gte(taskDateChanges.changedAt, start),
        lte(taskDateChanges.changedAt, end)
      )
    );
}
