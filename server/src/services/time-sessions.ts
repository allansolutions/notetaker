import { eq, and, or, isNull } from 'drizzle-orm';
import type { Database } from '../db';
import {
  timeSessions,
  tasks,
  teamMembers,
  type DbTimeSession,
  type NewDbTimeSession,
} from '../db/schema';

export function generateTimeSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ts-${timestamp}-${random}`;
}

export async function getSessionsByTaskId(
  db: Database,
  taskId: string
): Promise<DbTimeSession[]> {
  return db.select().from(timeSessions).where(eq(timeSessions.taskId, taskId));
}

export async function getSessionById(
  db: Database,
  sessionId: string,
  taskId: string
): Promise<DbTimeSession | undefined> {
  const result = await db
    .select()
    .from(timeSessions)
    .where(and(eq(timeSessions.id, sessionId), eq(timeSessions.taskId, taskId)))
    .limit(1);

  return result[0];
}

export async function createTimeSession(
  db: Database,
  taskId: string,
  data: Omit<NewDbTimeSession, 'id' | 'taskId' | 'createdAt'>
): Promise<DbTimeSession> {
  const id = generateTimeSessionId();
  const now = Date.now();

  const values: NewDbTimeSession = {
    id,
    taskId,
    startTime: data.startTime,
    endTime: data.endTime,
    createdAt: now,
  };

  await db.insert(timeSessions).values(values);

  return values as DbTimeSession;
}

export async function updateTimeSession(
  db: Database,
  sessionId: string,
  taskId: string,
  data: Partial<Pick<DbTimeSession, 'startTime' | 'endTime'>>
): Promise<void> {
  await db
    .update(timeSessions)
    .set(data)
    .where(
      and(eq(timeSessions.id, sessionId), eq(timeSessions.taskId, taskId))
    );
}

export async function deleteTimeSession(
  db: Database,
  sessionId: string,
  taskId: string
): Promise<void> {
  await db
    .delete(timeSessions)
    .where(
      and(eq(timeSessions.id, sessionId), eq(timeSessions.taskId, taskId))
    );
}

// Verify that user has access to task before allowing session operations
// Access is granted if user is: task creator, assignee, or team member
export async function verifyTaskOwnership(
  db: Database,
  taskId: string,
  userId: string
): Promise<boolean> {
  // First, get the task to check ownership, assignee, and team
  const taskResult = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      assigneeId: tasks.assigneeId,
      teamId: tasks.teamId,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (taskResult.length === 0) {
    return false;
  }

  const task = taskResult[0];

  // Check if user is the task creator
  if (task.userId === userId) {
    return true;
  }

  // Check if user is the assignee
  if (task.assigneeId === userId) {
    return true;
  }

  // Check if user is a member of the task's team
  if (task.teamId) {
    const memberResult = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, task.teamId), eq(teamMembers.userId, userId))
      )
      .limit(1);

    if (memberResult.length > 0) {
      return true;
    }
  }

  return false;
}

// Batch create sessions (useful for migration)
export async function createTimeSessions(
  db: Database,
  taskId: string,
  sessions: Array<Omit<NewDbTimeSession, 'taskId' | 'createdAt'>>
): Promise<DbTimeSession[]> {
  const now = Date.now();

  const values = sessions.map((session) => ({
    id: session.id ?? generateTimeSessionId(),
    taskId,
    startTime: session.startTime,
    endTime: session.endTime,
    createdAt: now,
  }));

  if (values.length > 0) {
    await db.insert(timeSessions).values(values);
  }

  return values as DbTimeSession[];
}
