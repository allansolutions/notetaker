import { eq, and, asc } from 'drizzle-orm';
import type { Database } from '../db';
import { tasks, type DbTask, type NewDbTask } from '../db/schema';

export function generateTaskId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

export async function getTasksByUserId(
  db: Database,
  userId: string
): Promise<DbTask[]> {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.orderIndex));
}

export async function getTaskById(
  db: Database,
  taskId: string,
  userId: string
): Promise<DbTask | undefined> {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  return result[0];
}

export async function createTask(
  db: Database,
  userId: string,
  data: Omit<NewDbTask, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<DbTask> {
  const id = generateTaskId();
  const now = Date.now();

  const values: NewDbTask = {
    id,
    userId,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(tasks).values(values);

  return values as DbTask;
}

export async function updateTask(
  db: Database,
  taskId: string,
  userId: string,
  data: Partial<Omit<DbTask, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  await db
    .update(tasks)
    .set({
      ...data,
      updatedAt: Date.now(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function deleteTask(
  db: Database,
  taskId: string,
  userId: string
): Promise<void> {
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function reorderTasks(
  db: Database,
  userId: string,
  taskOrders: Array<{ id: string; orderIndex: number }>
): Promise<void> {
  const now = Date.now();

  // Update each task's order in a batch
  for (const { id, orderIndex } of taskOrders) {
    await db
      .update(tasks)
      .set({ orderIndex, updatedAt: now })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  }
}

export async function getMaxOrderIndex(
  db: Database,
  userId: string
): Promise<number> {
  const result = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.orderIndex));

  if (result.length === 0) {
    return -1;
  }

  return Math.max(...result.map((t) => t.orderIndex));
}
