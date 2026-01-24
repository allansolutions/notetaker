import type { Task, TimeSession, Block } from '../types';
import type { Contact, Company } from '../modules/crm/types';
import type { WikiPage, WikiBreadcrumb } from '../modules/wiki/types';

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
  blockedReason?: string;
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
    blockedReason: apiTask.blockedReason,
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

// Entity link types
export type EntityType = 'task' | 'contact' | 'company' | 'wiki-page';

export interface ApiEntityLink {
  id: string;
  userId: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  createdAt: number;
}

// Entity link operations
export const entityLinkApi = {
  /** Get all links from a source entity */
  async getFromSource(
    sourceType: EntityType,
    sourceId: string
  ): Promise<ApiEntityLink[]> {
    const data = await fetchApi<{ links: ApiEntityLink[] }>(
      `/api/links?sourceType=${sourceType}&sourceId=${sourceId}`
    );
    return data.links;
  },

  /** Get all links to a target entity (backlinks) */
  async getToTarget(
    targetType: EntityType,
    targetId: string
  ): Promise<ApiEntityLink[]> {
    const data = await fetchApi<{ links: ApiEntityLink[] }>(
      `/api/links?targetType=${targetType}&targetId=${targetId}`
    );
    return data.links;
  },

  /** Create a new link between entities */
  async create(link: {
    sourceType: EntityType;
    sourceId: string;
    targetType: EntityType;
    targetId: string;
  }): Promise<ApiEntityLink> {
    const data = await fetchApi<{ link: ApiEntityLink }>('/api/links', {
      method: 'POST',
      body: JSON.stringify(link),
    });
    return data.link;
  },

  /** Delete a link */
  async delete(id: string): Promise<void> {
    await fetchApi<{ success: boolean }>(`/api/links/${id}`, {
      method: 'DELETE',
    });
  },
};

// Contact operations
export const contactApi = {
  async getAll(): Promise<Contact[]> {
    const data = await fetchApi<{ contacts: Contact[] }>('/api/contacts');
    return data.contacts;
  },

  async get(id: string): Promise<Contact> {
    const data = await fetchApi<{ contact: Contact }>(`/api/contacts/${id}`);
    return data.contact;
  },

  async create(
    contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'company'> & {
      newCompanyName?: string;
    }
  ): Promise<Contact> {
    const data = await fetchApi<{ contact: Contact }>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
    return data.contact;
  },

  async update(
    id: string,
    updates: Partial<
      Omit<Contact, 'id' | 'createdAt' | 'company'> & {
        newCompanyName?: string;
      }
    >
  ): Promise<Contact> {
    const data = await fetchApi<{ contact: Contact }>(`/api/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.contact;
  },

  async delete(id: string): Promise<void> {
    await fetchApi<{ success: boolean }>(`/api/contacts/${id}`, {
      method: 'DELETE',
    });
  },
};

// Company operations
export const companyApi = {
  async getAll(): Promise<Company[]> {
    const data = await fetchApi<{ companies: Company[] }>('/api/companies');
    return data.companies;
  },

  async search(query: string): Promise<Company[]> {
    const data = await fetchApi<{ companies: Company[] }>(
      `/api/companies/search?q=${encodeURIComponent(query)}`
    );
    return data.companies;
  },

  async get(id: string): Promise<Company> {
    const data = await fetchApi<{ company: Company }>(`/api/companies/${id}`);
    return data.company;
  },

  async create(
    company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Company> {
    const data = await fetchApi<{ company: Company }>('/api/companies', {
      method: 'POST',
      body: JSON.stringify(company),
    });
    return data.company;
  },

  async update(
    id: string,
    updates: Partial<Omit<Company, 'id' | 'createdAt'>>
  ): Promise<Company> {
    const data = await fetchApi<{ company: Company }>(`/api/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.company;
  },

  async delete(id: string): Promise<void> {
    await fetchApi<{ success: boolean }>(`/api/companies/${id}`, {
      method: 'DELETE',
    });
  },
};

// Wiki page operations
export const wikiApi = {
  async getAll(): Promise<WikiPage[]> {
    const data = await fetchApi<{ pages: WikiPage[] }>('/api/wiki');
    // Parse blocks from JSON string if needed
    return data.pages.map((page) => ({
      ...page,
      blocks:
        typeof page.blocks === 'string' ? JSON.parse(page.blocks) : page.blocks,
    }));
  },

  async get(id: string): Promise<WikiPage> {
    const data = await fetchApi<{ page: WikiPage }>(`/api/wiki/${id}`);
    return {
      ...data.page,
      blocks:
        typeof data.page.blocks === 'string'
          ? JSON.parse(data.page.blocks)
          : data.page.blocks,
    };
  },

  async getBySlug(slug: string): Promise<WikiPage> {
    const data = await fetchApi<{ page: WikiPage }>(`/api/wiki/slug/${slug}`);
    return {
      ...data.page,
      blocks:
        typeof data.page.blocks === 'string'
          ? JSON.parse(data.page.blocks)
          : data.page.blocks,
    };
  },

  async getAncestors(id: string): Promise<WikiBreadcrumb[]> {
    const data = await fetchApi<{ ancestors: WikiBreadcrumb[] }>(
      `/api/wiki/${id}/ancestors`
    );
    return data.ancestors;
  },

  async create(
    page: Omit<WikiPage, 'id' | 'slug' | 'createdAt' | 'updatedAt'>
  ): Promise<WikiPage> {
    const data = await fetchApi<{ page: WikiPage }>('/api/wiki', {
      method: 'POST',
      body: JSON.stringify({
        ...page,
        blocks: JSON.stringify(page.blocks),
      }),
    });
    return {
      ...data.page,
      blocks:
        typeof data.page.blocks === 'string'
          ? JSON.parse(data.page.blocks)
          : data.page.blocks,
    };
  },

  async update(
    id: string,
    updates: Partial<Omit<WikiPage, 'id' | 'slug' | 'createdAt'>>
  ): Promise<WikiPage> {
    const payload: Record<string, unknown> = { ...updates };
    if (updates.blocks) {
      payload.blocks = JSON.stringify(updates.blocks);
    }
    const data = await fetchApi<{ page: WikiPage }>(`/api/wiki/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return {
      ...data.page,
      blocks:
        typeof data.page.blocks === 'string'
          ? JSON.parse(data.page.blocks)
          : data.page.blocks,
    };
  },

  async move(
    id: string,
    parentId: string | null,
    order: number
  ): Promise<WikiPage> {
    const data = await fetchApi<{ page: WikiPage }>(`/api/wiki/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify({ parentId, order }),
    });
    return {
      ...data.page,
      blocks:
        typeof data.page.blocks === 'string'
          ? JSON.parse(data.page.blocks)
          : data.page.blocks,
    };
  },

  async delete(id: string): Promise<void> {
    await fetchApi<{ success: boolean }>(`/api/wiki/${id}`, {
      method: 'DELETE',
    });
  },
};
