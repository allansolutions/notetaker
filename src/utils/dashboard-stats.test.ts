import { describe, it, expect } from 'vitest';
import {
  getPresetDateRange,
  clampRangeToAccountStart,
  aggregateCompletionsByDay,
  computeDashboardStats,
  aggregateTimeByCategory,
} from './dashboard-stats';
import { Task } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '1',
    type: 'admin',
    title: 'Test task',
    status: 'todo',
    blocks: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('getPresetDateRange', () => {
  // Use a fixed date: Wednesday, January 15, 2025
  const now = new Date(2025, 0, 15, 10, 0, 0);

  it('returns this-week range (Mon–today)', () => {
    const { start, end } = getPresetDateRange('this-week', now);
    // Jan 15 is Wednesday, so Monday is Jan 13
    expect(start.getDate()).toBe(13);
    expect(start.getMonth()).toBe(0);
    expect(start.getHours()).toBe(0);
    // End capped at today (Jan 15)
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(23);
  });

  it('returns this-month range (1st–today)', () => {
    const { start, end } = getPresetDateRange('this-month', now);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(0);
    // End capped at today (Jan 15)
    expect(end.getDate()).toBe(15);
    expect(end.getMonth()).toBe(0);
  });

  it('returns last-month range', () => {
    const { start, end } = getPresetDateRange('last-month', now);
    expect(start.getMonth()).toBe(11); // December 2024
    expect(start.getFullYear()).toBe(2024);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(31);
    expect(end.getMonth()).toBe(11);
  });

  it('returns this-quarter range (Q1 start–today)', () => {
    const { start, end } = getPresetDateRange('this-quarter', now);
    // Q1: Jan 1 – today
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(15);
    expect(end.getMonth()).toBe(0);
  });

  it('returns this-year range (Jan 1–today)', () => {
    const { start, end } = getPresetDateRange('this-year', now);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(15);
    expect(end.getMonth()).toBe(0);
  });
});

describe('clampRangeToAccountStart', () => {
  it('clamps start when range starts before account creation', () => {
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 31, 23, 59, 59),
    };
    // Account created Jan 15
    const accountCreatedAt = new Date(2025, 0, 15, 14, 30, 0).getTime();
    const clamped = clampRangeToAccountStart(range, accountCreatedAt);
    expect(clamped.start.getDate()).toBe(15);
    expect(clamped.start.getHours()).toBe(0); // start of day
    expect(clamped.end).toBe(range.end); // end unchanged
  });

  it('leaves range unchanged when it starts after account creation', () => {
    const range = {
      start: new Date(2025, 1, 1),
      end: new Date(2025, 1, 28, 23, 59, 59),
    };
    const accountCreatedAt = new Date(2025, 0, 15).getTime();
    const clamped = clampRangeToAccountStart(range, accountCreatedAt);
    expect(clamped.start.getTime()).toBe(range.start.getTime());
    expect(clamped.end).toBe(range.end);
  });
});

describe('aggregateCompletionsByDay', () => {
  it('returns zero-count days for empty task list', () => {
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 3, 23, 59, 59),
    };
    const points = aggregateCompletionsByDay([], range);
    expect(points).toHaveLength(3);
    expect(points.every((p) => p.count === 0)).toBe(true);
  });

  it('counts done tasks with dueDate in range', () => {
    const tasks: Task[] = [
      makeTask({
        id: '1',
        status: 'done',
        dueDate: new Date(2025, 0, 2, 12, 0, 0).getTime(),
      }),
      makeTask({
        id: '2',
        status: 'done',
        dueDate: new Date(2025, 0, 2, 14, 0, 0).getTime(),
      }),
      makeTask({
        id: '3',
        status: 'done',
        dueDate: new Date(2025, 0, 3, 10, 0, 0).getTime(),
      }),
    ];
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 3, 23, 59, 59),
    };
    const points = aggregateCompletionsByDay(tasks, range);
    expect(points).toHaveLength(3);
    expect(points[0].count).toBe(0); // Jan 1
    expect(points[1].count).toBe(2); // Jan 2
    expect(points[2].count).toBe(1); // Jan 3
  });

  it('excludes non-done tasks', () => {
    const tasks: Task[] = [
      makeTask({
        id: '1',
        status: 'todo',
        dueDate: new Date(2025, 0, 2, 12, 0, 0).getTime(),
      }),
    ];
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 3, 23, 59, 59),
    };
    const points = aggregateCompletionsByDay(tasks, range);
    expect(points.every((p) => p.count === 0)).toBe(true);
  });

  it('excludes done tasks outside range', () => {
    const tasks: Task[] = [
      makeTask({
        id: '1',
        status: 'done',
        dueDate: new Date(2025, 0, 10, 12, 0, 0).getTime(),
      }),
    ];
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 3, 23, 59, 59),
    };
    const points = aggregateCompletionsByDay(tasks, range);
    expect(points.every((p) => p.count === 0)).toBe(true);
  });

  it('excludes done tasks without dueDate', () => {
    const tasks: Task[] = [makeTask({ id: '1', status: 'done' })];
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 3, 23, 59, 59),
    };
    const points = aggregateCompletionsByDay(tasks, range);
    expect(points.every((p) => p.count === 0)).toBe(true);
  });
});

describe('computeDashboardStats', () => {
  it('computes correct stats', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'done', dueDate: 1 }),
      makeTask({ id: '2', status: 'done', dueDate: 1 }),
      makeTask({ id: '3', status: 'done' }), // undated
    ];
    const points = [
      { date: '2025-01-01', dateLabel: 'Jan 1', count: 0 },
      { date: '2025-01-02', dateLabel: 'Jan 2', count: 3 },
      { date: '2025-01-03', dateLabel: 'Jan 3', count: 1 },
    ];
    const stats = computeDashboardStats(tasks, points);
    expect(stats.totalCompleted).toBe(4);
    expect(stats.avgPerDay).toBe(1.3);
    expect(stats.peakDay).toBe('Jan 2');
    expect(stats.undatedCount).toBe(1);
  });

  it('handles empty data', () => {
    const stats = computeDashboardStats([], []);
    expect(stats.totalCompleted).toBe(0);
    expect(stats.avgPerDay).toBe(0);
    expect(stats.peakDay).toBe('');
    expect(stats.undatedCount).toBe(0);
  });
});

describe('aggregateTimeByCategory', () => {
  // Helper to create a session spanning a certain number of minutes
  function session(date: Date, durationMinutes: number, hasEnd = true) {
    const startTime = date.getTime();
    return {
      id: `s-${startTime}`,
      startTime,
      endTime: hasEnd ? startTime + durationMinutes * 60 * 1000 : undefined,
    };
  }

  it('buckets sessions by day for short ranges', () => {
    const tasks: Task[] = [
      makeTask({
        id: '1',
        type: 'admin',
        sessions: [
          session(new Date(2025, 0, 2, 9, 0), 60), // Jan 2, 60 min
          session(new Date(2025, 0, 3, 14, 0), 30), // Jan 3, 30 min
        ],
      }),
    ];
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 3, 23, 59, 59),
    };
    const points = aggregateTimeByCategory(tasks, range);
    expect(points).toHaveLength(3);
    expect(points[0].admin).toBe(0); // Jan 1
    expect(points[1].admin).toBe(60); // Jan 2
    expect(points[2].admin).toBe(30); // Jan 3
    expect(points[1].total).toBe(60);
    expect(points[2].total).toBe(30);
  });

  it('uses week granularity for ranges > 31 days', () => {
    // Range: Jan 1 – Mar 15 (74 days)
    const tasks: Task[] = [
      makeTask({
        id: '1',
        type: 'operations',
        sessions: [
          session(new Date(2025, 0, 7, 10, 0), 45), // Jan 7 (Tue) → week of Jan 6 (Mon)
          session(new Date(2025, 0, 9, 10, 0), 30), // Jan 9 (Thu) → week of Jan 6 (Mon)
        ],
      }),
    ];
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 2, 15, 23, 59, 59),
    };
    const points = aggregateTimeByCategory(tasks, range);
    // Should have weekly buckets, not daily
    expect(points.length).toBeLessThan(74);
    // Find the week of Jan 6
    const jan6Week = points.find((p) => p.bucketKey === '2025-01-06');
    expect(jan6Week).toBeDefined();
    expect(jan6Week!.operations).toBe(75); // 45 + 30
    expect(jan6Week!.total).toBe(75);
  });

  it('skips sessions without endTime', () => {
    const tasks: Task[] = [
      makeTask({
        id: '1',
        type: 'personal',
        sessions: [
          session(new Date(2025, 0, 2, 9, 0), 60, false), // no end
        ],
      }),
    ];
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 3, 23, 59, 59),
    };
    const points = aggregateTimeByCategory(tasks, range);
    expect(points.every((p) => p.total === 0)).toBe(true);
  });

  it('zero-fills empty buckets', () => {
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 5, 23, 59, 59),
    };
    const points = aggregateTimeByCategory([], range);
    expect(points).toHaveLength(5);
    for (const p of points) {
      expect(p.total).toBe(0);
      expect(p.admin).toBe(0);
      expect(p.operations).toBe(0);
    }
  });

  it('excludes sessions outside range', () => {
    const tasks: Task[] = [
      makeTask({
        id: '1',
        type: 'fitness',
        sessions: [
          session(new Date(2025, 0, 10, 9, 0), 60), // outside range
        ],
      }),
    ];
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 3, 23, 59, 59),
    };
    const points = aggregateTimeByCategory(tasks, range);
    expect(points.every((p) => p.total === 0)).toBe(true);
  });

  it('aggregates multiple categories correctly', () => {
    const tasks: Task[] = [
      makeTask({
        id: '1',
        type: 'admin',
        sessions: [session(new Date(2025, 0, 2, 9, 0), 30)],
      }),
      makeTask({
        id: '2',
        type: 'fitness',
        sessions: [session(new Date(2025, 0, 2, 14, 0), 45)],
      }),
      makeTask({
        id: '3',
        type: 'operations',
        sessions: [session(new Date(2025, 0, 2, 16, 0), 20)],
      }),
    ];
    const range = {
      start: new Date(2025, 0, 1),
      end: new Date(2025, 0, 3, 23, 59, 59),
    };
    const points = aggregateTimeByCategory(tasks, range);
    const jan2 = points[1]; // Jan 2
    expect(jan2.admin).toBe(30);
    expect(jan2.fitness).toBe(45);
    expect(jan2.operations).toBe(20);
    expect(jan2.total).toBe(95);
    expect(jan2.personal).toBe(0);
  });
});
