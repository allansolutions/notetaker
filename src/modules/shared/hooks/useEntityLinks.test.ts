import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEntityLinks } from './useEntityLinks';
import { entityLinkApi } from '@/api/client';

// Mock the API
vi.mock('@/api/client', () => ({
  entityLinkApi: {
    getFromSource: vi.fn(),
    getToTarget: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockLinks = [
  {
    id: 'link-1',
    userId: 'user-1',
    sourceType: 'task' as const,
    sourceId: 'task-123',
    targetType: 'contact' as const,
    targetId: 'contact-456',
    createdAt: Date.now(),
  },
];

const mockBacklinks = [
  {
    id: 'link-2',
    userId: 'user-1',
    sourceType: 'company' as const,
    sourceId: 'company-789',
    targetType: 'task' as const,
    targetId: 'task-123',
    createdAt: Date.now(),
  },
];

describe('useEntityLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(entityLinkApi.getFromSource).mockResolvedValue(mockLinks);
    vi.mocked(entityLinkApi.getToTarget).mockResolvedValue(mockBacklinks);
  });

  it('fetches links on mount by default', async () => {
    const { result } = renderHook(() =>
      useEntityLinks({ sourceRef: { type: 'task', id: 'task-123' } })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(entityLinkApi.getFromSource).toHaveBeenCalledWith(
      'task',
      'task-123'
    );
    expect(entityLinkApi.getToTarget).toHaveBeenCalledWith('task', 'task-123');
    expect(result.current.links).toHaveLength(1);
    expect(result.current.backlinks).toHaveLength(1);
  });

  it('does not fetch on mount when fetchOnMount is false', async () => {
    const { result } = renderHook(() =>
      useEntityLinks({
        sourceRef: { type: 'task', id: 'task-123' },
        fetchOnMount: false,
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(entityLinkApi.getFromSource).not.toHaveBeenCalled();
    expect(entityLinkApi.getToTarget).not.toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    vi.mocked(entityLinkApi.getFromSource).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() =>
      useEntityLinks({ sourceRef: { type: 'task', id: 'task-123' } })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('adds a link', async () => {
    const newLink = {
      id: 'link-new',
      userId: 'user-1',
      sourceType: 'task' as const,
      sourceId: 'task-123',
      targetType: 'company' as const,
      targetId: 'company-new',
      createdAt: Date.now(),
    };
    vi.mocked(entityLinkApi.create).mockResolvedValue(newLink);

    const { result } = renderHook(() =>
      useEntityLinks({ sourceRef: { type: 'task', id: 'task-123' } })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addLink({ type: 'company', id: 'company-new' });
    });

    expect(entityLinkApi.create).toHaveBeenCalledWith({
      sourceType: 'task',
      sourceId: 'task-123',
      targetType: 'company',
      targetId: 'company-new',
    });
    expect(result.current.links).toHaveLength(2);
  });

  it('handles add link error', async () => {
    vi.mocked(entityLinkApi.create).mockRejectedValue(
      new Error('Create failed')
    );

    const { result } = renderHook(() =>
      useEntityLinks({ sourceRef: { type: 'task', id: 'task-123' } })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify the error is thrown
    await expect(
      result.current.addLink({ type: 'company', id: 'company-new' })
    ).rejects.toThrow('Create failed');
  });

  it('removes a link', async () => {
    vi.mocked(entityLinkApi.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useEntityLinks({ sourceRef: { type: 'task', id: 'task-123' } })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.removeLink('link-1');
    });

    expect(entityLinkApi.delete).toHaveBeenCalledWith('link-1');
    expect(result.current.links).toHaveLength(0);
  });

  it('handles remove link error', async () => {
    vi.mocked(entityLinkApi.delete).mockRejectedValue(
      new Error('Delete failed')
    );

    const { result } = renderHook(() =>
      useEntityLinks({ sourceRef: { type: 'task', id: 'task-123' } })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify the error is thrown
    await expect(result.current.removeLink('link-1')).rejects.toThrow(
      'Delete failed'
    );
  });

  it('refreshes links', async () => {
    const { result } = renderHook(() =>
      useEntityLinks({ sourceRef: { type: 'task', id: 'task-123' } })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.clearAllMocks();
    vi.mocked(entityLinkApi.getFromSource).mockResolvedValue([]);
    vi.mocked(entityLinkApi.getToTarget).mockResolvedValue([]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(entityLinkApi.getFromSource).toHaveBeenCalledTimes(1);
    expect(entityLinkApi.getToTarget).toHaveBeenCalledTimes(1);
    expect(result.current.links).toHaveLength(0);
    expect(result.current.backlinks).toHaveLength(0);
  });
});
