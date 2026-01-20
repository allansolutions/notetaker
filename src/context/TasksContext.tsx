/* eslint-disable sonarjs/no-nested-functions */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  Task,
  TaskType,
  TaskStatus,
  TaskImportance,
  Block,
  TimeSession,
  DEFAULT_DURATION,
  SNAP_INTERVAL,
  AGENDA_START_HOUR,
} from '../types';
import { taskApi, sessionApi, ApiTask, ApiTimeSession } from '../api/client';
import { useAuth } from './AuthContext';

function getNextTimeSlot(): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.ceil(minutes / SNAP_INTERVAL) * SNAP_INTERVAL;
}

// Transform API task + sessions to frontend Task
function toTask(apiTask: ApiTask, sessions: TimeSession[] = []): Task {
  return {
    id: apiTask.id,
    type: apiTask.type as TaskType,
    title: apiTask.title,
    status: apiTask.status as TaskStatus,
    importance: apiTask.importance as TaskImportance,
    blocks: apiTask.blocks,
    scheduled: apiTask.scheduled,
    startTime: apiTask.startTime,
    duration: apiTask.duration,
    estimate: apiTask.estimate,
    dueDate: apiTask.dueDate,
    sessions,
    createdAt: apiTask.createdAt,
    updatedAt: apiTask.updatedAt,
  };
}

// Transform API session to frontend TimeSession
function toTimeSession(apiSession: ApiTimeSession): TimeSession {
  return {
    id: apiSession.id,
    startTime: apiSession.startTime,
    endTime: apiSession.endTime,
  };
}

interface TasksContextType {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  addTask: (
    title?: string,
    type?: TaskType,
    status?: TaskStatus,
    importance?: TaskImportance
  ) => Promise<Task | null>;
  updateTaskById: (id: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  reorder: (fromIndex: number, toIndex: number) => Promise<void>;
  updateBlocks: (taskId: string, blocks: Block[]) => Promise<void>;
  toggleScheduled: (id: string) => Promise<void>;
  setEstimate: (id: string, estimate: number) => Promise<void>;
  addSession: (taskId: string, session: TimeSession) => Promise<void>;
  updateSession: (
    taskId: string,
    sessionId: string,
    updates: Partial<TimeSession>
  ) => Promise<void>;
  deleteSession: (taskId: string, sessionId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tasks with their sessions
  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const apiTasks = await taskApi.getAll();

      // Fetch sessions for all tasks in parallel
      const tasksWithSessions = await Promise.all(
        apiTasks.map(async (apiTask) => {
          try {
            const apiSessions = await sessionApi.getAll(apiTask.id);
            return toTask(apiTask, apiSessions.map(toTimeSession));
          } catch {
            return toTask(apiTask, []);
          }
        })
      );

      setTasks(tasksWithSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (
      title: string = '',
      type: TaskType = 'admin',
      status: TaskStatus = 'todo',
      importance: TaskImportance = 'mid'
    ): Promise<Task | null> => {
      try {
        const apiTask = await taskApi.create({
          type,
          title,
          status,
          importance,
          blocks: [],
          scheduled: false,
          startTime: AGENDA_START_HOUR * 60,
          duration: DEFAULT_DURATION,
        });

        const newTask = toTask(apiTask, []);
        setTasks((prev) => [...prev, newTask]);
        return newTask;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create task');
        return null;
      }
    },
    []
  );

  const updateTaskById = useCallback(
    async (id: string, updates: Partial<Task>) => {
      try {
        // Optimistic update
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id
              ? { ...task, ...updates, updatedAt: Date.now() }
              : task
          )
        );

        // Don't send sessions to the task update endpoint
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sessions, ...taskUpdates } = updates;
        await taskApi.update(id, taskUpdates);
      } catch (err) {
        // Revert on error, then set error (fetchTasks clears error)
        await fetchTasks();
        setError(err instanceof Error ? err.message : 'Failed to update task');
      }
    },
    [fetchTasks]
  );

  const removeTask = useCallback(
    async (id: string) => {
      try {
        // Optimistic update
        setTasks((prev) => prev.filter((task) => task.id !== id));

        await taskApi.delete(id);
      } catch (err) {
        // Revert on error, then set error (fetchTasks clears error)
        await fetchTasks();
        setError(err instanceof Error ? err.message : 'Failed to delete task');
      }
    },
    [fetchTasks]
  );

  const reorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      try {
        // Optimistic update
        setTasks((prev) => {
          const newTasks = [...prev];
          const [removed] = newTasks.splice(fromIndex, 1);
          newTasks.splice(toIndex, 0, removed);
          return newTasks;
        });

        // Calculate new order indices
        setTasks((prev) => {
          const taskOrders = prev.map((task, index) => ({
            id: task.id,
            orderIndex: index,
          }));

          // Fire off the API call
          taskApi.reorder(taskOrders).catch(() => {
            fetchTasks();
          });

          return prev;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to reorder tasks'
        );
        await fetchTasks();
      }
    },
    [fetchTasks]
  );

  const updateBlocks = useCallback(
    async (taskId: string, blocks: Block[]) => {
      try {
        // Optimistic update
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, blocks, updatedAt: Date.now() }
              : task
          )
        );

        await taskApi.update(taskId, { blocks });
      } catch (err) {
        // Revert on error, then set error (fetchTasks clears error)
        await fetchTasks();
        setError(
          err instanceof Error ? err.message : 'Failed to update blocks'
        );
      }
    },
    [fetchTasks]
  );

  const toggleScheduled = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const updates: Partial<Task> = task.scheduled
        ? { scheduled: false }
        : {
            scheduled: true,
            startTime: task.startTime ?? getNextTimeSlot(),
            duration: task.duration ?? DEFAULT_DURATION,
          };

      await updateTaskById(id, updates);
    },
    [tasks, updateTaskById]
  );

  const setEstimate = useCallback(
    async (id: string, estimate: number) => {
      await updateTaskById(id, { estimate });
    },
    [updateTaskById]
  );

  const addSession = useCallback(
    async (taskId: string, session: TimeSession) => {
      try {
        const apiSession = await sessionApi.create(taskId, {
          startTime: session.startTime,
          endTime: session.endTime,
        });

        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  sessions: [
                    ...(task.sessions ?? []),
                    toTimeSession(apiSession),
                  ],
                }
              : task
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add session');
      }
    },
    []
  );

  const updateSession = useCallback(
    async (
      taskId: string,
      sessionId: string,
      updates: Partial<TimeSession>
    ) => {
      try {
        // Optimistic update
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  sessions: (task.sessions ?? []).map((s) =>
                    s.id === sessionId ? { ...s, ...updates } : s
                  ),
                }
              : task
          )
        );

        await sessionApi.update(taskId, sessionId, updates);
      } catch (err) {
        // Revert on error, then set error (fetchTasks clears error)
        await fetchTasks();
        setError(
          err instanceof Error ? err.message : 'Failed to update session'
        );
      }
    },
    [fetchTasks]
  );

  const deleteSession = useCallback(
    async (taskId: string, sessionId: string) => {
      try {
        // Optimistic update
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  sessions: (task.sessions ?? []).filter(
                    (s) => s.id !== sessionId
                  ),
                }
              : task
          )
        );

        await sessionApi.delete(taskId, sessionId);
      } catch (err) {
        // Revert on error, then set error (fetchTasks clears error)
        await fetchTasks();
        setError(
          err instanceof Error ? err.message : 'Failed to delete session'
        );
      }
    },
    [fetchTasks]
  );

  return (
    <TasksContext.Provider
      value={{
        tasks,
        isLoading,
        error,
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
        refreshTasks: fetchTasks,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}
