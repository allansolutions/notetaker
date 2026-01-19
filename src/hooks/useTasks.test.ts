import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from './useTasks';

describe('useTasks', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty tasks array initially', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toEqual([]);
  });

  it('loads tasks from localStorage', () => {
    const existingTasks = [
      {
        id: 'task-1',
        type: 'admin',
        title: 'Existing Task',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        startTime: 360,
        duration: 60,
        createdAt: 1705334400000,
        updatedAt: 1705334400000,
      },
    ];
    localStorage.setItem('notetaker-tasks', JSON.stringify(existingTasks));

    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('Existing Task');
  });

  describe('addTask', () => {
    it('adds a new task with default values', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('New Task');
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].title).toBe('New Task');
      expect(result.current.tasks[0].type).toBe('admin');
      expect(result.current.tasks[0].status).toBe('todo');
      expect(result.current.tasks[0].importance).toBe('mid');
    });

    it('adds a new task with custom values', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask(
          'Custom Task',
          'personal',
          'in-progress',
          'high'
        );
      });

      expect(result.current.tasks[0].title).toBe('Custom Task');
      expect(result.current.tasks[0].type).toBe('personal');
      expect(result.current.tasks[0].status).toBe('in-progress');
      expect(result.current.tasks[0].importance).toBe('high');
    });

    it('returns the newly created task', () => {
      const { result } = renderHook(() => useTasks());

      let newTask: ReturnType<typeof result.current.addTask>;
      act(() => {
        newTask = result.current.addTask('Test Task');
      });

      expect(newTask!.title).toBe('Test Task');
      expect(newTask!.id).toMatch(/^task-/);
    });
  });

  describe('updateTaskById', () => {
    it('updates task fields', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Original Title');
      });

      const taskId = result.current.tasks[0].id;

      act(() => {
        result.current.updateTaskById(taskId, { title: 'Updated Title' });
      });

      expect(result.current.tasks[0].title).toBe('Updated Title');
    });

    it('updates multiple fields at once', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Task');
      });

      const taskId = result.current.tasks[0].id;

      act(() => {
        result.current.updateTaskById(taskId, {
          status: 'done',
          importance: 'high',
        });
      });

      expect(result.current.tasks[0].status).toBe('done');
      expect(result.current.tasks[0].importance).toBe('high');
    });

    it('does not modify other tasks', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Task 1');
        result.current.addTask('Task 2');
      });

      const task1Id = result.current.tasks[0].id;

      act(() => {
        result.current.updateTaskById(task1Id, { title: 'Updated Task 1' });
      });

      expect(result.current.tasks[0].title).toBe('Updated Task 1');
      expect(result.current.tasks[1].title).toBe('Task 2');
    });
  });

  describe('removeTask', () => {
    it('removes task by id', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Task 1');
        result.current.addTask('Task 2');
      });

      const task1Id = result.current.tasks[0].id;

      act(() => {
        result.current.removeTask(task1Id);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].title).toBe('Task 2');
    });
  });

  describe('reorder', () => {
    it('reorders tasks from earlier to later position', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Task 1');
        result.current.addTask('Task 2');
        result.current.addTask('Task 3');
      });

      act(() => {
        result.current.reorder(0, 2);
      });

      expect(result.current.tasks[0].title).toBe('Task 2');
      expect(result.current.tasks[1].title).toBe('Task 3');
      expect(result.current.tasks[2].title).toBe('Task 1');
    });

    it('reorders tasks from later to earlier position', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Task 1');
        result.current.addTask('Task 2');
        result.current.addTask('Task 3');
      });

      act(() => {
        result.current.reorder(2, 0);
      });

      expect(result.current.tasks[0].title).toBe('Task 3');
      expect(result.current.tasks[1].title).toBe('Task 1');
      expect(result.current.tasks[2].title).toBe('Task 2');
    });
  });

  describe('updateBlocks', () => {
    it('updates task blocks', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Task');
      });

      const taskId = result.current.tasks[0].id;
      const newBlocks = [
        { id: 'block-1', type: 'paragraph' as const, content: 'Test content' },
      ];

      act(() => {
        result.current.updateBlocks(taskId, newBlocks);
      });

      expect(result.current.tasks[0].blocks).toEqual(newBlocks);
    });
  });

  describe('toggleScheduled', () => {
    it('schedules an unscheduled task', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Task');
      });

      const taskId = result.current.tasks[0].id;

      act(() => {
        result.current.toggleScheduled(taskId);
      });

      expect(result.current.tasks[0].scheduled).toBe(true);
      expect(result.current.tasks[0].startTime).toBeDefined();
      expect(result.current.tasks[0].duration).toBeDefined();
    });

    it('unschedules a scheduled task', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Task');
      });

      const taskId = result.current.tasks[0].id;

      // Schedule first
      act(() => {
        result.current.toggleScheduled(taskId);
      });

      // Then unschedule
      act(() => {
        result.current.toggleScheduled(taskId);
      });

      expect(result.current.tasks[0].scheduled).toBe(false);
    });

    it('preserves existing startTime when scheduling', () => {
      const { result } = renderHook(() => useTasks());

      act(() => {
        result.current.addTask('Task');
      });

      const taskId = result.current.tasks[0].id;
      const originalStartTime = result.current.tasks[0].startTime;

      act(() => {
        result.current.toggleScheduled(taskId);
      });

      expect(result.current.tasks[0].startTime).toBe(originalStartTime);
    });
  });
});
