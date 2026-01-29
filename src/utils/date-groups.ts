import { getWeekEnd, getWeekStart, isOnDate, startOfDay } from './date-filters';
import type { Task } from '../types';

export const MAX_TASKS_PER_DAY = 8;

export type DateGroup =
  | 'past'
  | 'last-week'
  | 'today'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
  | 'next-week'
  | 'future'
  | 'no-date';

const DAY_GROUPS: DateGroup[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Get the date group for a task's due date
 */
export function getDateGroup(
  dueDate: number | undefined,
  now: Date = new Date()
): DateGroup {
  if (dueDate === undefined) {
    return 'no-date';
  }

  const today = startOfDay(now);
  const taskDate = startOfDay(new Date(dueDate));
  const taskTime = taskDate.getTime();
  const todayTime = today.getTime();

  // Check if it's today
  if (isOnDate(dueDate, now)) {
    return 'today';
  }

  // Check if it's in the past
  if (taskTime < todayTime) {
    return 'past';
  }

  // Check if it's within this week (after today)
  const weekEnd = getWeekEnd(now);
  if (taskTime <= weekEnd.getTime()) {
    // Return the specific day of the week
    const dayOfWeek = taskDate.getDay();
    // Convert 0 (Sunday) to 6, otherwise subtract 1 to get 0-based Monday index
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return DAY_GROUPS[dayIndex];
  }

  // Check if it's within next week
  const nextWeekEnd = new Date(weekEnd);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
  if (taskTime <= nextWeekEnd.getTime()) {
    return 'next-week';
  }

  // It's in the future (after next week)
  return 'future';
}

/**
 * Get the date group for a task in the archive view.
 * Groups into: today, individual days of the current week, last week, and past (before last week).
 */
export function getArchiveDateGroup(
  dueDate: number | undefined,
  now: Date = new Date()
): DateGroup {
  if (dueDate === undefined) {
    return 'no-date';
  }

  const today = startOfDay(now);
  const taskDate = startOfDay(new Date(dueDate));
  const taskTime = taskDate.getTime();
  const todayTime = today.getTime();

  // Check if it's today
  if (isOnDate(dueDate, now)) {
    return 'today';
  }

  // Get this week's boundaries (Monday-Sunday)
  const thisMonday = getWeekStart(now);
  const thisMondayTime = thisMonday.getTime();
  const thisWeekEnd = getWeekEnd(now);
  const thisWeekEndTime = thisWeekEnd.getTime();

  // This week (any day other than today)
  if (taskTime >= thisMondayTime && taskTime <= thisWeekEndTime) {
    const dayOfWeek = taskDate.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return DAY_GROUPS[dayIndex];
  }

  // Last week (previous Monday through previous Sunday)
  const lastMonday = new Date(thisMondayTime);
  lastMonday.setDate(lastMonday.getDate() - 7);
  if (taskTime >= lastMonday.getTime() && taskTime < thisMondayTime) {
    return 'last-week';
  }

  // Before last week
  if (taskTime < todayTime) {
    return 'past';
  }

  // After this week (uncommon for archive)
  return 'future';
}

/**
 * Get human-readable label for a date group
 */
export function getGroupLabel(group: DateGroup): string {
  switch (group) {
    case 'past':
      return 'Past';
    case 'last-week':
      return 'Last Week';
    case 'today':
      return 'Today';
    case 'monday':
      return 'Monday';
    case 'tuesday':
      return 'Tuesday';
    case 'wednesday':
      return 'Wednesday';
    case 'thursday':
      return 'Thursday';
    case 'friday':
      return 'Friday';
    case 'saturday':
      return 'Saturday';
    case 'sunday':
      return 'Sunday';
    case 'next-week':
      return 'Next Week';
    case 'future':
      return 'Future';
    case 'no-date':
      return 'No Date';
  }
}

/**
 * Get the sort order for a date group (lower = earlier in list)
 */
export function getGroupOrder(group: DateGroup): number {
  switch (group) {
    case 'past':
      return 0;
    case 'today':
      return 1;
    case 'monday':
      return 2;
    case 'tuesday':
      return 3;
    case 'wednesday':
      return 4;
    case 'thursday':
      return 5;
    case 'friday':
      return 6;
    case 'saturday':
      return 7;
    case 'sunday':
      return 8;
    case 'next-week':
      return 9;
    case 'last-week':
      return 9;
    case 'future':
      return 10;
    case 'no-date':
      return 11;
  }
}

/**
 * Get the sort order for a date group in archive view.
 * Order: Today, then weekdays in reverse chronological order (yesterday first, back to Monday),
 * then any future weekdays, then Last Week, then Past, then No Date.
 */
export function getArchiveGroupOrder(
  group: DateGroup,
  now: Date = new Date()
): number {
  const todayDayOfWeek = now.getDay();
  const todayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1; // Monday=0

  switch (group) {
    case 'today':
      return 0;
    case 'monday':
    case 'tuesday':
    case 'wednesday':
    case 'thursday':
    case 'friday':
    case 'saturday':
    case 'sunday': {
      const groupIndex = getWeekdayIndex(group);
      if (groupIndex < todayIndex) {
        // Before today: yesterday=1, day before=2, etc.
        return todayIndex - groupIndex;
      }
      // Same day or after today: put after all before-today days
      return groupIndex + 1;
    }
    case 'last-week':
      return 8;
    case 'past':
      return 9;
    case 'next-week':
    case 'future':
      return 10;
    case 'no-date':
      return 11;
  }
}

/**
 * Check if a group represents a specific weekday (for filtering out days before today)
 */
export function isWeekdayGroup(group: DateGroup): boolean {
  return DAY_GROUPS.includes(group);
}

/**
 * Get the day index (0=Monday, 6=Sunday) for a weekday group
 */
export function getWeekdayIndex(group: DateGroup): number {
  return DAY_GROUPS.indexOf(group);
}

/**
 * Get remaining weekday groups (after today's day of week)
 * Used to filter which day headers should be shown
 */
export function getRemainingWeekdayGroups(now: Date = new Date()): DateGroup[] {
  const todayDayOfWeek = now.getDay();
  // Convert Sunday (0) to 6, otherwise subtract 1 for 0-based Monday index
  const todayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
  // Return days after today
  return DAY_GROUPS.slice(todayIndex + 1);
}

/**
 * Get the date timestamp for a specific date group.
 * Returns undefined for groups that don't have a specific date (past, future, no-date).
 */
export function getDateForGroup(
  group: DateGroup,
  now: Date = new Date()
): number | undefined {
  const today = startOfDay(now);

  switch (group) {
    case 'today':
      return today.getTime();

    case 'monday':
    case 'tuesday':
    case 'wednesday':
    case 'thursday':
    case 'friday':
    case 'saturday':
    case 'sunday': {
      // Get the day index for this group (0 = Monday, 6 = Sunday)
      const targetDayIndex = getWeekdayIndex(group);
      const todayDayOfWeek = now.getDay();
      // Convert Sunday (0) to 6, otherwise subtract 1 for 0-based Monday index
      const todayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;

      // Calculate days until the target day
      const daysUntilTarget = targetDayIndex - todayIndex;

      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysUntilTarget);
      return targetDate.getTime();
    }

    case 'next-week': {
      // Return the Monday of next week
      const weekEnd = getWeekEnd(now);
      const nextMonday = new Date(weekEnd);
      nextMonday.setDate(nextMonday.getDate() + 1);
      return nextMonday.getTime();
    }

    // These groups don't have specific dates
    case 'past':
    case 'last-week':
    case 'future':
    case 'no-date':
      return undefined;
  }
}

/**
 * Normalize a Date to a 'YYYY-MM-DD' string for use as a map key.
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Count active (non-done) tasks per calendar date.
 * Tasks without a dueDate are skipped.
 */
export function getTaskCountsByDate(tasks: Task[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (task.dueDate === undefined) continue;
    const key = toDateKey(new Date(task.dueDate));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Check whether a specific date has reached the task limit.
 * `excludeTaskId` allows a task being edited to not count against its own current date.
 */
export function isDateFull(
  dateTs: number,
  counts: Map<string, number>,
  excludeTaskId?: string,
  tasks?: Task[]
): boolean {
  const key = toDateKey(new Date(dateTs));
  let count = counts.get(key) ?? 0;

  if (excludeTaskId && tasks) {
    const task = tasks.find((t) => t.id === excludeTaskId);
    if (task?.dueDate !== undefined) {
      const taskKey = toDateKey(new Date(task.dueDate));
      if (taskKey === key) {
        count = Math.max(0, count - 1);
      }
    }
  }

  return count >= MAX_TASKS_PER_DAY;
}

/**
 * Check whether a date group is full.
 * Returns false for multi-date groups (past, future, no-date).
 */
export function isGroupFull(
  group: DateGroup,
  counts: Map<string, number>,
  now?: Date
): boolean {
  const dateTs = getDateForGroup(group, now);
  if (dateTs === undefined) return false;
  return isDateFull(dateTs, counts);
}

/**
 * Collect unique task types per calendar date.
 * Tasks without a dueDate are skipped.
 */
export function getTaskTypesByDate(tasks: Task[]): Map<string, Set<string>> {
  const typesByDate = new Map<string, Set<string>>();
  for (const task of tasks) {
    if (task.dueDate === undefined) continue;
    const key = toDateKey(new Date(task.dueDate));
    const existing = typesByDate.get(key);
    if (existing) {
      existing.add(task.type);
    } else {
      typesByDate.set(key, new Set([task.type]));
    }
  }
  return typesByDate;
}

/**
 * Get the count of unique task types for a date group.
 * Returns 0 for multi-date groups (past, future, no-date).
 */
export function getGroupTypeCount(
  group: DateGroup,
  typesByDate: Map<string, Set<string>>,
  now?: Date
): number {
  const dateTs = getDateForGroup(group, now);
  if (dateTs === undefined) return 0;
  const key = toDateKey(new Date(dateTs));
  return typesByDate.get(key)?.size ?? 0;
}

/**
 * Check if a task type already exists in a date group.
 * Returns false for multi-date groups (past, future, no-date).
 */
export function isTypeInGroup(
  taskType: string,
  group: DateGroup,
  typesByDate: Map<string, Set<string>>,
  now?: Date
): boolean {
  const dateTs = getDateForGroup(group, now);
  if (dateTs === undefined) return false;
  const key = toDateKey(new Date(dateTs));
  return typesByDate.get(key)?.has(taskType) ?? false;
}
