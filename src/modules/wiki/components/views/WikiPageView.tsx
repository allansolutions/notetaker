import { useState, useEffect, useCallback, useRef } from 'react';
import { useWiki } from '../../context/WikiContext';
import { WikiBreadcrumbs } from '../WikiBreadcrumbs';
import { WikiPageHeader } from '../WikiPageHeader';
import { Editor, createBlock } from '@/components/Editor';
import type {
  WikiPage,
  WikiBreadcrumb,
  WikiPageType,
  WikiCategory,
} from '../../types';
import type { Block } from '@/modules/tasks/types';

interface WikiPageViewProps {
  pageId: string;
  onNavigateToPage: (id: string) => void;
  onNavigateToList: () => void;
}

export function WikiPageView({
  pageId,
  onNavigateToPage,
  onNavigateToList,
}: WikiPageViewProps): JSX.Element {
  const { getPage, getAncestors, updatePage } = useWiki();
  const [page, setPage] = useState<WikiPage | null>(null);
  const [ancestors, setAncestors] = useState<WikiBreadcrumb[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local state for blocks (managed by Editor)
  const [blocks, setBlocks] = useState<Block[]>([]);
  const saveTimeoutRef = useRef<number | null>(null);

  // Load page data
  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setIsLoading(true);
      setError(null);

      try {
        const [pageData, ancestorData] = await Promise.all([
          getPage(pageId),
          getAncestors(pageId),
        ]);

        if (cancelled) return;

        if (pageData) {
          setPage(pageData);
          setBlocks(
            pageData.blocks.length > 0
              ? pageData.blocks
              : [createBlock('paragraph', '')]
          );
          setAncestors(ancestorData);
        } else {
          setError('Page not found');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load page');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [pageId, getPage, getAncestors]);

  // Save blocks with debounce
  useEffect(() => {
    if (!page || isLoading) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save
    saveTimeoutRef.current = window.setTimeout(() => {
      updatePage(page.id, { blocks });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [blocks, page, isLoading, updatePage]);

  const handleTitleChange = useCallback(
    (title: string) => {
      if (!page) return;
      setPage((prev) => (prev ? { ...prev, title } : null));
      updatePage(page.id, { title });
    },
    [page, updatePage]
  );

  const handleIconChange = useCallback(
    (icon: string | null) => {
      if (!page) return;
      setPage((prev) => (prev ? { ...prev, icon } : null));
      updatePage(page.id, { icon });
    },
    [page, updatePage]
  );

  const handleTypeChange = useCallback(
    (type: WikiPageType | null) => {
      if (!page) return;
      setPage((prev) => (prev ? { ...prev, type } : null));
      updatePage(page.id, { type });
    },
    [page, updatePage]
  );

  const handleCategoryChange = useCallback(
    (category: WikiCategory | null) => {
      if (!page) return;
      setPage((prev) => (prev ? { ...prev, category } : null));
      updatePage(page.id, { category });
    },
    [page, updatePage]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading page...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{error || 'Page not found'}</p>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={onNavigateToList}
        >
          Back to wiki
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <WikiBreadcrumbs
          ancestors={ancestors}
          currentPage={{ title: page.title, icon: page.icon }}
          onNavigate={onNavigateToPage}
          onNavigateHome={onNavigateToList}
        />
      </div>

      {/* Page header */}
      <WikiPageHeader
        title={page.title}
        icon={page.icon}
        type={page.type}
        category={page.category}
        onTitleChange={handleTitleChange}
        onIconChange={handleIconChange}
        onTypeChange={handleTypeChange}
        onCategoryChange={handleCategoryChange}
      />

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <Editor blocks={blocks} setBlocks={setBlocks} />
      </div>
    </div>
  );
}
