import { useState, useEffect, useRef, useCallback } from 'react';
import { Task, TimeSession } from '../types';
import { generateSessionId } from '../utils/task-operations';

const ACTIVE_SESSION_KEY = 'notetaker-active-session';
const MIN_SESSION_DURATION_MS = 1 * 60 * 1000; // 1 minute

interface ActiveSessionData {
  taskId: string;
  session: TimeSession;
}

/**
 * Try to recover an existing session from localStorage.
 * Returns the session data if found for the given taskId, null otherwise.
 */
function tryRecoverSession(taskId: string): ActiveSessionData | null {
  const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!stored) return null;

  try {
    const data: ActiveSessionData = JSON.parse(stored);
    if (data.taskId === taskId) {
      return data;
    }
  } catch {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
  return null;
}

interface UseMultiTaskTimeTrackingOptions {
  activeTaskId: string | null;
  tasks: Task[];
  onAddSession: (taskId: string, session: TimeSession) => void;
}

interface UseMultiTaskTimeTrackingResult {
  trackingTaskId: string | null;
  elapsedMs: number;
  isTracking: boolean;
}

/**
 * Time tracking hook for multi-task views like TaskNotesEditor.
 * Tracks time against whichever task is currently active (has focus on a block).
 * Handles session switching when focus moves between tasks.
 */
export function useMultiTaskTimeTracking({
  activeTaskId,
  tasks,
  onAddSession,
}: UseMultiTaskTimeTrackingOptions): UseMultiTaskTimeTrackingResult {
  const [trackingTaskId, setTrackingTaskId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const currentSessionRef = useRef<TimeSession | null>(null);
  const onAddSessionRef = useRef(onAddSession);
  // Ref to keep current trackingTaskId accessible in cleanup (avoids stale closure)
  const trackingTaskIdRef = useRef<string | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    onAddSessionRef.current = onAddSession;
  }, [onAddSession]);

  // Keep trackingTaskId ref in sync with state
  useEffect(() => {
    trackingTaskIdRef.current = trackingTaskId;
  }, [trackingTaskId]);

  // Check if a task has an estimate
  const taskHasEstimate = useCallback(
    (taskId: string | null): boolean => {
      if (!taskId) return false;
      const task = tasks.find((t) => t.id === taskId);
      return task?.estimate !== undefined && task.estimate > 0;
    },
    [tasks]
  );

  const saveActiveSession = useCallback(
    (taskId: string | null, session: TimeSession | null) => {
      if (taskId && session) {
        const data: ActiveSessionData = { taskId, session };
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    },
    []
  );

  const savePendingSession = useCallback(
    (taskId: string, session: TimeSession) => {
      const duration = (session.endTime ?? Date.now()) - session.startTime;
      if (duration >= MIN_SESSION_DURATION_MS) {
        // Save to pending storage for later sync
        const pendingKey = `notetaker-pending-${taskId}`;
        const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
        pending.push(session);
        localStorage.setItem(pendingKey, JSON.stringify(pending));
        // Also call the callback directly
        onAddSessionRef.current(taskId, session);
      }
    },
    []
  );

  const endCurrentSession = useCallback(() => {
    if (currentSessionRef.current && trackingTaskId) {
      const completedSession: TimeSession = {
        ...currentSessionRef.current,
        endTime: Date.now(),
      };
      savePendingSession(trackingTaskId, completedSession);
      currentSessionRef.current = null;
      saveActiveSession(null, null);
    }
    setTrackingTaskId(null);
    setElapsedMs(0);
  }, [trackingTaskId, savePendingSession, saveActiveSession]);

  const startNewSession = useCallback(
    (taskId: string) => {
      const session: TimeSession = {
        id: generateSessionId(),
        startTime: Date.now(),
      };
      currentSessionRef.current = session;
      saveActiveSession(taskId, session);
      setTrackingTaskId(taskId);
      setElapsedMs(0);
    },
    [saveActiveSession]
  );

  // Handle switching to a new trackable task
  const switchToNewTask = useCallback(
    (newTaskId: string) => {
      // End any existing session first
      if (currentSessionRef.current && trackingTaskId) {
        const completedSession: TimeSession = {
          ...currentSessionRef.current,
          endTime: Date.now(),
        };
        savePendingSession(trackingTaskId, completedSession);
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }

      // Try to recover existing session for new task
      const recovered = tryRecoverSession(newTaskId);
      if (recovered) {
        const timeSinceStart = Date.now() - recovered.session.startTime;
        currentSessionRef.current = recovered.session;
        setElapsedMs(timeSinceStart);
        setTrackingTaskId(newTaskId);
        return;
      }

      // Start fresh session
      startNewSession(newTaskId);
    },
    [trackingTaskId, savePendingSession, startNewSession]
  );

  // Handle task switching
  useEffect(() => {
    const shouldTrack = activeTaskId && taskHasEstimate(activeTaskId);

    if (shouldTrack && activeTaskId !== trackingTaskId) {
      switchToNewTask(activeTaskId);
    } else if (!shouldTrack && trackingTaskId) {
      endCurrentSession();
    }
  }, [
    activeTaskId,
    trackingTaskId,
    taskHasEstimate,
    switchToNewTask,
    endCurrentSession,
  ]);

  // Timer tick
  useEffect(() => {
    if (!trackingTaskId || !currentSessionRef.current) return;

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - currentSessionRef.current!.startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [trackingTaskId]);

  // Handle beforeunload - save active session
  useEffect(() => {
    const handleBeforeUnload = () => {
      const taskId = trackingTaskIdRef.current;
      if (currentSessionRef.current && taskId) {
        saveActiveSession(taskId, currentSessionRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveActiveSession]);

  // Cleanup on unmount - end session if active
  useEffect(() => {
    return () => {
      const taskId = trackingTaskIdRef.current;
      if (currentSessionRef.current && taskId) {
        const completedSession: TimeSession = {
          ...currentSessionRef.current,
          endTime: Date.now(),
        };
        const duration = completedSession.endTime! - completedSession.startTime;
        if (duration >= MIN_SESSION_DURATION_MS) {
          onAddSessionRef.current(taskId, completedSession);
        }
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    };
    // Only run on unmount - using refs to avoid stale closures
  }, []);

  return {
    trackingTaskId,
    elapsedMs,
    isTracking: trackingTaskId !== null,
  };
}
