import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MigrationPrompt } from './MigrationPrompt';
import { TasksProvider } from '../context/TasksContext';
import { AuthProvider } from '../context/AuthContext';
import * as apiClient from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  taskApi: {
    getAll: vi.fn(),
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
  migrateApi: {
    importData: vi.fn(),
  },
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const TASKS_STORAGE_KEY = 'notetaker-tasks';
const MIGRATION_COMPLETED_KEY = 'notetaker-migration-completed';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TasksProvider>{children}</TasksProvider>
    </AuthProvider>
  );
}

describe('MigrationPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

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

  it('does not show when no localStorage data', async () => {
    render(<MigrationPrompt />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.queryByText(/import existing tasks/i)
      ).not.toBeInTheDocument();
    });
  });

  it('does not show when migration already completed', async () => {
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify([{ id: 'task-1', title: 'Test' }])
    );
    localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');

    render(<MigrationPrompt />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.queryByText(/import existing tasks/i)
      ).not.toBeInTheDocument();
    });
  });

  it('shows prompt when localStorage has tasks', async () => {
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'task-1',
          title: 'Test',
          type: 'admin',
          status: 'todo',
          importance: 'mid',
          blocks: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ])
    );

    render(<MigrationPrompt />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/import existing tasks/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/we found 1 task/i)).toBeInTheDocument();
  });

  it('handles skip migration', async () => {
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'task-1',
          title: 'Test',
          type: 'admin',
          status: 'todo',
          importance: 'mid',
          blocks: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ])
    );

    render(<MigrationPrompt />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/import existing tasks/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/start fresh/i));

    await waitFor(() => {
      expect(
        screen.queryByText(/import existing tasks/i)
      ).not.toBeInTheDocument();
    });

    expect(localStorage.getItem(MIGRATION_COMPLETED_KEY)).toBe('true');
  });

  it('handles import migration', async () => {
    vi.mocked(apiClient.migrateApi.importData).mockResolvedValue({
      success: true,
      imported: {
        tasks: 1,
        idMapping: [{ localId: 'task-1', serverId: 'server-1' }],
      },
    });

    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'task-1',
          title: 'Test',
          type: 'admin',
          status: 'todo',
          importance: 'mid',
          blocks: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ])
    );

    render(<MigrationPrompt />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/import existing tasks/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/import tasks/i));

    await waitFor(() => {
      expect(
        screen.queryByText(/import existing tasks/i)
      ).not.toBeInTheDocument();
    });

    expect(apiClient.migrateApi.importData).toHaveBeenCalled();
    expect(localStorage.getItem(MIGRATION_COMPLETED_KEY)).toBe('true');
  });

  it('shows error when import fails', async () => {
    vi.mocked(apiClient.migrateApi.importData).mockRejectedValue(
      new Error('Import failed')
    );

    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'task-1',
          title: 'Test',
          type: 'admin',
          status: 'todo',
          importance: 'mid',
          blocks: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ])
    );

    render(<MigrationPrompt />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/import existing tasks/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/import tasks/i));

    await waitFor(() => {
      expect(screen.getByText(/import failed/i)).toBeInTheDocument();
    });
  });
});
