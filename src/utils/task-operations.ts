import {
  Task,
  TaskType,
  TaskStatus,
  TaskImportance,
  Block,
  TimeSession,
  AGENDA_START_HOUR,
  DEFAULT_DURATION,
} from '../types';

let taskIdCounter = Date.now();

export function generateTaskId(): string {
  return `task-${taskIdCounter++}`;
}

export function createTask(
  title: string = '',
  type: TaskType = 'admin',
  status: TaskStatus = 'todo',
  importance: TaskImportance = 'mid'
): Task {
  const now = Date.now();
  return {
    id: generateTaskId(),
    type,
    title,
    status,
    importance,
    blocks: [],
    startTime: AGENDA_START_HOUR * 60, // Start at beginning of agenda
    duration: DEFAULT_DURATION,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTask(task: Task, updates: Partial<Task>): Task {
  return {
    ...task,
    ...updates,
    updatedAt: Date.now(),
  };
}

export function getScheduledTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.startTime !== undefined);
}

export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}

export function reorderTasks(
  tasks: Task[],
  fromIndex: number,
  toIndex: number
): Task[] {
  const newTasks = [...tasks];
  const [removed] = newTasks.splice(fromIndex, 1);
  newTasks.splice(toIndex, 0, removed);
  return newTasks;
}

export function updateTaskBlocks(task: Task, blocks: Block[]): Task {
  return {
    ...task,
    blocks,
    updatedAt: Date.now(),
  };
}

let sessionIdCounter = Date.now();

export function generateSessionId(): string {
  return `session-${sessionIdCounter++}`;
}

/**
 * Calculate total time spent across completed sessions only.
 * Sessions without endTime (active sessions) are ignored.
 */
export function computeTimeSpent(sessions: TimeSession[]): number {
  return sessions.reduce((total, session) => {
    if (session.endTime) {
      return total + (session.endTime - session.startTime);
    }
    return total;
  }, 0);
}

/**
 * Calculate total time spent across all sessions.
 * For active sessions (no endTime), uses the current time.
 */
export function computeTimeSpentWithActive(
  sessions: TimeSession[] | undefined
): number {
  if (!sessions || sessions.length === 0) return 0;
  return sessions.reduce((total, session) => {
    const end = session.endTime ?? Date.now();
    return total + (end - session.startTime);
  }, 0);
}

/**
 * Format a number of minutes as a human-readable string (e.g., "1h 30m", "45m").
 */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
