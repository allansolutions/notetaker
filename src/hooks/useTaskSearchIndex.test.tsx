import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTaskSearchIndex } from './useTaskSearchIndex';
import { Task } from '../types';

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: overrides.id ?? 'task-1',
  type: 'admin',
  title: 'Sample Task',
  status: 'todo',
  importance: 'mid',
  blocks: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('useTaskSearchIndex', () => {
  it('returns matches for prefix and fuzzy queries', () => {
    const tasks = [
      createMockTask({
        id: 'task-a',
        title: 'Alpha Task',
        blocks: [{ id: 'b1', type: 'paragraph', content: 'Buy apples' }],
      }),
      createMockTask({
        id: 'task-b',
        title: 'Bravo Task',
        blocks: [{ id: 'b2', type: 'paragraph', content: 'Call client' }],
      }),
    ];

    const { result } = renderHook(() => useTaskSearchIndex(tasks));

    const prefixResults = result.current.searchTasks('app');
    expect(prefixResults[0]?.id).toBe('task-a');

    const fuzzyResults = result.current.searchTasks('aplpes');
    expect(fuzzyResults[0]?.id).toBe('task-a');
  });

  it('returns recent tasks when query is empty', () => {
    const tasks = [
      createMockTask({ id: 'task-old', updatedAt: 1000 }),
      createMockTask({ id: 'task-new', updatedAt: 2000 }),
    ];

    const { result } = renderHook(() => useTaskSearchIndex(tasks));
    const results = result.current.searchTasks('');

    expect(results[0]?.id).toBe('task-new');
    expect(results[1]?.id).toBe('task-old');
  });

  it('returns no results when query has no match', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    const { result } = renderHook(() => useTaskSearchIndex(tasks));
    const results = result.current.searchTasks('unrelated');

    expect(results).toHaveLength(0);
  });

  it('matches short prefix queries without fuzzy matching', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    const { result } = renderHook(() => useTaskSearchIndex(tasks));
    const results = result.current.searchTasks('al');

    expect(results[0]?.id).toBe('task-1');
  });
});
