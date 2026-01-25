import { getWeekEnd, isOnDate, startOfDay } from './date-filters';

export type DateGroup =
  | 'past'
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
 * Get human-readable label for a date group
 */
export function getGroupLabel(group: DateGroup): string {
  switch (group) {
    case 'past':
      return 'Past';
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
    case 'future':
    case 'no-date':
      return undefined;
  }
}
