import { describe, it, expect } from 'vitest';
import {
  getPresetDateRange,
  clampRangeToAccountStart,
  aggregateCompletionsByDay,
  computeDashboardStats,
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
