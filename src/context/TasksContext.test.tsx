/* eslint-disable sonarjs/no-nested-functions */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { TasksProvider, useTasks } from './TasksContext';
import { AuthProvider } from './AuthContext';
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

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider>
        <TasksProvider>{children}</TasksProvider>
      </AuthProvider>
    );
  };
}

describe('TasksContext', () => {
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

  describe('useTasks', () => {
    it('throws error when used outside TasksProvider', () => {
      expect(() => {
        renderHook(() => useTasks());
      }).toThrow('useTasks must be used within a TasksProvider');
    });
  });

  describe('TasksProvider', () => {
    it('shows loading state while fetching tasks', async () => {
      // Make taskApi.getAll hang to catch the loading state
      let resolveGetAll: (value: never[]) => void;
      vi.mocked(apiClient.taskApi.getAll).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveGetAll = resolve;
          })
      );

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      // Wait for auth to complete and fetch to start
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the fetch
      await act(async () => {
        resolveGetAll!([]);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('handles API error when fetching tasks', async () => {
      // Reset and set rejection for fetch error test
      vi.mocked(apiClient.taskApi.getAll).mockReset();
      vi.mocked(apiClient.taskApi.getAll).mockRejectedValue(
        new Error('Failed to fetch')
      );

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch');
      });
      expect(result.current.tasks).toEqual([]);
    });

    it('handles error when creating task fails', async () => {
      vi.mocked(apiClient.taskApi.create).mockRejectedValueOnce(
        new Error('Create failed')
      );

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createdTask = await act(async () => {
        return result.current.addTask('Test');
      });

      expect(createdTask).toBeNull();
      await waitFor(() => {
        expect(result.current.error).toBe('Create failed');
      });
    });

    it('creates task with only title and type (no importance)', async () => {
      const createdTask = {
        id: 'new-task-1',
        userId: 'user-1',
        type: 'personal',
        title: 'Test Task',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: false,
        startTime: 360,
        duration: 60,
        orderIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.taskApi.create).mockResolvedValueOnce(createdTask);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newTask = await act(async () => {
        return result.current.addTask('Test Task', 'personal', 'todo');
      });

      expect(newTask).not.toBeNull();
      expect(newTask?.title).toBe('Test Task');
      expect(newTask?.type).toBe('personal');
      expect(apiClient.taskApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          type: 'personal',
          status: 'todo',
          importance: 'mid', // Default value
        })
      );
    });

    it('handles error when updating task fails and reverts', async () => {
      const task = {
        id: 'task-1',
        userId: 'user-1',
        type: 'admin',
        title: 'Original',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: false,
        orderIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.taskApi.getAll)
        .mockResolvedValueOnce([task])
        .mockResolvedValueOnce([task]); // For revert
      vi.mocked(apiClient.taskApi.update).mockRejectedValueOnce(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateTaskById('task-1', { title: 'Updated' });
      });

      expect(result.current.error).toBe('Update failed');
    });

    it('handles error when deleting task fails and reverts', async () => {
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.taskApi.getAll)
        .mockResolvedValueOnce([task])
        .mockResolvedValueOnce([task]); // For revert
      vi.mocked(apiClient.taskApi.delete).mockRejectedValueOnce(
        new Error('Delete failed')
      );

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        await result.current.removeTask('task-1');
      });

      expect(result.current.error).toBe('Delete failed');
    });

    it('handles toggleScheduled for scheduled task', async () => {
      const task = {
        id: 'task-1',
        userId: 'user-1',
        type: 'admin',
        title: 'Task',
        status: 'todo',
        importance: 'mid',
        blocks: [],
        scheduled: true,
        startTime: 600,
        duration: 60,
        orderIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.taskApi.getAll).mockResolvedValueOnce([task]);
      vi.mocked(apiClient.taskApi.update).mockResolvedValueOnce({
        ...task,
        scheduled: false,
      });

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        await result.current.toggleScheduled('task-1');
      });

      expect(result.current.tasks[0].scheduled).toBe(false);
    });

    it('handles error when adding session fails', async () => {
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.taskApi.getAll).mockResolvedValueOnce([task]);
      vi.mocked(apiClient.sessionApi.create).mockRejectedValueOnce(
        new Error('Session create failed')
      );

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        await result.current.addSession('task-1', {
          id: 'session-1',
          startTime: 1000,
          endTime: 2000,
        });
      });

      expect(result.current.error).toBe('Session create failed');
    });

    it('handles error when updating session fails', async () => {
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.taskApi.getAll)
        .mockResolvedValueOnce([task])
        .mockResolvedValueOnce([task]);
      vi.mocked(apiClient.sessionApi.getAll).mockResolvedValue([
        {
          id: 'session-1',
          taskId: 'task-1',
          startTime: 1000,
          endTime: 2000,
          createdAt: Date.now(),
        },
      ]);
      vi.mocked(apiClient.sessionApi.update).mockRejectedValueOnce(
        new Error('Session update failed')
      );

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateSession('task-1', 'session-1', {
          endTime: 3000,
        });
      });

      expect(result.current.error).toBe('Session update failed');
    });

    it('handles error when deleting session fails', async () => {
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.taskApi.getAll)
        .mockResolvedValueOnce([task])
        .mockResolvedValueOnce([task]);
      vi.mocked(apiClient.sessionApi.getAll).mockResolvedValue([
        {
          id: 'session-1',
          taskId: 'task-1',
          startTime: 1000,
          endTime: 2000,
          createdAt: Date.now(),
        },
      ]);
      vi.mocked(apiClient.sessionApi.delete).mockRejectedValueOnce(
        new Error('Session delete failed')
      );

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteSession('task-1', 'session-1');
      });

      expect(result.current.error).toBe('Session delete failed');
    });

    it('does not fetch tasks when not authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: null }),
      });

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
      expect(apiClient.taskApi.getAll).not.toHaveBeenCalled();
    });
  });
});
