import { Task } from '../types';

export type DashboardPreset =
  | 'this-week'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'this-year';

export interface DayDataPoint {
  date: string; // YYYY-MM-DD
  dateLabel: string; // e.g. "Jan 15"
  count: number;
}

export interface DashboardStats {
  totalCompleted: number;
  avgPerDay: number;
  peakDay: string; // dateLabel of the peak day, or ''
  undatedCount: number;
}

/**
 * Clamp a range so it doesn't start before the account creation date.
 * Prevents days before the user existed from dragging down averages.
 */
export function clampRangeToAccountStart(
  range: { start: Date; end: Date },
  accountCreatedAt: number
): { start: Date; end: Date } {
  const accountStart = startOfDay(new Date(accountCreatedAt));
  if (range.start < accountStart) {
    return { start: accountStart, end: range.end };
  }
  return range;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDateLabel(date: Date): string {
  return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Returns { start, end } Date objects for a given dashboard preset.
 * start is the beginning of the first day, end is the end of the last day.
 */
export function getPresetDateRange(
  preset: DashboardPreset,
  now: Date = new Date()
): { start: Date; end: Date } {
  const today = startOfDay(now);

  switch (preset) {
    case 'this-week': {
      const day = today.getDay(); // 0=Sun
      const daysFromMonday = day === 0 ? 6 : day - 1;
      const start = new Date(today);
      start.setDate(start.getDate() - daysFromMonday); // Monday
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'this-month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'last-month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        0,
        23,
        59,
        59,
        999
      );
      return { start, end };
    }
    case 'this-quarter': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'this-year': {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }
}

/**
 * Aggregates completed tasks by day within the given range.
 * Returns one data point per calendar day (zero-count days included).
 */
export function aggregateCompletionsByDay(
  tasks: Task[],
  range: { start: Date; end: Date }
): DayDataPoint[] {
  const startTime = range.start.getTime();
  const endTime = range.end.getTime();

  // Count completions by day key
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (task.status !== 'done' || !task.dueDate) continue;
    if (task.dueDate < startTime || task.dueDate > endTime) continue;
    const key = formatDateKey(new Date(task.dueDate));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Build array with every calendar day in range
  const points: DayDataPoint[] = [];
  const cursor = startOfDay(range.start);
  const endDay = startOfDay(range.end);

  while (cursor <= endDay) {
    const key = formatDateKey(cursor);
    points.push({
      date: key,
      dateLabel: formatDateLabel(cursor),
      count: counts.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}

/**
 * Compute summary stats from data points and the full task list.
 */
export function computeDashboardStats(
  tasks: Task[],
  points: DayDataPoint[]
): DashboardStats {
  const totalCompleted = points.reduce((sum, p) => sum + p.count, 0);
  const daysWithData = points.length || 1;
  const avgPerDay = totalCompleted / daysWithData;

  let peakDay = '';
  let peakCount = 0;
  for (const p of points) {
    if (p.count > peakCount) {
      peakCount = p.count;
      peakDay = p.dateLabel;
    }
  }

  const undatedCount = tasks.filter(
    (t) => t.status === 'done' && !t.dueDate
  ).length;

  return {
    totalCompleted,
    avgPerDay: Math.round(avgPerDay * 10) / 10,
    peakDay,
    undatedCount,
  };
}
