import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import {
  Task,
  TaskType,
  TaskStatus,
  TaskImportance,
  Block,
  TimeSession,
  DEFAULT_DURATION,
  SNAP_INTERVAL,
} from '../types';
import {
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  updateTaskBlocks,
} from '../utils/task-operations';
import { flushPendingSessions } from './useTimeTracking';

const TASKS_STORAGE_KEY = 'notetaker-tasks';

function getNextTimeSlot(): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.ceil(minutes / SNAP_INTERVAL) * SNAP_INTERVAL;
}

export function useTasks() {
  const [tasks, setTasks] = useLocalStorage<Task[]>(TASKS_STORAGE_KEY, []);

  // Flush any pending sessions saved during previous unmounts
  useEffect(() => {
    const pending = flushPendingSessions();
    if (pending.length > 0) {
      setTasks((prev) =>
        prev.map((task) => {
          const taskSessions = pending.filter((p) => p.taskId === task.id);
          if (taskSessions.length === 0) return task;
          return updateTask(task, {
            sessions: [
              ...(task.sessions ?? []),
              ...taskSessions.map((p) => p.session),
            ],
          });
        })
      );
    }
  }, [setTasks]);

  const addTask = useCallback(
    (
      title: string = '',
      type: TaskType = 'admin',
      status: TaskStatus = 'todo',
      importance: TaskImportance = 'mid'
    ) => {
      const newTask = createTask(title, type, status, importance);
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    },
    [setTasks]
  );

  const updateTaskById = useCallback(
    (id: string, updates: Partial<Task>) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? updateTask(task, updates) : task))
      );
    },
    [setTasks]
  );

  const removeTask = useCallback(
    (id: string) => {
      setTasks((prev) => deleteTask(prev, id));
    },
    [setTasks]
  );

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setTasks((prev) => reorderTasks(prev, fromIndex, toIndex));
    },
    [setTasks]
  );

  const updateBlocks = useCallback(
    (taskId: string, blocks: Block[]) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? updateTaskBlocks(task, blocks) : task
        )
      );
    },
    [setTasks]
  );

  const toggleScheduled = useCallback(
    (id: string) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== id) return task;
          if (task.scheduled) {
            return updateTask(task, { scheduled: false });
          }
          return updateTask(task, {
            scheduled: true,
            startTime: task.startTime ?? getNextTimeSlot(),
            duration: task.duration ?? DEFAULT_DURATION,
          });
        })
      );
    },
    [setTasks]
  );

  const setEstimate = useCallback(
    (id: string, estimate: number) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? updateTask(task, { estimate }) : task
        )
      );
    },
    [setTasks]
  );

  const addSession = useCallback(
    (id: string, session: TimeSession) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? updateTask(task, {
                sessions: [...(task.sessions ?? []), session],
              })
            : task
        )
      );
    },
    [setTasks]
  );

  const updateSession = useCallback(
    (taskId: string, sessionId: string, updates: Partial<TimeSession>) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const sessions = (task.sessions ?? []).map((session) =>
            session.id === sessionId ? { ...session, ...updates } : session
          );
          return updateTask(task, { sessions });
        })
      );
    },
    [setTasks]
  );

  const deleteSession = useCallback(
    (taskId: string, sessionId: string) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const sessions = (task.sessions ?? []).filter(
            (session) => session.id !== sessionId
          );
          return updateTask(task, { sessions });
        })
      );
    },
    [setTasks]
  );

  return {
    tasks,
    setTasks,
    addTask,
    updateTaskById,
    removeTask,
    reorder,
    updateBlocks,
    toggleScheduled,
    setEstimate,
    addSession,
    updateSession,
    deleteSession,
  };
}
