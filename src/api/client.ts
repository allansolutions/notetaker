import type { Task, TimeSession, Block } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.error || 'Request failed', response.status);
  }

  return response.json();
}

// Task API types
export interface ApiTask {
  id: string;
  userId: string;
  type: string;
  title: string;
  status: string;
  importance: string;
  blocks: Block[];
  scheduled: boolean;
  startTime?: number;
  duration?: number;
  estimate?: number;
  dueDate?: number;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface ApiTimeSession {
  id: string;
  taskId: string;
  startTime: number;
  endTime?: number;
  createdAt: number;
}

// Transform API task to frontend Task (with sessions)
export function apiTaskToTask(
  apiTask: ApiTask,
  sessions: TimeSession[] = []
): Task {
  return {
    id: apiTask.id,
    type: apiTask.type as Task['type'],
    title: apiTask.title,
    status: apiTask.status as Task['status'],
    importance: apiTask.importance as Task['importance'],
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

// Task operations
export const taskApi = {
  async getAll(): Promise<ApiTask[]> {
    const data = await fetchApi<{ tasks: ApiTask[] }>('/api/tasks');
    return data.tasks;
  },

  async get(id: string): Promise<ApiTask> {
    const data = await fetchApi<{ task: ApiTask }>(`/api/tasks/${id}`);
    return data.task;
  },

  async create(
    task: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'sessions'>>
  ): Promise<ApiTask> {
    const data = await fetchApi<{ task: ApiTask }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return data.task;
  },

  async update(
    id: string,
    updates: Partial<Omit<Task, 'id' | 'createdAt' | 'sessions'>>
  ): Promise<ApiTask> {
    const data = await fetchApi<{ task: ApiTask }>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.task;
  },

  async delete(id: string): Promise<void> {
    await fetchApi<{ success: boolean }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  async reorder(
    taskOrders: Array<{ id: string; orderIndex: number }>
  ): Promise<void> {
    await fetchApi<{ success: boolean }>('/api/tasks/reorder', {
      method: 'PUT',
      body: JSON.stringify({ taskOrders }),
    });
  },
};

// Time session operations
export const sessionApi = {
  async getAll(taskId: string): Promise<ApiTimeSession[]> {
    const data = await fetchApi<{ sessions: ApiTimeSession[] }>(
      `/api/tasks/${taskId}/sessions`
    );
    return data.sessions;
  },

  async create(
    taskId: string,
    session: { startTime: number; endTime?: number }
  ): Promise<ApiTimeSession> {
    const data = await fetchApi<{ session: ApiTimeSession }>(
      `/api/tasks/${taskId}/sessions`,
      {
        method: 'POST',
        body: JSON.stringify(session),
      }
    );
    return data.session;
  },

  async update(
    taskId: string,
    sessionId: string,
    updates: { startTime?: number; endTime?: number }
  ): Promise<ApiTimeSession> {
    const data = await fetchApi<{ session: ApiTimeSession }>(
      `/api/tasks/${taskId}/sessions/${sessionId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
    return data.session;
  },

  async delete(taskId: string, sessionId: string): Promise<void> {
    await fetchApi<{ success: boolean }>(
      `/api/tasks/${taskId}/sessions/${sessionId}`,
      {
        method: 'DELETE',
      }
    );
  },
};

// Settings operations
export interface ApiSettings {
  theme: string;
  sidebarWidth: number;
}

export const settingsApi = {
  async get(): Promise<ApiSettings> {
    const data = await fetchApi<{ settings: ApiSettings }>('/api/settings');
    return data.settings;
  },

  async update(settings: Partial<ApiSettings>): Promise<ApiSettings> {
    const data = await fetchApi<{ settings: ApiSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return data.settings;
  },
};

// Migration operations
export interface MigrationResult {
  success: boolean;
  imported: {
    tasks: number;
    idMapping: Array<{ localId: string; serverId: string }>;
  };
}

export const migrateApi = {
  async importData(data: {
    tasks: Task[];
    settings?: { theme?: string; sidebarWidth?: number };
  }): Promise<MigrationResult> {
    return fetchApi<MigrationResult>('/api/migrate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
