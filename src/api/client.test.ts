/* eslint-disable sonarjs/no-nested-functions */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskApi, sessionApi, settingsApi, ApiError } from './client';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ApiError', () => {
    it('creates error with message and status', () => {
      const error = new ApiError('Not found', 404);
      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.name).toBe('ApiError');
    });
  });

  describe('taskApi', () => {
    describe('getAll', () => {
      it('fetches all tasks', async () => {
        const mockTasks = [{ id: 'task-1', title: 'Test' }];
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ tasks: mockTasks }),
        });

        const result = await taskApi.getAll();

        expect(result).toEqual(mockTasks);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks',
          expect.objectContaining({
            credentials: 'include',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });

      it('throws ApiError on failure', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        });

        await expect(taskApi.getAll()).rejects.toThrow(ApiError);
      });
    });

    describe('get', () => {
      it('fetches single task', async () => {
        const mockTask = { id: 'task-1', title: 'Test' };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ task: mockTask }),
        });

        const result = await taskApi.get('task-1');

        expect(result).toEqual(mockTask);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks/task-1',
          expect.anything()
        );
      });
    });

    describe('create', () => {
      it('creates a task', async () => {
        const mockTask = { id: 'task-1', title: 'New Task' };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ task: mockTask }),
        });

        const result = await taskApi.create({ title: 'New Task' });

        expect(result).toEqual(mockTask);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ title: 'New Task' }),
          })
        );
      });
    });

    describe('update', () => {
      it('updates a task', async () => {
        const mockTask = { id: 'task-1', title: 'Updated' };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ task: mockTask }),
        });

        const result = await taskApi.update('task-1', { title: 'Updated' });

        expect(result).toEqual(mockTask);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks/task-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ title: 'Updated' }),
          })
        );
      });
    });

    describe('delete', () => {
      it('deletes a task', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await taskApi.delete('task-1');

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks/task-1',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    describe('reorder', () => {
      it('reorders tasks', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await taskApi.reorder([
          { id: 'task-1', orderIndex: 0 },
          { id: 'task-2', orderIndex: 1 },
        ]);

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks/reorder',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              taskOrders: [
                { id: 'task-1', orderIndex: 0 },
                { id: 'task-2', orderIndex: 1 },
              ],
            }),
          })
        );
      });
    });
  });

  describe('sessionApi', () => {
    describe('getAll', () => {
      it('fetches sessions for a task', async () => {
        const mockSessions = [{ id: 'session-1', startTime: 1000 }];
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ sessions: mockSessions }),
        });

        const result = await sessionApi.getAll('task-1');

        expect(result).toEqual(mockSessions);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks/task-1/sessions',
          expect.anything()
        );
      });
    });

    describe('create', () => {
      it('creates a session', async () => {
        const mockSession = { id: 'session-1', startTime: 1000, endTime: 2000 };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ session: mockSession }),
        });

        const result = await sessionApi.create('task-1', {
          startTime: 1000,
          endTime: 2000,
        });

        expect(result).toEqual(mockSession);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks/task-1/sessions',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ startTime: 1000, endTime: 2000 }),
          })
        );
      });
    });

    describe('update', () => {
      it('updates a session', async () => {
        const mockSession = { id: 'session-1', startTime: 1000, endTime: 3000 };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ session: mockSession }),
        });

        const result = await sessionApi.update('task-1', 'session-1', {
          endTime: 3000,
        });

        expect(result).toEqual(mockSession);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks/task-1/sessions/session-1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ endTime: 3000 }),
          })
        );
      });
    });

    describe('delete', () => {
      it('deletes a session', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

        await sessionApi.delete('task-1', 'session-1');

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/tasks/task-1/sessions/session-1',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('settingsApi', () => {
    describe('get', () => {
      it('fetches settings', async () => {
        const mockSettings = { theme: 'dark', sidebarWidth: 300 };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ settings: mockSettings }),
        });

        const result = await settingsApi.get();

        expect(result).toEqual(mockSettings);
      });
    });

    describe('update', () => {
      it('updates settings', async () => {
        const mockSettings = { theme: 'light', sidebarWidth: 320 };
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ settings: mockSettings }),
        });

        const result = await settingsApi.update({ theme: 'light' });

        expect(result).toEqual(mockSettings);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/settings',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ theme: 'light' }),
          })
        );
      });
    });
  });

  describe('fetchApi error handling', () => {
    it('throws ApiError with message from response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' }),
      });

      await expect(taskApi.getAll()).rejects.toThrow('Bad request');
    });

    it('throws ApiError with default message when json fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(taskApi.getAll()).rejects.toThrow('Request failed');
    });
  });
});
