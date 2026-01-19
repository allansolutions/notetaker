import { useState, useEffect, useRef, useCallback } from 'react';
import { TimeSession } from '../types';
import { generateSessionId, computeTimeSpent } from '../utils/task-operations';

const ACTIVE_SESSION_KEY = 'notetaker-active-session';
const SLEEP_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

interface ActiveSessionData {
  taskId: string;
  session: TimeSession;
}

interface UseTimeTrackingOptions {
  taskId: string;
  sessions: TimeSession[];
  hasEstimate: boolean;
  onSessionComplete: (session: TimeSession) => void;
}

export function useTimeTracking({
  taskId,
  sessions,
  hasEstimate,
  onSessionComplete,
}: UseTimeTrackingOptions) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const currentSessionRef = useRef<TimeSession | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  const totalCompleted = computeTimeSpent(sessions);

  const saveActiveSession = useCallback(
    (session: TimeSession | null) => {
      if (session) {
        const data: ActiveSessionData = { taskId, session };
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    },
    [taskId]
  );

  const endCurrentSession = useCallback(() => {
    if (currentSessionRef.current) {
      const completedSession: TimeSession = {
        ...currentSessionRef.current,
        endTime: Date.now(),
      };
      onSessionComplete(completedSession);
      currentSessionRef.current = null;
      saveActiveSession(null);
      setIsActive(false);
    }
  }, [onSessionComplete, saveActiveSession]);

  const startNewSession = useCallback(() => {
    const session: TimeSession = {
      id: generateSessionId(),
      startTime: Date.now(),
    };
    currentSessionRef.current = session;
    saveActiveSession(session);
    setIsActive(true);
    lastTickRef.current = Date.now();
  }, [saveActiveSession]);

  // Initialize: recover active session or start new one
  useEffect(() => {
    if (!hasEstimate) return;

    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (stored) {
      try {
        const data: ActiveSessionData = JSON.parse(stored);
        if (data.taskId === taskId) {
          // Recover session for this task
          const timeSinceStart = Date.now() - data.session.startTime;
          currentSessionRef.current = data.session;
          setElapsedMs(timeSinceStart);
          setIsActive(true);
          lastTickRef.current = Date.now();
        } else {
          // Different task - end old session silently and start new
          localStorage.removeItem(ACTIVE_SESSION_KEY);
          startNewSession();
        }
      } catch {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        startNewSession();
      }
    } else {
      startNewSession();
    }

    return () => {
      // End session on unmount
      if (currentSessionRef.current) {
        const completedSession: TimeSession = {
          ...currentSessionRef.current,
          endTime: Date.now(),
        };
        onSessionComplete(completedSession);
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, hasEstimate]);

  // Timer tick
  useEffect(() => {
    if (!isActive || !currentSessionRef.current) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastTick = now - lastTickRef.current;

      // Detect sleep/wake (gap > 2 minutes)
      if (timeSinceLastTick > SLEEP_THRESHOLD_MS) {
        // End current session at last known time
        const sessionEndTime = lastTickRef.current;
        const completedSession: TimeSession = {
          ...currentSessionRef.current!,
          endTime: sessionEndTime,
        };
        onSessionComplete(completedSession);

        // Start new session
        const newSession: TimeSession = {
          id: generateSessionId(),
          startTime: now,
        };
        currentSessionRef.current = newSession;
        saveActiveSession(newSession);
        setElapsedMs(0);
      } else {
        setElapsedMs(now - currentSessionRef.current!.startTime);
      }

      lastTickRef.current = now;
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onSessionComplete, saveActiveSession]);

  // Handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentSessionRef.current) {
        saveActiveSession(currentSessionRef.current);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveActiveSession]);

  return {
    elapsedMs,
    totalCompletedMs: totalCompleted,
    isActive,
    endCurrentSession,
  };
}
