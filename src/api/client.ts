import type { Task, TimeSession, Block } from '../types';
import type { Team, TeamMember, TeamInvite } from '@/modules/teams/types';
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
export interface ApiTaskUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

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
  teamId?: string | null;
  assigneeId?: string | null;
  assigner?: ApiTaskUser | null;
  assignee?: ApiTaskUser | null;
  tags?: string[];
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
    teamId: apiTask.teamId,
    assigneeId: apiTask.assigneeId,
    assigner: apiTask.assigner,
    assignee: apiTask.assignee,
    tags: apiTask.tags,
    sessions,
    createdAt: apiTask.createdAt,
    updatedAt: apiTask.updatedAt,
  };
}

// Task operations
export interface TaskQueryFilters {
  teamId?: string;
  assigneeIds?: string[];
  assignerIds?: string[];
}

export const taskApi = {
  async getAll(filters?: TaskQueryFilters): Promise<ApiTask[]> {
    const params = new URLSearchParams();
    if (filters?.teamId) {
      params.set('teamId', filters.teamId);
    }
    if (filters?.assigneeIds?.length) {
      filters.assigneeIds.forEach((id) => params.append('assigneeId', id));
    }
    if (filters?.assignerIds?.length) {
      filters.assignerIds.forEach((id) => params.append('assignerId', id));
    }
    const query = params.toString();
    const endpoint = query ? `/api/tasks?${query}` : '/api/tasks';
    const data = await fetchApi<{ tasks: ApiTask[] }>(endpoint);
    return data.tasks;
  },

  async get(id: string, teamId?: string): Promise<ApiTask> {
    const params = teamId ? `?teamId=${teamId}` : '';
    const data = await fetchApi<{ task: ApiTask }>(`/api/tasks/${id}${params}`);
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
    updates: Partial<Omit<Task, 'id' | 'createdAt' | 'sessions'>>,
    teamId?: string
  ): Promise<ApiTask> {
    const params = teamId ? `?teamId=${teamId}` : '';
    const data = await fetchApi<{ task: ApiTask }>(
      `/api/tasks/${id}${params}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
    return data.task;
  },

  async delete(id: string, teamId?: string): Promise<void> {
    const params = teamId ? `?teamId=${teamId}` : '';
    await fetchApi<{ success: boolean }>(`/api/tasks/${id}${params}`, {
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
// Helper to parse blocks and tags from JSON string if needed (API may return string or array)
function parseWikiPageFields(page: WikiPage): WikiPage {
  return {
    ...page,
    blocks:
      typeof page.blocks === 'string' ? JSON.parse(page.blocks) : page.blocks,
    tags:
      typeof page.tags === 'string' ? JSON.parse(page.tags) : (page.tags ?? []),
  };
}

export const wikiApi = {
  async getAll(): Promise<WikiPage[]> {
    const data = await fetchApi<{ pages: WikiPage[] }>('/api/wiki');
    return data.pages.map(parseWikiPageFields);
  },

  async get(id: string): Promise<WikiPage> {
    const data = await fetchApi<{ page: WikiPage }>(`/api/wiki/${id}`);
    return parseWikiPageFields(data.page);
  },

  async getBySlug(slug: string): Promise<WikiPage> {
    const data = await fetchApi<{ page: WikiPage }>(`/api/wiki/slug/${slug}`);
    return parseWikiPageFields(data.page);
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
    return parseWikiPageFields(data.page);
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
    return parseWikiPageFields(data.page);
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
    return parseWikiPageFields(data.page);
  },

  async delete(id: string): Promise<void> {
    await fetchApi<{ success: boolean }>(`/api/wiki/${id}`, {
      method: 'DELETE',
    });
  },
};

// Team operations
export const teamApi = {
  async getAll(): Promise<Team[]> {
    const data = await fetchApi<{ teams: Team[] }>('/api/teams');
    return data.teams;
  },

  async get(id: string): Promise<{ team: Team; members: TeamMember[] }> {
    const data = await fetchApi<{ team: Team; members: TeamMember[] }>(
      `/api/teams/${id}`
    );
    return data;
  },

  async create(name: string): Promise<Team> {
    const data = await fetchApi<{ team: Team }>('/api/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return data.team;
  },

  async update(id: string, name: string): Promise<Team> {
    const data = await fetchApi<{ team: Team }>(`/api/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
    return data.team;
  },

  async delete(id: string): Promise<void> {
    await fetchApi<{ success: boolean }>(`/api/teams/${id}`, {
      method: 'DELETE',
    });
  },

  async getMembers(teamId: string): Promise<TeamMember[]> {
    const data = await fetchApi<{ members: TeamMember[] }>(
      `/api/teams/${teamId}/members`
    );
    return data.members;
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    await fetchApi<{ success: boolean }>(
      `/api/teams/${teamId}/members/${userId}`,
      {
        method: 'DELETE',
      }
    );
  },

  async createInvite(teamId: string, email: string): Promise<TeamInvite> {
    const data = await fetchApi<{ invite: TeamInvite }>(
      `/api/teams/${teamId}/invites`,
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
    return data.invite;
  },

  async getInvites(teamId: string): Promise<TeamInvite[]> {
    const data = await fetchApi<{ invites: TeamInvite[] }>(
      `/api/teams/${teamId}/invites`
    );
    return data.invites;
  },

  async cancelInvite(inviteId: string): Promise<void> {
    await fetchApi<{ success: boolean }>(`/api/teams/invites/${inviteId}`, {
      method: 'DELETE',
    });
  },

  async getInviteByToken(token: string): Promise<{
    invite: { id: string; email: string; expiresAt: number };
    team: { id: string; name: string } | null;
  }> {
    return fetchApi(`/api/teams/invites/token/${token}`);
  },

  async acceptInvite(token: string): Promise<Team> {
    const data = await fetchApi<{ team: Team }>(
      `/api/teams/invites/token/${token}/accept`,
      {
        method: 'POST',
      }
    );
    return data.team;
  },
};
