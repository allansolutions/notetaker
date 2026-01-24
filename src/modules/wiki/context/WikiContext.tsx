import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import type { WikiPage, WikiPageTreeNode, WikiBreadcrumb } from '../types';
import { wikiApi } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

interface WikiContextType {
  pages: WikiPage[];
  tree: WikiPageTreeNode[];
  isLoading: boolean;
  error: string | null;
  addPage: (
    page: Omit<WikiPage, 'id' | 'slug' | 'createdAt' | 'updatedAt'>
  ) => Promise<WikiPage | null>;
  updatePage: (
    id: string,
    updates: Partial<Omit<WikiPage, 'id' | 'slug' | 'createdAt'>>
  ) => Promise<WikiPage | null>;
  removePage: (id: string) => Promise<void>;
  getPage: (id: string) => Promise<WikiPage | null>;
  getPageBySlug: (slug: string) => Promise<WikiPage | null>;
  getAncestors: (id: string) => Promise<WikiBreadcrumb[]>;
  movePage: (
    id: string,
    parentId: string | null,
    order: number
  ) => Promise<WikiPage | null>;
  refreshPages: () => Promise<void>;
}

const WikiContext = createContext<WikiContextType | null>(null);

/**
 * Build a tree structure from flat list of pages
 */
function buildTree(pages: WikiPage[]): WikiPageTreeNode[] {
  const nodeMap = new Map<string, WikiPageTreeNode>();
  const roots: WikiPageTreeNode[] = [];

  // Create nodes for all pages
  for (const page of pages) {
    nodeMap.set(page.id, { ...page, children: [], depth: 0 });
  }

  // Build tree structure
  for (const page of pages) {
    const node = nodeMap.get(page.id)!;
    if (page.parentId && nodeMap.has(page.parentId)) {
      const parent = nodeMap.get(page.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by order at each level
  function sortChildren(nodes: WikiPageTreeNode[]) {
    nodes.sort((a, b) => a.order - b.order);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  }
  sortChildren(roots);

  return roots;
}

export function WikiProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute tree from flat pages list
  const tree = useMemo(() => buildTree(pages), [pages]);

  const fetchPages = useCallback(async () => {
    if (!isAuthenticated) {
      setPages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await wikiApi.getAll();
      setPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pages');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const addPage = useCallback(
    async (
      page: Omit<WikiPage, 'id' | 'slug' | 'createdAt' | 'updatedAt'>
    ): Promise<WikiPage | null> => {
      try {
        const newPage = await wikiApi.create(page);
        setPages((prev) => [...prev, newPage]);
        return newPage;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create page');
        return null;
      }
    },
    []
  );

  const updatePage = useCallback(
    async (
      id: string,
      updates: Partial<Omit<WikiPage, 'id' | 'slug' | 'createdAt'>>
    ): Promise<WikiPage | null> => {
      try {
        const updatedPage = await wikiApi.update(id, updates);
        setPages((prev) => prev.map((p) => (p.id === id ? updatedPage : p)));
        return updatedPage;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update page');
        return null;
      }
    },
    []
  );

  const removePage = useCallback(async (id: string) => {
    try {
      await wikiApi.delete(id);
      // Remove the page and all its descendants
      setPages((prev) => {
        const toRemove = new Set<string>();
        toRemove.add(id);

        // Find all descendants
        let changed = true;
        while (changed) {
          changed = false;
          for (const page of prev) {
            if (
              page.parentId &&
              toRemove.has(page.parentId) &&
              !toRemove.has(page.id)
            ) {
              toRemove.add(page.id);
              changed = true;
            }
          }
        }

        return prev.filter((p) => !toRemove.has(p.id));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete page');
    }
  }, []);

  const getPage = useCallback(async (id: string): Promise<WikiPage | null> => {
    try {
      return await wikiApi.get(id);
    } catch {
      return null;
    }
  }, []);

  const getPageBySlug = useCallback(
    async (slug: string): Promise<WikiPage | null> => {
      try {
        return await wikiApi.getBySlug(slug);
      } catch {
        return null;
      }
    },
    []
  );

  const getAncestors = useCallback(
    async (id: string): Promise<WikiBreadcrumb[]> => {
      try {
        return await wikiApi.getAncestors(id);
      } catch {
        return [];
      }
    },
    []
  );

  const movePage = useCallback(
    async (
      id: string,
      parentId: string | null,
      order: number
    ): Promise<WikiPage | null> => {
      try {
        const movedPage = await wikiApi.move(id, parentId, order);
        setPages((prev) => prev.map((p) => (p.id === id ? movedPage : p)));
        return movedPage;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to move page');
        return null;
      }
    },
    []
  );

  return (
    <WikiContext.Provider
      value={{
        pages,
        tree,
        isLoading,
        error,
        addPage,
        updatePage,
        removePage,
        getPage,
        getPageBySlug,
        getAncestors,
        movePage,
        refreshPages: fetchPages,
      }}
    >
      {children}
    </WikiContext.Provider>
  );
}

export function useWiki() {
  const context = useContext(WikiContext);
  if (!context) {
    throw new Error('useWiki must be used within a WikiProvider');
  }
  return context;
}

// Export buildTree for testing
export { buildTree };
