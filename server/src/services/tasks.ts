import { eq, and, asc, or, inArray, isNull } from 'drizzle-orm';
import type { Database } from '../db';
import { tasks, users, type DbTask, type NewDbTask } from '../db/schema';

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
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
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
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        isNull(tasks.deletedAt)
      )
    )
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
    .update(tasks)
    .set({ deletedAt: Date.now() })
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
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.orderIndex));

  if (result.length === 0) {
    return -1;
  }

  return Math.max(...result.map((t) => t.orderIndex));
}

// Team-aware task queries

export interface TaskWithUsers extends DbTask {
  assigner: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  assignee: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
}

export interface TeamTaskFilters {
  teamId: string;
  assigneeIds?: string[];
  assignerIds?: string[];
}

/**
 * Get tasks for a team with visibility rules:
 * - Admin: sees ALL tasks in the team
 * - Member: sees tasks they created OR tasks assigned to them
 */
export async function getTasksByTeam(
  db: Database,
  userId: string,
  userRole: 'admin' | 'member',
  filters: TeamTaskFilters
): Promise<TaskWithUsers[]> {
  const { teamId, assigneeIds, assignerIds } = filters;

  // Build base conditions
  const conditions = [eq(tasks.teamId, teamId), isNull(tasks.deletedAt)];

  // Visibility rules
  if (userRole === 'member') {
    // Member sees tasks they created or tasks assigned to them
    conditions.push(
      or(eq(tasks.userId, userId), eq(tasks.assigneeId, userId))!
    );
  }

  // Apply filters
  if (assigneeIds && assigneeIds.length > 0) {
    conditions.push(inArray(tasks.assigneeId, assigneeIds));
  }
  if (assignerIds && assignerIds.length > 0) {
    conditions.push(inArray(tasks.userId, assignerIds));
  }

  // Create aliases for assigner and assignee joins
  const assignerAlias = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .as('assigner');

  const assigneeAlias = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .as('assignee');

  const result = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      teamId: tasks.teamId,
      assigneeId: tasks.assigneeId,
      type: tasks.type,
      title: tasks.title,
      status: tasks.status,
      importance: tasks.importance,
      blocks: tasks.blocks,
      scheduled: tasks.scheduled,
      startTime: tasks.startTime,
      duration: tasks.duration,
      estimate: tasks.estimate,
      dueDate: tasks.dueDate,
      blockedReason: tasks.blockedReason,
      timeOfDay: tasks.timeOfDay,
      tags: tasks.tags,
      resources: tasks.resources,
      orderIndex: tasks.orderIndex,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigner: {
        id: assignerAlias.id,
        name: assignerAlias.name,
        email: assignerAlias.email,
        avatarUrl: assignerAlias.avatarUrl,
      },
      assignee: {
        id: assigneeAlias.id,
        name: assigneeAlias.name,
        email: assigneeAlias.email,
        avatarUrl: assigneeAlias.avatarUrl,
      },
    })
    .from(tasks)
    .leftJoin(assignerAlias, eq(tasks.userId, assignerAlias.id))
    .leftJoin(assigneeAlias, eq(tasks.assigneeId, assigneeAlias.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.orderIndex));

  return result as TaskWithUsers[];
}

/**
 * Get a single task by ID with team visibility rules
 */
export async function getTaskByIdWithTeam(
  db: Database,
  taskId: string,
  userId: string,
  userRole: 'admin' | 'member',
  teamId: string
): Promise<TaskWithUsers | undefined> {
  const conditions = [
    eq(tasks.id, taskId),
    eq(tasks.teamId, teamId),
    isNull(tasks.deletedAt),
  ];

  // Visibility rules for members
  if (userRole === 'member') {
    conditions.push(
      or(eq(tasks.userId, userId), eq(tasks.assigneeId, userId))!
    );
  }

  const assignerAlias = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .as('assigner');

  const assigneeAlias = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .as('assignee');

  const result = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      teamId: tasks.teamId,
      assigneeId: tasks.assigneeId,
      type: tasks.type,
      title: tasks.title,
      status: tasks.status,
      importance: tasks.importance,
      blocks: tasks.blocks,
      scheduled: tasks.scheduled,
      startTime: tasks.startTime,
      duration: tasks.duration,
      estimate: tasks.estimate,
      dueDate: tasks.dueDate,
      blockedReason: tasks.blockedReason,
      timeOfDay: tasks.timeOfDay,
      tags: tasks.tags,
      resources: tasks.resources,
      orderIndex: tasks.orderIndex,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigner: {
        id: assignerAlias.id,
        name: assignerAlias.name,
        email: assignerAlias.email,
        avatarUrl: assignerAlias.avatarUrl,
      },
      assignee: {
        id: assigneeAlias.id,
        name: assigneeAlias.name,
        email: assigneeAlias.email,
        avatarUrl: assigneeAlias.avatarUrl,
      },
    })
    .from(tasks)
    .leftJoin(assignerAlias, eq(tasks.userId, assignerAlias.id))
    .leftJoin(assigneeAlias, eq(tasks.assigneeId, assigneeAlias.id))
    .where(and(...conditions))
    .limit(1);

  return result[0] as TaskWithUsers | undefined;
}

/**
 * Check if user can access a task (either as creator or assignee, or admin in team)
 */
export async function canAccessTask(
  db: Database,
  taskId: string,
  userId: string,
  userRole: 'admin' | 'member',
  teamId: string
): Promise<boolean> {
  const task = await getTaskByIdWithTeam(db, taskId, userId, userRole, teamId);
  return task !== undefined;
}

/**
 * Update a task with team context
 */
export async function updateTaskWithTeam(
  db: Database,
  taskId: string,
  userId: string,
  userRole: 'admin' | 'member',
  teamId: string,
  data: Partial<Omit<DbTask, 'id' | 'userId' | 'createdAt'>>
): Promise<boolean> {
  // First check access
  const canAccess = await canAccessTask(db, taskId, userId, userRole, teamId);
  if (!canAccess) {
    return false;
  }

  await db
    .update(tasks)
    .set({
      ...data,
      updatedAt: Date.now(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)));

  return true;
}

/**
 * Delete a task with team context
 */
export async function deleteTaskWithTeam(
  db: Database,
  taskId: string,
  userId: string,
  userRole: 'admin' | 'member',
  teamId: string
): Promise<boolean> {
  // First check access
  const canAccess = await canAccessTask(db, taskId, userId, userRole, teamId);
  if (!canAccess) {
    return false;
  }

  await db
    .update(tasks)
    .set({ deletedAt: Date.now() })
    .where(and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)));

  return true;
}

export async function getMaxOrderIndexForTeam(
  db: Database,
  teamId: string
): Promise<number> {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.teamId, teamId), isNull(tasks.deletedAt)))
    .orderBy(asc(tasks.orderIndex));

  if (result.length === 0) {
    return -1;
  }

  return Math.max(...result.map((t) => t.orderIndex));
}
