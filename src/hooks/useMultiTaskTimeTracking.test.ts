import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiTaskTimeTracking } from './useMultiTaskTimeTracking';
import { Task } from '../types';

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Date.now()}-${Math.random()}`,
  type: 'admin',
  title: 'Test Task',
  status: 'todo',
  blocks: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('useMultiTaskTimeTracking', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createProps = (
    activeTaskId: string | null,
    tasks: Task[],
    onAddSession = vi.fn()
  ) => ({
    activeTaskId,
    tasks,
    onAddSession,
  });

  describe('initialization', () => {
    it('does not track when activeTaskId is null', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];
      const { result } = renderHook(() =>
        useMultiTaskTimeTracking(createProps(null, tasks))
      );

      expect(result.current.isTracking).toBe(false);
      expect(result.current.trackingTaskId).toBeNull();
    });

    it('starts tracking when activeTaskId points to task with estimate', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];
      const { result } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks))
      );

      expect(result.current.isTracking).toBe(true);
      expect(result.current.trackingTaskId).toBe('task-1');
      expect(result.current.elapsedMs).toBe(0);
    });

    it('does not track task without estimate', () => {
      const tasks = [createMockTask({ id: 'task-1' })]; // No estimate
      const { result } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks))
      );

      expect(result.current.isTracking).toBe(false);
      expect(result.current.trackingTaskId).toBeNull();
    });

    it('does not track task with zero estimate', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 0 })];
      const { result } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks))
      );

      expect(result.current.isTracking).toBe(false);
    });
  });

  describe('session recovery', () => {
    it('recovers active session from localStorage for same task', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];
      const existingSession = {
        taskId: 'task-1',
        session: {
          id: 'session-1',
          startTime: Date.now() - 60000, // 1 minute ago
        },
      };
      localStorage.setItem(
        'notetaker-active-session',
        JSON.stringify(existingSession)
      );

      const { result } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks))
      );

      expect(result.current.isTracking).toBe(true);
      expect(result.current.elapsedMs).toBe(60000);
    });

    it('handles invalid localStorage data gracefully', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];
      localStorage.setItem('notetaker-active-session', 'invalid json');

      const { result } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks))
      );

      expect(result.current.isTracking).toBe(true);
      expect(result.current.elapsedMs).toBe(0);
    });
  });

  describe('task switching', () => {
    it('ends previous session when switching to different task', () => {
      const onAddSession = vi.fn();
      const tasks = [
        createMockTask({ id: 'task-1', estimate: 30 }),
        createMockTask({ id: 'task-2', estimate: 30 }),
      ];

      const { result, rerender } = renderHook(
        ({ activeTaskId }) =>
          useMultiTaskTimeTracking(
            createProps(activeTaskId, tasks, onAddSession)
          ),
        { initialProps: { activeTaskId: 'task-1' } }
      );

      expect(result.current.trackingTaskId).toBe('task-1');

      // Advance time by more than 1 minute (minimum session duration)
      act(() => {
        vi.advanceTimersByTime(70000); // 70 seconds
      });

      // Switch to task-2
      rerender({ activeTaskId: 'task-2' });

      expect(result.current.trackingTaskId).toBe('task-2');
      expect(result.current.elapsedMs).toBe(0);

      // Should have saved session for task-1
      expect(onAddSession).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        })
      );
    });

    it('does not save session shorter than 1 minute when switching', () => {
      const onAddSession = vi.fn();
      const tasks = [
        createMockTask({ id: 'task-1', estimate: 30 }),
        createMockTask({ id: 'task-2', estimate: 30 }),
      ];

      const { result, rerender } = renderHook(
        ({ activeTaskId }) =>
          useMultiTaskTimeTracking(
            createProps(activeTaskId, tasks, onAddSession)
          ),
        { initialProps: { activeTaskId: 'task-1' } }
      );

      // Advance time by less than 1 minute
      act(() => {
        vi.advanceTimersByTime(30000); // 30 seconds
      });

      // Switch to task-2
      rerender({ activeTaskId: 'task-2' });

      expect(result.current.trackingTaskId).toBe('task-2');
      // Should NOT have saved short session
      expect(onAddSession).not.toHaveBeenCalled();
    });

    it('stops tracking when switching to task without estimate', () => {
      const tasks = [
        createMockTask({ id: 'task-1', estimate: 30 }),
        createMockTask({ id: 'task-2' }), // No estimate
      ];

      const { result, rerender } = renderHook(
        ({ activeTaskId }) =>
          useMultiTaskTimeTracking(createProps(activeTaskId, tasks)),
        { initialProps: { activeTaskId: 'task-1' } }
      );

      expect(result.current.isTracking).toBe(true);

      rerender({ activeTaskId: 'task-2' });

      expect(result.current.isTracking).toBe(false);
      expect(result.current.trackingTaskId).toBeNull();
    });

    it('stops tracking when activeTaskId becomes null', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];

      const { result, rerender } = renderHook(
        ({ activeTaskId }) =>
          useMultiTaskTimeTracking(createProps(activeTaskId, tasks)),
        { initialProps: { activeTaskId: 'task-1' as string | null } }
      );

      expect(result.current.isTracking).toBe(true);

      rerender({ activeTaskId: null });

      expect(result.current.isTracking).toBe(false);
    });
  });

  describe('timer', () => {
    it('updates elapsed time every second', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];
      const { result } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks))
      );

      expect(result.current.elapsedMs).toBe(0);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.elapsedMs).toBe(1000);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.elapsedMs).toBe(3000);
    });

    it('stops updating when not tracking', () => {
      const tasks = [createMockTask({ id: 'task-1' })]; // No estimate
      const { result } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks))
      );

      expect(result.current.elapsedMs).toBe(0);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.elapsedMs).toBe(0);
    });
  });

  describe('localStorage persistence', () => {
    it('saves active session to localStorage', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];
      renderHook(() => useMultiTaskTimeTracking(createProps('task-1', tasks)));

      const stored = localStorage.getItem('notetaker-active-session');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.taskId).toBe('task-1');
      expect(parsed.session.id).toBeDefined();
      expect(parsed.session.startTime).toBeDefined();
    });

    it('clears localStorage when tracking stops', () => {
      const tasks = [
        createMockTask({ id: 'task-1', estimate: 30 }),
        createMockTask({ id: 'task-2' }), // No estimate
      ];

      const { rerender } = renderHook(
        ({ activeTaskId }) =>
          useMultiTaskTimeTracking(createProps(activeTaskId, tasks)),
        { initialProps: { activeTaskId: 'task-1' } }
      );

      expect(localStorage.getItem('notetaker-active-session')).not.toBeNull();

      rerender({ activeTaskId: 'task-2' });

      expect(localStorage.getItem('notetaker-active-session')).toBeNull();
    });

    it('saves active session on beforeunload', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];
      renderHook(() => useMultiTaskTimeTracking(createProps('task-1', tasks)));

      window.dispatchEvent(new Event('beforeunload'));

      const saved = localStorage.getItem('notetaker-active-session');
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed.taskId).toBe('task-1');
    });
  });

  describe('pending session storage', () => {
    it('saves pending session when switching tasks (duration >= 1 min)', () => {
      const onAddSession = vi.fn();
      const tasks = [
        createMockTask({ id: 'task-1', estimate: 30 }),
        createMockTask({ id: 'task-2', estimate: 30 }),
      ];

      const { rerender } = renderHook(
        ({ activeTaskId }) =>
          useMultiTaskTimeTracking(
            createProps(activeTaskId, tasks, onAddSession)
          ),
        { initialProps: { activeTaskId: 'task-1' } }
      );

      act(() => {
        vi.advanceTimersByTime(90000); // 90 seconds
      });

      rerender({ activeTaskId: 'task-2' });

      // Should have saved to pending storage
      const pending = JSON.parse(
        localStorage.getItem('notetaker-pending-task-1') || '[]'
      );
      expect(pending.length).toBe(1);
      expect(pending[0].endTime).toBeDefined();
    });
  });

  describe('unmount behavior', () => {
    it('saves session on unmount when duration >= 1 min', () => {
      const onAddSession = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];

      const { result, unmount } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks, onAddSession))
      );

      expect(result.current.isTracking).toBe(true);

      // Advance time by more than 1 minute
      act(() => {
        vi.advanceTimersByTime(90000); // 90 seconds
      });

      // Unmount the hook
      unmount();

      // Should have called onAddSession with the completed session
      expect(onAddSession).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        })
      );
    });

    it('does not save session on unmount when duration < 1 min', () => {
      const onAddSession = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];

      const { result, unmount } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks, onAddSession))
      );

      expect(result.current.isTracking).toBe(true);

      // Advance time by less than 1 minute
      act(() => {
        vi.advanceTimersByTime(30000); // 30 seconds
      });

      // Unmount the hook
      unmount();

      // Should NOT have called onAddSession (session too short)
      expect(onAddSession).not.toHaveBeenCalled();
    });

    it('clears localStorage on unmount', () => {
      const tasks = [createMockTask({ id: 'task-1', estimate: 30 })];

      const { unmount } = renderHook(() =>
        useMultiTaskTimeTracking(createProps('task-1', tasks))
      );

      // Verify session is in localStorage
      expect(localStorage.getItem('notetaker-active-session')).not.toBeNull();

      // Unmount
      unmount();

      // localStorage should be cleared
      expect(localStorage.getItem('notetaker-active-session')).toBeNull();
    });
  });
});
