import { useState, useCallback, useEffect, useMemo } from 'react';
import { Block } from '../types';
import { Editor, createBlock } from './Editor';
import { useWiki } from '../modules/wiki';

interface WikiPageEmbedProps {
  block: Block;
  pageId: string;
  isSelected: boolean;
  onUnlink: (blockId: string) => void;
  onNavigateToPage: (pageId: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export function WikiPageEmbed({
  block,
  pageId,
  isSelected,
  onUnlink,
  onNavigateToPage,
  onMoveUp,
  onMoveDown,
}: WikiPageEmbedProps) {
  const { getPage, updatePage } = useWiki();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [pageIcon, setPageIcon] = useState<string | null>(null);
  const [pageBlocks, setPageBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageExists, setPageExists] = useState(true);

  // Fetch page data on mount and when pageId changes
  useEffect(() => {
    let cancelled = false;

    async function fetchPage() {
      setIsLoading(true);
      const page = await getPage(pageId);
      if (cancelled) return;

      if (!page) {
        // Page was deleted externally, unlink the embed
        setPageExists(false);
        onUnlink(block.id);
        return;
      }

      setPageTitle(page.title || 'Untitled');
      setPageIcon(page.icon);
      setPageBlocks(page.blocks.length > 0 ? page.blocks : [createBlock()]);
      setIsLoading(false);
    }

    fetchPage();

    return () => {
      cancelled = true;
    };
  }, [pageId, getPage, block.id, onUnlink]);

  // Save changes to the wiki page
  const handleBlocksChange = useCallback(
    (blocksOrUpdater: Block[] | ((prev: Block[]) => Block[])) => {
      const newBlocks =
        typeof blocksOrUpdater === 'function'
          ? blocksOrUpdater(pageBlocks)
          : blocksOrUpdater;

      setPageBlocks(newBlocks);
      // Debounce the save via updatePage
      updatePage(pageId, { blocks: newBlocks });
    },
    [pageId, pageBlocks, updatePage]
  );

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isSelected) return;

      e.preventDefault();

      switch (e.key) {
        case 'Enter':
          setIsExpanded((prev) => !prev);
          break;
        case 'Escape':
          if (isExpanded) {
            setIsExpanded(false);
          }
          break;
        case 'ArrowUp':
          if (e.metaKey && e.shiftKey) {
            onMoveUp(block.id);
          }
          break;
        case 'ArrowDown':
          if (e.metaKey && e.shiftKey) {
            onMoveDown(block.id);
          }
          break;
        case 'Backspace':
        case 'Delete':
          onUnlink(block.id);
          break;
      }
    },
    [isSelected, isExpanded, block.id, onMoveUp, onMoveDown, onUnlink]
  );

  // Memoize editor blocks to prevent unnecessary re-renders
  const memoizedBlocks = useMemo(() => pageBlocks, [pageBlocks]);

  if (!pageExists || isLoading) {
    return null;
  }

  const selectedClass = isSelected ? ' ring-2 ring-accent-ring ring-inset' : '';

  /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/click-events-have-key-events -- Custom editor block widget with selection mode */
  return (
    <div
      className={`my-2 rounded-lg border border-border bg-surface-alt overflow-hidden${selectedClass}`}
      data-block-id={block.id}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header - clicking anywhere on header toggles expand, except buttons */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-hover transition-colors"
        onClick={handleToggleExpand}
      >
        {/* Toggle chevron */}
        <button
          type="button"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          className={`shrink-0 flex items-center justify-center size-5 text-muted hover:text-primary transition-transform duration-normal ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleExpand();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M4 2l4 4-4 4V2z" />
          </svg>
        </button>

        {/* Page icon */}
        <span className="shrink-0 text-base">{pageIcon || '📄'}</span>

        {/* Page title */}
        <span className="flex-1 text-sm font-medium text-primary truncate">
          {pageTitle}
        </span>

        {/* Open in wiki button */}
        <button
          type="button"
          aria-label="Open in wiki"
          className="shrink-0 flex items-center justify-center size-6 text-muted hover:text-primary hover:bg-hover rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToPage(pageId);
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>

        {/* Unlink button */}
        <button
          type="button"
          aria-label="Unlink embed"
          className="shrink-0 flex items-center justify-center size-6 text-muted hover:text-red-500 hover:bg-hover rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onUnlink(block.id);
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Expanded content - stop propagation to allow editing */}
      {isExpanded && (
        <div
          className="border-t border-border px-4 py-3 border-l-4 border-l-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <Editor blocks={memoizedBlocks} setBlocks={handleBlocksChange} />
        </div>
      )}
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/click-events-have-key-events */
}
