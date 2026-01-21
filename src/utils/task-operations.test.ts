import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTask,
  updateTask,
  getScheduledTasks,
  deleteTask,
  reorderTasks,
  updateTaskBlocks,
  generateSessionId,
  computeTimeSpent,
  computeTimeSpentWithActive,
} from './task-operations';
import { Task, Block, TimeSession } from '../types';

describe('createTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
  });

  it('creates a task with default values', () => {
    const task = createTask();

    expect(task.id).toMatch(/^task-/);
    expect(task.title).toBe('');
    expect(task.type).toBe('admin');
    expect(task.status).toBe('todo');
    expect(task.importance).toBe('mid');
    expect(task.blocks).toEqual([]);
    expect(task.startTime).toBe(6 * 60); // 6:00 AM (AGENDA_START_HOUR)
    expect(task.duration).toBe(60); // DEFAULT_DURATION
    expect(task.createdAt).toBe(Date.now());
    expect(task.updatedAt).toBe(Date.now());
  });

  it('creates a task with custom values', () => {
    const task = createTask('My Task', 'personal', 'in-progress', 'high');

    expect(task.title).toBe('My Task');
    expect(task.type).toBe('personal');
    expect(task.status).toBe('in-progress');
    expect(task.importance).toBe('high');
  });

  it('generates unique IDs for each task', () => {
    const task1 = createTask();
    const task2 = createTask();

    expect(task1.id).not.toBe(task2.id);
  });
});

describe('updateTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('updates task fields and updatedAt', () => {
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
    const task = createTask('Original', 'admin', 'todo', 'low');

    vi.setSystemTime(new Date('2024-01-15T11:00:00'));
    const updated = updateTask(task, { title: 'Updated', status: 'done' });

    expect(updated.title).toBe('Updated');
    expect(updated.status).toBe('done');
    expect(updated.type).toBe('admin'); // unchanged
    expect(updated.updatedAt).toBeGreaterThan(task.updatedAt);
  });

  it('preserves original task immutability', () => {
    const task = createTask('Original');
    const updated = updateTask(task, { title: 'Updated' });

    expect(task.title).toBe('Original');
    expect(updated.title).toBe('Updated');
  });
});

describe('getScheduledTasks', () => {
  it('returns all tasks since they have startTime by default', () => {
    const tasks: Task[] = [createTask('Task 1'), createTask('Task 2')];

    const result = getScheduledTasks(tasks);
    expect(result).toHaveLength(2);
  });

  it('excludes tasks that have startTime explicitly removed', () => {
    const taskWithTime = createTask('With time');
    const taskWithoutTime = {
      ...createTask('Without time'),
      startTime: undefined,
    };

    const tasks: Task[] = [taskWithTime, taskWithoutTime];

    const result = getScheduledTasks(tasks);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('With time');
  });
});

describe('deleteTask', () => {
  it('removes task by id', () => {
    const task1 = createTask('Task 1');
    const task2 = createTask('Task 2');
    const tasks = [task1, task2];

    const result = deleteTask(tasks, task1.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(task2.id);
  });

  it('returns original array if id not found', () => {
    const tasks = [createTask('Task 1')];
    const result = deleteTask(tasks, 'non-existent');

    expect(result).toHaveLength(1);
  });
});

describe('reorderTasks', () => {
  it('moves task from earlier to later position', () => {
    const task1 = createTask('Task 1');
    const task2 = createTask('Task 2');
    const task3 = createTask('Task 3');
    const tasks = [task1, task2, task3];

    const result = reorderTasks(tasks, 0, 2);

    expect(result[0].title).toBe('Task 2');
    expect(result[1].title).toBe('Task 3');
    expect(result[2].title).toBe('Task 1');
  });

  it('moves task from later to earlier position', () => {
    const task1 = createTask('Task 1');
    const task2 = createTask('Task 2');
    const task3 = createTask('Task 3');
    const tasks = [task1, task2, task3];

    const result = reorderTasks(tasks, 2, 0);

    expect(result[0].title).toBe('Task 3');
    expect(result[1].title).toBe('Task 1');
    expect(result[2].title).toBe('Task 2');
  });

  it('preserves array immutability', () => {
    const task1 = createTask('Task 1');
    const task2 = createTask('Task 2');
    const tasks = [task1, task2];

    const result = reorderTasks(tasks, 0, 1);

    expect(tasks[0].title).toBe('Task 1'); // original unchanged
    expect(result[0].title).toBe('Task 2');
  });
});

describe('updateTaskBlocks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('updates task blocks and updatedAt', () => {
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
    const task = createTask('Task');

    const blocks: Block[] = [
      { id: 'block-1', type: 'paragraph', content: 'Test content' },
    ];

    vi.setSystemTime(new Date('2024-01-15T11:00:00'));
    const updated = updateTaskBlocks(task, blocks);

    expect(updated.blocks).toEqual(blocks);
    expect(updated.updatedAt).toBeGreaterThan(task.updatedAt);
  });

  it('preserves original task immutability', () => {
    const task = createTask('Task');
    const blocks: Block[] = [
      { id: 'block-1', type: 'paragraph', content: 'Test' },
    ];

    const updated = updateTaskBlocks(task, blocks);

    expect(task.blocks).toEqual([]);
    expect(updated.blocks).toEqual(blocks);
  });
});

describe('generateSessionId', () => {
  it('generates unique session IDs', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();

    expect(id1).toMatch(/^session-/);
    expect(id2).toMatch(/^session-/);
    expect(id1).not.toBe(id2);
  });
});

describe('computeTimeSpent', () => {
  it('returns 0 for empty sessions array', () => {
    const result = computeTimeSpent([]);
    expect(result).toBe(0);
  });

  it('computes total time from completed sessions', () => {
    const sessions: TimeSession[] = [
      { id: 's1', startTime: 1000, endTime: 3000 }, // 2 seconds
      { id: 's2', startTime: 5000, endTime: 8000 }, // 3 seconds
    ];

    const result = computeTimeSpent(sessions);
    expect(result).toBe(5000); // 5 seconds total
  });

  it('ignores sessions without endTime (active sessions)', () => {
    const sessions: TimeSession[] = [
      { id: 's1', startTime: 1000, endTime: 3000 }, // 2 seconds
      { id: 's2', startTime: 5000 }, // Active session - no endTime
    ];

    const result = computeTimeSpent(sessions);
    expect(result).toBe(2000); // Only counts completed session
  });

  it('handles single completed session', () => {
    const sessions: TimeSession[] = [
      { id: 's1', startTime: 0, endTime: 60000 }, // 1 minute
    ];

    const result = computeTimeSpent(sessions);
    expect(result).toBe(60000);
  });
});

describe('computeTimeSpentWithActive', () => {
  it('returns 0 for undefined sessions', () => {
    const result = computeTimeSpentWithActive(undefined);
    expect(result).toBe(0);
  });

  it('returns 0 for empty sessions array', () => {
    const result = computeTimeSpentWithActive([]);
    expect(result).toBe(0);
  });

  it('computes total time from completed sessions', () => {
    const sessions: TimeSession[] = [
      { id: 's1', startTime: 1000, endTime: 3000 }, // 2 seconds
      { id: 's2', startTime: 5000, endTime: 8000 }, // 3 seconds
    ];

    const result = computeTimeSpentWithActive(sessions);
    expect(result).toBe(5000);
  });

  it('includes active sessions using current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
    const now = Date.now();

    const sessions: TimeSession[] = [
      { id: 's1', startTime: 1000, endTime: 3000 }, // 2 seconds
      { id: 's2', startTime: now - 5000 }, // Active session, 5 seconds ago
    ];

    const result = computeTimeSpentWithActive(sessions);
    expect(result).toBe(7000); // 2 seconds + 5 seconds

    vi.useRealTimers();
  });
});
