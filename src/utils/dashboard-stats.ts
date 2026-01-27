import { Task, TaskType } from '../types';

export type DashboardPreset =
  | 'this-week'
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'this-year';

export type DashboardGranularity = 'daily' | 'weekly' | 'monthly';

export interface DayDataPoint {
  date: string; // bucket key (YYYY-MM-DD or YYYY-MM)
  dateLabel: string; // e.g. "Jan 15", "Jan 13", "Jan" or "Jan '25"
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

export function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(date: Date, spanMultipleYears: boolean): string {
  const month = SHORT_MONTHS[date.getMonth()];
  if (spanMultipleYears) {
    return `${month} '${String(date.getFullYear()).slice(2)}`;
  }
  return month;
}

function getKeyFunction(
  granularity: DashboardGranularity
): (d: Date) => string {
  if (granularity === 'monthly') return getMonthKey;
  if (granularity === 'weekly') return getMondayKey;
  return formatDateKey;
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

const MAX_BUCKETS = 50;

export function countBuckets(
  range: { start: Date; end: Date },
  granularity: DashboardGranularity
): number {
  const days = Math.ceil(
    (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  switch (granularity) {
    case 'daily':
      return days;
    case 'weekly':
      return Math.ceil(days / 7);
    case 'monthly': {
      const startYear = range.start.getFullYear();
      const startMonth = range.start.getMonth();
      const endYear = range.end.getFullYear();
      const endMonth = range.end.getMonth();
      return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    }
  }
}

export function getPermittedGranularities(range: {
  start: Date;
  end: Date;
}): DashboardGranularity[] {
  const permitted: DashboardGranularity[] = [];
  if (countBuckets(range, 'daily') <= MAX_BUCKETS) permitted.push('daily');
  if (countBuckets(range, 'weekly') <= MAX_BUCKETS) permitted.push('weekly');
  if (countBuckets(range, 'monthly') <= MAX_BUCKETS) permitted.push('monthly');
  return permitted;
}

export function getDefaultGranularity(range: {
  start: Date;
  end: Date;
}): DashboardGranularity {
  const permitted = getPermittedGranularities(range);
  return permitted[0] ?? 'monthly';
}

function buildCompletionBuckets(
  range: { start: Date; end: Date },
  granularity: DashboardGranularity,
  counts: Map<string, number>
): DayDataPoint[] {
  const spansMultipleYears =
    range.start.getFullYear() !== range.end.getFullYear();

  if (granularity === 'monthly') {
    return buildMonthlyCompletionBuckets(range, counts, spansMultipleYears);
  }
  if (granularity === 'weekly') {
    return buildWeeklyCompletionBuckets(range, counts);
  }
  return buildDailyCompletionBuckets(range, counts);
}

function buildMonthlyCompletionBuckets(
  range: { start: Date; end: Date },
  counts: Map<string, number>,
  spansMultipleYears: boolean
): DayDataPoint[] {
  const points: DayDataPoint[] = [];
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
  while (cursor <= endMonth) {
    const key = getMonthKey(cursor);
    points.push({
      date: key,
      dateLabel: formatMonthLabel(cursor, spansMultipleYears),
      count: counts.get(key) ?? 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points;
}

function buildWeeklyCompletionBuckets(
  range: { start: Date; end: Date },
  counts: Map<string, number>
): DayDataPoint[] {
  const points: DayDataPoint[] = [];
  const cursor = startOfDay(range.start);
  const day = cursor.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  cursor.setDate(cursor.getDate() - daysFromMonday);
  const endDay = startOfDay(range.end);
  while (cursor <= endDay) {
    const key = formatDateKey(cursor);
    points.push({
      date: key,
      dateLabel: formatDateLabel(cursor),
      count: counts.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return points;
}

function buildDailyCompletionBuckets(
  range: { start: Date; end: Date },
  counts: Map<string, number>
): DayDataPoint[] {
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
 * Aggregates completed tasks within the given range at the specified granularity.
 * Returns one data point per bucket (zero-count buckets included).
 */
export function aggregateCompletions(
  tasks: Task[],
  range: { start: Date; end: Date },
  granularity: DashboardGranularity = 'daily'
): DayDataPoint[] {
  const startTime = range.start.getTime();
  const endTime = range.end.getTime();
  const keyFn = getKeyFunction(granularity);

  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (task.status !== 'done' || !task.dueDate) continue;
    if (task.dueDate < startTime || task.dueDate > endTime) continue;
    const key = keyFn(new Date(task.dueDate));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return buildCompletionBuckets(range, granularity, counts);
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

// --- Time by Category (stacked bar chart) ---

export const CATEGORY_CHART_COLORS: Record<TaskType, string> = {
  admin: '#6b7280',
  operations: '#3b82f6',
  'business-dev': '#a855f7',
  'jardin-casa': '#22c55e',
  'jardin-finca': '#f59e0b',
  personal: '#ec4899',
  fitness: '#ef4444',
};

export interface TimeByCategoryPoint {
  bucketKey: string;
  label: string;
  admin: number;
  operations: number;
  'business-dev': number;
  'jardin-casa': number;
  'jardin-finca': number;
  personal: number;
  fitness: number;
  total: number;
}

function emptyPoint(bucketKey: string, label: string): TimeByCategoryPoint {
  return {
    bucketKey,
    label,
    admin: 0,
    operations: 0,
    'business-dev': 0,
    'jardin-casa': 0,
    'jardin-finca': 0,
    personal: 0,
    fitness: 0,
    total: 0,
  };
}

/**
 * Get the Monday-based week key for a date.
 * Returns the YYYY-MM-DD of the Monday of that week.
 */
function getMondayKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysFromMonday);
  return formatDateKey(d);
}

function buildWeeklyBuckets(range: {
  start: Date;
  end: Date;
}): Map<string, TimeByCategoryPoint> {
  const bucketMap = new Map<string, TimeByCategoryPoint>();
  const cursor = startOfDay(range.start);
  const day = cursor.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  cursor.setDate(cursor.getDate() - daysFromMonday);
  const endDay = startOfDay(range.end);

  while (cursor <= endDay) {
    const key = formatDateKey(cursor);
    if (!bucketMap.has(key)) {
      bucketMap.set(key, emptyPoint(key, formatDateLabel(cursor)));
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return bucketMap;
}

function buildDailyBuckets(range: {
  start: Date;
  end: Date;
}): Map<string, TimeByCategoryPoint> {
  const bucketMap = new Map<string, TimeByCategoryPoint>();
  const cursor = startOfDay(range.start);
  const endDay = startOfDay(range.end);

  while (cursor <= endDay) {
    const key = formatDateKey(cursor);
    bucketMap.set(key, emptyPoint(key, formatDateLabel(cursor)));
    cursor.setDate(cursor.getDate() + 1);
  }
  return bucketMap;
}

function getCompletedSessions(
  tasks: Task[],
  range: { start: Date; end: Date }
): { type: TaskType; startTime: number; durationMinutes: number }[] {
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();
  const result: {
    type: TaskType;
    startTime: number;
    durationMinutes: number;
  }[] = [];

  for (const task of tasks) {
    if (!task.sessions) continue;
    for (const session of task.sessions) {
      if (!session.endTime) continue;
      if (session.startTime > rangeEnd || session.endTime < rangeStart)
        continue;
      result.push({
        type: task.type,
        startTime: session.startTime,
        durationMinutes: Math.round(
          (session.endTime - session.startTime) / (1000 * 60)
        ),
      });
    }
  }
  return result;
}

function buildMonthlyTimeBuckets(range: {
  start: Date;
  end: Date;
}): Map<string, TimeByCategoryPoint> {
  const bucketMap = new Map<string, TimeByCategoryPoint>();
  const spansMultipleYears =
    range.start.getFullYear() !== range.end.getFullYear();
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);

  while (cursor <= endMonth) {
    const key = getMonthKey(cursor);
    bucketMap.set(
      key,
      emptyPoint(key, formatMonthLabel(cursor, spansMultipleYears))
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return bucketMap;
}

function addSessionsToBuckets(
  tasks: Task[],
  bucketMap: Map<string, TimeByCategoryPoint>,
  range: { start: Date; end: Date },
  granularity: DashboardGranularity
): void {
  const sessions = getCompletedSessions(tasks, range);
  const keyFn = getKeyFunction(granularity);

  for (const s of sessions) {
    const key = keyFn(new Date(s.startTime));
    const bucket = bucketMap.get(key);
    if (!bucket) continue;
    bucket[s.type] += s.durationMinutes;
    bucket.total += s.durationMinutes;
  }
}

/**
 * Aggregates tracked time per category into day, week, or month buckets.
 */
export function aggregateTimeByCategory(
  tasks: Task[],
  range: { start: Date; end: Date },
  granularity: DashboardGranularity = 'daily'
): TimeByCategoryPoint[] {
  let bucketMap: Map<string, TimeByCategoryPoint>;
  if (granularity === 'monthly') {
    bucketMap = buildMonthlyTimeBuckets(range);
  } else if (granularity === 'weekly') {
    bucketMap = buildWeeklyBuckets(range);
  } else {
    bucketMap = buildDailyBuckets(range);
  }

  addSessionsToBuckets(tasks, bucketMap, range, granularity);

  return Array.from(bucketMap.values()).sort((a, b) =>
    a.bucketKey.localeCompare(b.bucketKey)
  );
}
