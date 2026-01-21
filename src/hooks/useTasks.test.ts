import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode, createElement } from 'react';
import { TasksProvider, useTasks } from '../context/TasksContext';
import { AuthProvider } from '../context/AuthContext';
import * as apiClient from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  taskApi: {
    getAll: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
  },
  sessionApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock fetch for AuthContext
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      AuthProvider,
      null,
      createElement(TasksProvider, null, children)
    );
  };
}

describe('useTasks', () => {
  beforeEach(() => {
    // Mock authenticated user
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: 'user-1', email: 'test@example.com' },
          settings: null,
        }),
    });

    // Default mock implementations
    vi.mocked(apiClient.taskApi.getAll).mockResolvedValue([]);
    vi.mocked(apiClient.sessionApi.getAll).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty tasks array initially', async () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tasks).toEqual([]);
  });

  it('loads tasks from API', async () => {
    const mockTasks = [
      {
        id: 'task-1',
        userId: 'user-1',
        type: 'admin',
        title: 'Existing Task',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: false,
        orderIndex: 0,
        createdAt: 1705334400000,
        updatedAt: 1705334400000,
      },
    ];
    vi.mocked(apiClient.taskApi.getAll).mockResolvedValueOnce(mockTasks);

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1);
    });

    expect(result.current.tasks[0].title).toBe('Existing Task');
  });

  describe('addTask', () => {
    it('adds a new task with default values', async () => {
      const newTask = {
        id: 'task-new',
        userId: 'user-1',
        type: 'admin',
        title: 'New Task',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: false,
        orderIndex: 0,
        createdAt: 1705334400000,
        updatedAt: 1705334400000,
      };
      vi.mocked(apiClient.taskApi.create).mockResolvedValue(newTask);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addTask('New Task');
      });

      expect(apiClient.taskApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Task',
          type: 'admin',
          status: 'todo',
          importance: 'mid',
        })
      );
      expect(result.current.tasks).toHaveLength(1);
    });

    it('adds a new task with custom values', async () => {
      const newTask = {
        id: 'task-custom',
        userId: 'user-1',
        type: 'personal',
        title: 'Custom Task',
        status: 'in-progress',
        importance: 'high',
        blocks: [],
        scheduled: false,
        orderIndex: 0,
        createdAt: 1705334400000,
        updatedAt: 1705334400000,
      };
      vi.mocked(apiClient.taskApi.create).mockResolvedValue(newTask);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addTask(
          'Custom Task',
          'personal',
          'in-progress',
          'high'
        );
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      expect(result.current.tasks[0].type).toBe('personal');
      expect(result.current.tasks[0].status).toBe('in-progress');
      expect(result.current.tasks[0].importance).toBe('high');
    });

    it('returns the newly created task', async () => {
      const newTask = {
        id: 'task-test',
        userId: 'user-1',
        type: 'admin',
        title: 'Test Task',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: false,
        orderIndex: 0,
        createdAt: 1705334400000,
        updatedAt: 1705334400000,
      };
      vi.mocked(apiClient.taskApi.create).mockResolvedValue(newTask);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdTask;
      await act(async () => {
        createdTask = await result.current.addTask('Test Task');
      });

      expect(createdTask).not.toBeNull();
      expect(createdTask!.title).toBe('Test Task');
      expect(createdTask!.id).toBe('task-test');
    });
  });

  describe('updateTaskById', () => {
    it('updates task fields', async () => {
      const initialTask = {
        id: 'task-1',
        userId: 'user-1',
        type: 'admin',
        title: 'Original Title',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: false,
        orderIndex: 0,
        createdAt: 1705334400000,
        updatedAt: 1705334400000,
      };
      vi.mocked(apiClient.taskApi.getAll).mockResolvedValue([initialTask]);
      vi.mocked(apiClient.taskApi.update).mockResolvedValue({
        ...initialTask,
        title: 'Updated Title',
      });

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      // Wait for tasks to be loaded (not just isLoading=false)
      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateTaskById('task-1', {
          title: 'Updated Title',
        });
      });

      expect(result.current.tasks[0].title).toBe('Updated Title');
    });
  });

  describe('removeTask', () => {
    it('removes task by id', async () => {
      const tasks = [
        {
          id: 'task-1',
          userId: 'user-1',
          type: 'admin',
          title: 'Task 1',
          status: 'todo',
          importance: 'mid',
          blocks: [],
          scheduled: false,
          orderIndex: 0,
          createdAt: 1705334400000,
          updatedAt: 1705334400000,
        },
        {
          id: 'task-2',
          userId: 'user-1',
          type: 'admin',
          title: 'Task 2',
          status: 'todo',
          importance: 'mid',
          blocks: [],
          scheduled: false,
          orderIndex: 1,
          createdAt: 1705334400000,
          updatedAt: 1705334400000,
        },
      ];
      vi.mocked(apiClient.taskApi.getAll).mockResolvedValue(tasks);
      vi.mocked(apiClient.taskApi.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeTask('task-1');
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].title).toBe('Task 2');
    });
  });

  describe('reorder', () => {
    it('reorders tasks', async () => {
      const tasks = [
        {
          id: 'task-1',
          userId: 'user-1',
          type: 'admin',
          title: 'Task 1',
          status: 'todo',
          importance: 'mid',
          blocks: [],
          scheduled: false,
          orderIndex: 0,
          createdAt: 1705334400000,
          updatedAt: 1705334400000,
        },
        {
          id: 'task-2',
          userId: 'user-1',
          type: 'admin',
          title: 'Task 2',
          status: 'todo',
          importance: 'mid',
          blocks: [],
          scheduled: false,
          orderIndex: 1,
          createdAt: 1705334400000,
          updatedAt: 1705334400000,
        },
        {
          id: 'task-3',
          userId: 'user-1',
          type: 'admin',
          title: 'Task 3',
          status: 'todo',
          importance: 'mid',
          blocks: [],
          scheduled: false,
          orderIndex: 2,
          createdAt: 1705334400000,
          updatedAt: 1705334400000,
        },
      ];
      vi.mocked(apiClient.taskApi.getAll).mockResolvedValue(tasks);
      vi.mocked(apiClient.taskApi.reorder).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(3);
      });

      await act(async () => {
        await result.current.reorder(0, 2);
      });

      expect(result.current.tasks[0].title).toBe('Task 2');
      expect(result.current.tasks[1].title).toBe('Task 3');
      expect(result.current.tasks[2].title).toBe('Task 1');
    });
  });

  describe('setEstimate', () => {
    it('sets estimate on task', async () => {
      const task = {
        id: 'task-1',
        userId: 'user-1',
        type: 'admin',
        title: 'Task',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: false,
        orderIndex: 0,
        createdAt: 1705334400000,
        updatedAt: 1705334400000,
      };
      vi.mocked(apiClient.taskApi.getAll).mockResolvedValueOnce([task]);
      vi.mocked(apiClient.taskApi.update).mockResolvedValueOnce({
        ...task,
        estimate: 60,
      });

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        await result.current.setEstimate('task-1', 60);
      });

      expect(result.current.tasks[0].estimate).toBe(60);
    });
  });

  describe('addSession', () => {
    it('adds a session to task', async () => {
      const task = {
        id: 'task-1',
        userId: 'user-1',
        type: 'admin',
        title: 'Task',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: false,
        orderIndex: 0,
        createdAt: 1705334400000,
        updatedAt: 1705334400000,
      };
      vi.mocked(apiClient.taskApi.getAll).mockResolvedValue([task]);

      const newSession = {
        id: 'session-1',
        taskId: 'task-1',
        startTime: 1000,
        endTime: 2000,
        createdAt: 1705334400000,
      };
      vi.mocked(apiClient.sessionApi.create).mockResolvedValue(newSession);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const session = { id: 'temp-1', startTime: 1000, endTime: 2000 };

      await act(async () => {
        await result.current.addSession('task-1', session);
      });

      expect(result.current.tasks[0].sessions).toHaveLength(1);
    });
  });
});
