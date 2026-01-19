import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeTracking, flushPendingSessions } from './useTimeTracking';
import { TimeSession } from '../types';

describe('useTimeTracking', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    taskId: 'task-1',
    sessions: [],
    hasEstimate: true,
    onSessionComplete: vi.fn(),
  };

  describe('initialization', () => {
    it('starts a new session when hasEstimate is true', () => {
      const { result } = renderHook(() => useTimeTracking(defaultProps));

      expect(result.current.isActive).toBe(true);
      expect(result.current.elapsedMs).toBe(0);
    });

    it('does not start session when hasEstimate is false', () => {
      const { result } = renderHook(() =>
        useTimeTracking({ ...defaultProps, hasEstimate: false })
      );

      expect(result.current.isActive).toBe(false);
    });

    it('recovers active session from localStorage for same task', () => {
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

      const { result } = renderHook(() => useTimeTracking(defaultProps));

      expect(result.current.isActive).toBe(true);
      expect(result.current.elapsedMs).toBe(60000);
    });

    it('clears old session and starts new one for different task', () => {
      const existingSession = {
        taskId: 'different-task',
        session: {
          id: 'session-1',
          startTime: Date.now() - 60000,
        },
      };
      localStorage.setItem(
        'notetaker-active-session',
        JSON.stringify(existingSession)
      );

      const { result } = renderHook(() => useTimeTracking(defaultProps));

      expect(result.current.isActive).toBe(true);
      expect(result.current.elapsedMs).toBe(0);
    });

    it('handles invalid localStorage data gracefully', () => {
      localStorage.setItem('notetaker-active-session', 'invalid json');

      const { result } = renderHook(() => useTimeTracking(defaultProps));

      expect(result.current.isActive).toBe(true);
      expect(result.current.elapsedMs).toBe(0);
    });
  });

  describe('timer', () => {
    it('updates elapsed time every second', () => {
      const { result } = renderHook(() => useTimeTracking(defaultProps));

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

    it('stops updating when not active', () => {
      const { result } = renderHook(() =>
        useTimeTracking({ ...defaultProps, hasEstimate: false })
      );

      expect(result.current.elapsedMs).toBe(0);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.elapsedMs).toBe(0);
    });
  });

  describe('endCurrentSession', () => {
    it('calls onSessionComplete with completed session', () => {
      const onSessionComplete = vi.fn();
      const { result } = renderHook(() =>
        useTimeTracking({ ...defaultProps, onSessionComplete })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      act(() => {
        result.current.endCurrentSession();
      });

      expect(onSessionComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        })
      );
    });

    it('sets isActive to false', () => {
      const { result } = renderHook(() => useTimeTracking(defaultProps));

      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.endCurrentSession();
      });

      expect(result.current.isActive).toBe(false);
    });

    it('clears active session from localStorage', () => {
      renderHook(() => useTimeTracking(defaultProps));

      expect(localStorage.getItem('notetaker-active-session')).not.toBeNull();

      const { result } = renderHook(() => useTimeTracking(defaultProps));
      act(() => {
        result.current.endCurrentSession();
      });

      expect(localStorage.getItem('notetaker-active-session')).toBeNull();
    });
  });

  describe('totalCompletedMs', () => {
    it('returns 0 when no sessions', () => {
      const { result } = renderHook(() => useTimeTracking(defaultProps));

      expect(result.current.totalCompletedMs).toBe(0);
    });

    it('calculates total from completed sessions', () => {
      const sessions: TimeSession[] = [
        { id: 's1', startTime: 0, endTime: 1800000 }, // 30 min
        { id: 's2', startTime: 0, endTime: 1800000 }, // 30 min
      ];

      const { result } = renderHook(() =>
        useTimeTracking({ ...defaultProps, sessions })
      );

      expect(result.current.totalCompletedMs).toBe(3600000); // 1 hour
    });

    it('ignores sessions without endTime', () => {
      const sessions: TimeSession[] = [
        { id: 's1', startTime: 0, endTime: 1800000 },
        { id: 's2', startTime: 0 }, // No endTime
      ];

      const { result } = renderHook(() =>
        useTimeTracking({ ...defaultProps, sessions })
      );

      expect(result.current.totalCompletedMs).toBe(1800000);
    });
  });

  describe('beforeunload handling', () => {
    it('saves active session on beforeunload', () => {
      renderHook(() => useTimeTracking(defaultProps));

      window.dispatchEvent(new Event('beforeunload'));

      const saved = localStorage.getItem('notetaker-active-session');
      expect(saved).not.toBeNull();
      const parsed = JSON.parse(saved!);
      expect(parsed.taskId).toBe('task-1');
    });
  });

  describe('pending sessions', () => {
    it('flushes pending sessions on mount', () => {
      const onSessionComplete = vi.fn();
      const pendingSessions = [
        {
          taskId: 'task-1',
          session: { id: 's1', startTime: 0, endTime: 300000 }, // 5 min
        },
      ];
      localStorage.setItem(
        'notetaker-pending-sessions',
        JSON.stringify(pendingSessions)
      );

      renderHook(() => useTimeTracking({ ...defaultProps, onSessionComplete }));

      expect(onSessionComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 's1' })
      );
    });

    it('only flushes pending sessions for current task', () => {
      const onSessionComplete = vi.fn();
      const pendingSessions = [
        {
          taskId: 'task-1',
          session: { id: 's1', startTime: 0, endTime: 300000 },
        },
        {
          taskId: 'other-task',
          session: { id: 's2', startTime: 0, endTime: 300000 },
        },
      ];
      localStorage.setItem(
        'notetaker-pending-sessions',
        JSON.stringify(pendingSessions)
      );

      renderHook(() => useTimeTracking({ ...defaultProps, onSessionComplete }));

      // Should only call with s1
      expect(onSessionComplete).toHaveBeenCalledTimes(1);
      expect(onSessionComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 's1' })
      );

      // Other task's session should remain
      const remaining = localStorage.getItem('notetaker-pending-sessions');
      expect(remaining).not.toBeNull();
      const parsed = JSON.parse(remaining!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].taskId).toBe('other-task');
    });
  });
});

describe('flushPendingSessions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no pending sessions', () => {
    const result = flushPendingSessions();
    expect(result).toEqual([]);
  });

  it('returns and clears all pending sessions', () => {
    const pendingSessions = [
      {
        taskId: 'task-1',
        session: { id: 's1', startTime: 0, endTime: 300000 },
      },
      {
        taskId: 'task-2',
        session: { id: 's2', startTime: 0, endTime: 600000 },
      },
    ];
    localStorage.setItem(
      'notetaker-pending-sessions',
      JSON.stringify(pendingSessions)
    );

    const result = flushPendingSessions();

    expect(result).toHaveLength(2);
    expect(localStorage.getItem('notetaker-pending-sessions')).toBeNull();
  });
});
