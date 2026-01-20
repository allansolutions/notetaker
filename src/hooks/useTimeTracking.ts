import { useState, useEffect, useRef, useCallback } from 'react';
import { TimeSession } from '../types';
import { generateSessionId, computeTimeSpent } from '../utils/task-operations';

const ACTIVE_SESSION_KEY = 'notetaker-active-session';
const MIN_SESSION_DURATION_MS = 1 * 60 * 1000; // 1 minute - sessions shorter than this are not saved

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
  const onSessionCompleteRef = useRef(onSessionComplete);

  // Keep callback ref updated
  useEffect(() => {
    onSessionCompleteRef.current = onSessionComplete;
  }, [onSessionComplete]);

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

  const completeSession = useCallback((session: TimeSession) => {
    const duration = (session.endTime ?? Date.now()) - session.startTime;
    // Only save sessions >= minimum duration
    if (duration >= MIN_SESSION_DURATION_MS) {
      onSessionCompleteRef.current(session);
    }
  }, []);

  const endCurrentSession = useCallback(() => {
    if (currentSessionRef.current) {
      const completedSession: TimeSession = {
        ...currentSessionRef.current,
        endTime: Date.now(),
      };
      completeSession(completedSession);
      currentSessionRef.current = null;
      saveActiveSession(null);
      setIsActive(false);
    }
  }, [completeSession, saveActiveSession]);

  const startNewSession = useCallback(() => {
    const session: TimeSession = {
      id: generateSessionId(),
      startTime: Date.now(),
    };
    currentSessionRef.current = session;
    saveActiveSession(session);
    setElapsedMs(0);
    setIsActive(true);
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
        } else {
          // Different task - save old session and start new
          const oldSession: TimeSession = {
            ...data.session,
            endTime: Date.now(),
          };
          const duration = oldSession.endTime! - oldSession.startTime;
          if (duration >= MIN_SESSION_DURATION_MS) {
            // Save to localStorage for later sync (will be picked up by that task's context)
            const pendingKey = `notetaker-pending-${data.taskId}`;
            const pending = JSON.parse(
              localStorage.getItem(pendingKey) || '[]'
            );
            pending.push(oldSession);
            localStorage.setItem(pendingKey, JSON.stringify(pending));
          }
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
      // End session on unmount - try to save via API
      if (currentSessionRef.current) {
        const completedSession: TimeSession = {
          ...currentSessionRef.current,
          endTime: Date.now(),
        };
        const duration = completedSession.endTime! - completedSession.startTime;
        if (duration >= MIN_SESSION_DURATION_MS) {
          // Call the completion callback (which triggers API save)
          onSessionCompleteRef.current(completedSession);
        }
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      }
    };
  }, [taskId, hasEstimate, startNewSession]);

  // Timer tick
  useEffect(() => {
    if (!isActive || !currentSessionRef.current) return;

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - currentSessionRef.current!.startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Handle beforeunload - save active session
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
