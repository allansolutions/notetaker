import { DateFilterPreset } from '../types';

/**
 * Get the start of a day (midnight 00:00:00.000)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of a day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of the week (Monday 00:00:00.000)
 * Week is Monday-Sunday
 */
export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  // Convert Sunday (0) to 7 for Monday-based week calculation
  const daysFromMonday = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - daysFromMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of the week (Sunday 23:59:59.999)
 * Week is Monday-Sunday
 */
export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const result = new Date(weekStart);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Check if a timestamp falls on the same calendar day as targetDate
 */
export function isOnDate(timestamp: number, targetDate: Date): boolean {
  const taskDate = new Date(timestamp);
  return (
    taskDate.getFullYear() === targetDate.getFullYear() &&
    taskDate.getMonth() === targetDate.getMonth() &&
    taskDate.getDate() === targetDate.getDate()
  );
}

/**
 * Check if a timestamp falls within a date range (inclusive)
 */
export function isInDateRange(
  timestamp: number,
  start: Date,
  end: Date
): boolean {
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

/**
 * Main filter function: check if a task's dueDate matches the preset filter
 * Returns true if the task should be shown
 */
export function matchesDatePreset(
  dueDate: number | undefined,
  preset: DateFilterPreset,
  now: Date = new Date()
): boolean {
  // 'all' shows everything including tasks without dueDate
  if (preset === 'all') {
    return true;
  }

  // For other presets, tasks without dueDate are hidden
  if (dueDate === undefined) {
    return false;
  }

  switch (preset) {
    case 'today':
      return isOnDate(dueDate, now);

    case 'tomorrow': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return isOnDate(dueDate, tomorrow);
    }

    case 'this-week': {
      const weekStart = getWeekStart(now);
      const weekEnd = getWeekEnd(now);
      return isInDateRange(dueDate, weekStart, weekEnd);
    }

    default:
      return true;
  }
}
