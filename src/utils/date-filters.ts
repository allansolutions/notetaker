import { DateFilterPreset, DateRange, Task } from '../types';
import { SpreadsheetFilterState } from '../components/views/SpreadsheetView';

export type PresetCounts = Record<
  'all' | 'today' | 'tomorrow' | 'this-week',
  number
>;

/**
 * Get relative label for a date compared to current date
 * Returns 'today', 'yesterday', 'tomorrow', or null for other dates
 */
export function getRelativeDateLabel(
  timestamp: number,
  now: Date = new Date()
): 'today' | 'yesterday' | 'tomorrow' | null {
  if (isOnDate(timestamp, now)) return 'today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isOnDate(timestamp, yesterday)) return 'yesterday';

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isOnDate(timestamp, tomorrow)) return 'tomorrow';

  return null;
}

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
  now: Date = new Date(),
  options?: {
    specificDate?: number | null;
    range?: DateRange | null;
  }
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

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return isOnDate(dueDate, yesterday);
    }

    case 'this-week': {
      const weekStart = getWeekStart(now);
      const weekEnd = getWeekEnd(now);
      return isInDateRange(dueDate, weekStart, weekEnd);
    }

    case 'specific-date': {
      if (!options?.specificDate) return false;
      return isOnDate(dueDate, new Date(options.specificDate));
    }

    case 'date-range': {
      if (!options?.range) return false;
      return isInDateRange(
        dueDate,
        startOfDay(new Date(options.range.start)),
        endOfDay(new Date(options.range.end))
      );
    }

    default:
      return true;
  }
}

/**
 * Compute task counts for each date filter preset.
 */
export function computePresetCounts(tasks: Task[]): PresetCounts {
  const now = new Date();
  return {
    all: tasks.length,
    today: tasks.filter((t) => matchesDatePreset(t.dueDate, 'today', now))
      .length,
    tomorrow: tasks.filter((t) => matchesDatePreset(t.dueDate, 'tomorrow', now))
      .length,
    'this-week': tasks.filter((t) =>
      matchesDatePreset(t.dueDate, 'this-week', now)
    ).length,
  };
}

/**
 * Get the single date timestamp from filter state if a single-date filter is active.
 * Returns the timestamp to use for new tasks, or undefined if no single-date filter is active.
 *
 * Single-date filters include:
 * - 'today': returns start of today
 * - 'tomorrow': returns start of tomorrow
 * - 'yesterday': returns start of yesterday
 * - 'specific-date': returns the selected date
 *
 * Does NOT return a date for:
 * - 'all': no filter active
 * - 'this-week': range filter
 * - 'date-range': explicit range filter
 */
export function getSingleDateFromFilter(
  filterState: SpreadsheetFilterState,
  now: Date = new Date()
): number | undefined {
  switch (filterState.dateFilterPreset) {
    case 'today':
      return startOfDay(now).getTime();

    case 'tomorrow': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return startOfDay(tomorrow).getTime();
    }

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return startOfDay(yesterday).getTime();
    }

    case 'specific-date':
      return filterState.dateFilterDate ?? undefined;

    default:
      return undefined;
  }
}
