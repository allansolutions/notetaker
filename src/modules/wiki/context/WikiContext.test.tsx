/* eslint-disable sonarjs/no-nested-functions */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { WikiProvider, useWiki, buildTree } from './WikiContext';
import { AuthProvider } from '@/context/AuthContext';
import * as apiClient from '@/api/client';
import type { WikiPage } from '../types';

// Mock the API client - preserve other exports
vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>();
  return {
    ...actual,
    wikiApi: {
      getAll: vi.fn(),
      get: vi.fn(),
      getBySlug: vi.fn(),
      getAncestors: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      move: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider>
        <WikiProvider>{children}</WikiProvider>
      </AuthProvider>
    );
  };
}

const createMockPage = (overrides: Partial<WikiPage> = {}): WikiPage => ({
  id: 'page-1',
  title: 'Test Page',
  slug: 'test-page',
  parentId: null,
  blocks: [],
  order: 0,
  icon: null,
  type: null,
  category: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('WikiContext', () => {
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
    vi.mocked(apiClient.wikiApi.getAll).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useWiki', () => {
    it('throws error when used outside WikiProvider', () => {
      expect(() => {
        renderHook(() => useWiki());
      }).toThrow('useWiki must be used within a WikiProvider');
    });
  });

  describe('WikiProvider', () => {
    it('shows loading state while fetching pages', async () => {
      let resolveGetAll: (value: WikiPage[]) => void;
      vi.mocked(apiClient.wikiApi.getAll).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveGetAll = resolve;
          })
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveGetAll!([]);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('handles API error when fetching pages', async () => {
      vi.mocked(apiClient.wikiApi.getAll).mockReset();
      vi.mocked(apiClient.wikiApi.getAll).mockRejectedValue(
        new Error('Failed to fetch')
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch');
      });
      expect(result.current.pages).toEqual([]);
    });

    it('creates page successfully', async () => {
      const createdPage = createMockPage({
        id: 'new-page',
        title: 'New Page',
        slug: 'new-page',
      });
      vi.mocked(apiClient.wikiApi.create).mockResolvedValueOnce(createdPage);

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newPage = await act(async () => {
        return result.current.addPage({
          title: 'New Page',
          parentId: null,
          blocks: [],
          order: 0,
          icon: null,
          type: null,
          category: null,
        });
      });

      expect(newPage).not.toBeNull();
      expect(newPage?.title).toBe('New Page');
      expect(result.current.pages).toHaveLength(1);
    });

    it('handles error when creating page fails', async () => {
      vi.mocked(apiClient.wikiApi.create).mockRejectedValueOnce(
        new Error('Create failed')
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createdPage = await act(async () => {
        return result.current.addPage({
          title: 'New Page',
          parentId: null,
          blocks: [],
          order: 0,
          icon: null,
          type: null,
          category: null,
        });
      });

      expect(createdPage).toBeNull();
      await waitFor(() => {
        expect(result.current.error).toBe('Create failed');
      });
    });

    it('updates page successfully', async () => {
      const existingPage = createMockPage({ id: 'page-1', title: 'Old Title' });
      const updatedPage = createMockPage({ id: 'page-1', title: 'New Title' });
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([existingPage]);
      vi.mocked(apiClient.wikiApi.update).mockResolvedValueOnce(updatedPage);

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });

      const updated = await act(async () => {
        return result.current.updatePage('page-1', { title: 'New Title' });
      });

      expect(updated?.title).toBe('New Title');
      expect(result.current.pages[0].title).toBe('New Title');
    });

    it('handles error when updating page fails', async () => {
      const existingPage = createMockPage({ id: 'page-1' });
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([existingPage]);
      vi.mocked(apiClient.wikiApi.update).mockRejectedValueOnce(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });

      const updated = await act(async () => {
        return result.current.updatePage('page-1', { title: 'New Title' });
      });

      expect(updated).toBeNull();
      expect(result.current.error).toBe('Update failed');
    });

    it('deletes page successfully', async () => {
      const existingPage = createMockPage({ id: 'page-1' });
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([existingPage]);
      vi.mocked(apiClient.wikiApi.delete).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });

      await act(async () => {
        await result.current.removePage('page-1');
      });

      expect(result.current.pages).toHaveLength(0);
    });

    it('deletes page and its descendants', async () => {
      const parentPage = createMockPage({ id: 'parent', title: 'Parent' });
      const childPage = createMockPage({
        id: 'child',
        title: 'Child',
        parentId: 'parent',
      });
      const grandchildPage = createMockPage({
        id: 'grandchild',
        title: 'Grandchild',
        parentId: 'child',
      });
      const siblingPage = createMockPage({ id: 'sibling', title: 'Sibling' });

      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([
        parentPage,
        childPage,
        grandchildPage,
        siblingPage,
      ]);
      vi.mocked(apiClient.wikiApi.delete).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(4);
      });

      await act(async () => {
        await result.current.removePage('parent');
      });

      // Parent, child, and grandchild should be removed
      expect(result.current.pages).toHaveLength(1);
      expect(result.current.pages[0].id).toBe('sibling');
    });

    it('handles error when deleting page fails', async () => {
      const existingPage = createMockPage({ id: 'page-1' });
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([existingPage]);
      vi.mocked(apiClient.wikiApi.delete).mockRejectedValueOnce(
        new Error('Delete failed')
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });

      await act(async () => {
        await result.current.removePage('page-1');
      });

      expect(result.current.error).toBe('Delete failed');
    });

    it('gets page by id', async () => {
      const page = createMockPage({ id: 'page-1', title: 'Test Page' });
      vi.mocked(apiClient.wikiApi.get).mockResolvedValueOnce(page);

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchedPage = await act(async () => {
        return result.current.getPage('page-1');
      });

      expect(fetchedPage?.id).toBe('page-1');
      expect(fetchedPage?.title).toBe('Test Page');
    });

    it('returns null when getting page fails', async () => {
      vi.mocked(apiClient.wikiApi.get).mockRejectedValueOnce(
        new Error('Not found')
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchedPage = await act(async () => {
        return result.current.getPage('non-existent');
      });

      expect(fetchedPage).toBeNull();
    });

    it('gets page by slug', async () => {
      const page = createMockPage({
        id: 'page-1',
        title: 'Test Page',
        slug: 'test-page',
      });
      vi.mocked(apiClient.wikiApi.getBySlug).mockResolvedValueOnce(page);

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchedPage = await act(async () => {
        return result.current.getPageBySlug('test-page');
      });

      expect(fetchedPage?.slug).toBe('test-page');
    });

    it('returns null when getting page by slug fails', async () => {
      vi.mocked(apiClient.wikiApi.getBySlug).mockRejectedValueOnce(
        new Error('Not found')
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchedPage = await act(async () => {
        return result.current.getPageBySlug('non-existent');
      });

      expect(fetchedPage).toBeNull();
    });

    it('gets ancestors for a page', async () => {
      const ancestors = [
        {
          id: 'grandparent',
          title: 'Grandparent',
          slug: 'grandparent',
          icon: null,
        },
        { id: 'parent', title: 'Parent', slug: 'parent', icon: null },
      ];
      vi.mocked(apiClient.wikiApi.getAncestors).mockResolvedValueOnce(
        ancestors
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchedAncestors = await act(async () => {
        return result.current.getAncestors('child');
      });

      expect(fetchedAncestors).toHaveLength(2);
      expect(fetchedAncestors[0].title).toBe('Grandparent');
    });

    it('returns empty array when getting ancestors fails', async () => {
      vi.mocked(apiClient.wikiApi.getAncestors).mockRejectedValueOnce(
        new Error('Failed')
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchedAncestors = await act(async () => {
        return result.current.getAncestors('page-1');
      });

      expect(fetchedAncestors).toEqual([]);
    });

    it('moves page successfully', async () => {
      const existingPage = createMockPage({
        id: 'page-1',
        parentId: null,
        order: 0,
      });
      const movedPage = createMockPage({
        id: 'page-1',
        parentId: 'new-parent',
        order: 1,
      });
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([existingPage]);
      vi.mocked(apiClient.wikiApi.move).mockResolvedValueOnce(movedPage);

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });

      const moved = await act(async () => {
        return result.current.movePage('page-1', 'new-parent', 1);
      });

      expect(moved?.parentId).toBe('new-parent');
      expect(moved?.order).toBe(1);
      expect(result.current.pages[0].parentId).toBe('new-parent');
    });

    it('handles error when moving page fails', async () => {
      const existingPage = createMockPage({ id: 'page-1' });
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([existingPage]);
      vi.mocked(apiClient.wikiApi.move).mockRejectedValueOnce(
        new Error('Move failed')
      );

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });

      const moved = await act(async () => {
        return result.current.movePage('page-1', 'new-parent', 1);
      });

      expect(moved).toBeNull();
      expect(result.current.error).toBe('Move failed');
    });

    it('does not fetch pages when not authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: null }),
      });

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pages).toEqual([]);
      expect(apiClient.wikiApi.getAll).not.toHaveBeenCalled();
    });

    it('computes tree from pages', async () => {
      const pages = [
        createMockPage({ id: 'root', title: 'Root', order: 0 }),
        createMockPage({
          id: 'child',
          title: 'Child',
          parentId: 'root',
          order: 0,
        }),
      ];
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce(pages);

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(2);
      });

      expect(result.current.tree).toHaveLength(1);
      expect(result.current.tree[0].id).toBe('root');
      expect(result.current.tree[0].children).toHaveLength(1);
      expect(result.current.tree[0].children[0].id).toBe('child');
    });

    it('refreshes pages when refreshPages is called', async () => {
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newPages = [createMockPage({ id: 'new-page', title: 'New Page' })];
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce(newPages);

      await act(async () => {
        await result.current.refreshPages();
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });
      expect(result.current.pages[0].title).toBe('New Page');
    });

    it('handles non-Error exception when creating page', async () => {
      vi.mocked(apiClient.wikiApi.create).mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createdPage = await act(async () => {
        return result.current.addPage({
          title: 'New Page',
          parentId: null,
          blocks: [],
          order: 0,
          icon: null,
          type: null,
          category: null,
        });
      });

      expect(createdPage).toBeNull();
      await waitFor(() => {
        expect(result.current.error).toBe('Failed to create page');
      });
    });

    it('handles non-Error exception when updating page', async () => {
      const existingPage = createMockPage({ id: 'page-1' });
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([existingPage]);
      vi.mocked(apiClient.wikiApi.update).mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });

      const updated = await act(async () => {
        return result.current.updatePage('page-1', { title: 'New Title' });
      });

      expect(updated).toBeNull();
      expect(result.current.error).toBe('Failed to update page');
    });

    it('handles non-Error exception when deleting page', async () => {
      const existingPage = createMockPage({ id: 'page-1' });
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([existingPage]);
      vi.mocked(apiClient.wikiApi.delete).mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });

      await act(async () => {
        await result.current.removePage('page-1');
      });

      expect(result.current.error).toBe('Failed to delete page');
    });

    it('handles non-Error exception when moving page', async () => {
      const existingPage = createMockPage({ id: 'page-1' });
      vi.mocked(apiClient.wikiApi.getAll).mockResolvedValueOnce([existingPage]);
      vi.mocked(apiClient.wikiApi.move).mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useWiki(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pages).toHaveLength(1);
      });

      const moved = await act(async () => {
        return result.current.movePage('page-1', 'new-parent', 1);
      });

      expect(moved).toBeNull();
      expect(result.current.error).toBe('Failed to move page');
    });
  });
});

describe('buildTree', () => {
  it('returns empty array for empty input', () => {
    const result = buildTree([]);
    expect(result).toEqual([]);
  });

  it('returns flat list as root nodes when no parents', () => {
    const pages = [
      createMockPage({ id: 'page-1', title: 'Page 1', order: 0 }),
      createMockPage({ id: 'page-2', title: 'Page 2', order: 1 }),
    ];

    const result = buildTree(pages);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('page-1');
    expect(result[0].depth).toBe(0);
    expect(result[0].children).toHaveLength(0);
    expect(result[1].id).toBe('page-2');
  });

  it('builds nested structure with parent-child relationships', () => {
    const pages = [
      createMockPage({ id: 'parent', title: 'Parent', order: 0 }),
      createMockPage({
        id: 'child',
        title: 'Child',
        parentId: 'parent',
        order: 0,
      }),
    ];

    const result = buildTree(pages);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('parent');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('child');
    expect(result[0].children[0].depth).toBe(1);
  });

  it('handles deeply nested structures', () => {
    const pages = [
      createMockPage({ id: 'level-0', title: 'Level 0', order: 0 }),
      createMockPage({
        id: 'level-1',
        title: 'Level 1',
        parentId: 'level-0',
        order: 0,
      }),
      createMockPage({
        id: 'level-2',
        title: 'Level 2',
        parentId: 'level-1',
        order: 0,
      }),
    ];

    const result = buildTree(pages);

    expect(result[0].depth).toBe(0);
    expect(result[0].children[0].depth).toBe(1);
    expect(result[0].children[0].children[0].depth).toBe(2);
  });

  it('sorts children by order', () => {
    const pages = [
      createMockPage({ id: 'parent', title: 'Parent', order: 0 }),
      createMockPage({
        id: 'child-b',
        title: 'Child B',
        parentId: 'parent',
        order: 2,
      }),
      createMockPage({
        id: 'child-a',
        title: 'Child A',
        parentId: 'parent',
        order: 1,
      }),
      createMockPage({
        id: 'child-c',
        title: 'Child C',
        parentId: 'parent',
        order: 0,
      }),
    ];

    const result = buildTree(pages);

    expect(result[0].children[0].id).toBe('child-c');
    expect(result[0].children[1].id).toBe('child-a');
    expect(result[0].children[2].id).toBe('child-b');
  });

  it('sorts root nodes by order', () => {
    const pages = [
      createMockPage({ id: 'page-c', title: 'Page C', order: 2 }),
      createMockPage({ id: 'page-a', title: 'Page A', order: 0 }),
      createMockPage({ id: 'page-b', title: 'Page B', order: 1 }),
    ];

    const result = buildTree(pages);

    expect(result[0].id).toBe('page-a');
    expect(result[1].id).toBe('page-b');
    expect(result[2].id).toBe('page-c');
  });

  it('treats orphaned children as root nodes', () => {
    const pages = [
      createMockPage({
        id: 'orphan',
        title: 'Orphan',
        parentId: 'non-existent',
        order: 0,
      }),
      createMockPage({ id: 'root', title: 'Root', order: 1 }),
    ];

    const result = buildTree(pages);

    // Orphan should be treated as root since parent doesn't exist
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('orphan');
    expect(result[1].id).toBe('root');
  });

  it('handles multiple root nodes with children', () => {
    const pages = [
      createMockPage({ id: 'root-1', title: 'Root 1', order: 0 }),
      createMockPage({ id: 'root-2', title: 'Root 2', order: 1 }),
      createMockPage({
        id: 'child-1',
        title: 'Child 1',
        parentId: 'root-1',
        order: 0,
      }),
      createMockPage({
        id: 'child-2',
        title: 'Child 2',
        parentId: 'root-2',
        order: 0,
      }),
    ];

    const result = buildTree(pages);

    expect(result).toHaveLength(2);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('child-1');
    expect(result[1].children).toHaveLength(1);
    expect(result[1].children[0].id).toBe('child-2');
  });
});
