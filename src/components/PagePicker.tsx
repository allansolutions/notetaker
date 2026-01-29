import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useWiki, type WikiPageTreeNode } from '../modules/wiki';

interface PagePickerProps {
  onSelect: (pageId: string) => void;
  onCancel: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

function flattenTree(
  nodes: WikiPageTreeNode[],
  result: WikiPageTreeNode[] = []
): WikiPageTreeNode[] {
  for (const node of nodes) {
    result.push(node);
    flattenTree(node.children, result);
  }
  return result;
}

export function PagePicker({ onSelect, onCancel, anchorRef }: PagePickerProps) {
  const { tree, pages } = useWiki();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten the tree for display with hierarchy
  const flatPages = useMemo(() => flattenTree(tree), [tree]);

  // Filter pages based on search query
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) {
      return flatPages;
    }

    const query = searchQuery.toLowerCase();
    return pages.filter((page) => {
      const title = (page.title || 'Untitled').toLowerCase();
      return title.includes(query);
    });
  }, [flatPages, pages, searchQuery]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredPages.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Position the picker below the anchor
  useEffect(() => {
    if (!containerRef.current || !anchorRef.current) return;

    const anchor = anchorRef.current;
    const rect = anchor.getBoundingClientRect();

    containerRef.current.style.top = `${rect.bottom + 4}px`;
    containerRef.current.style.left = `${rect.left}px`;
  }, [anchorRef]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onCancel();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredPages.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredPages[selectedIndex]) {
            onSelect(filteredPages[selectedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onCancel();
          break;
      }
    },
    [filteredPages, selectedIndex, onSelect, onCancel]
  );

  const handlePageClick = useCallback(
    (pageId: string) => {
      onSelect(pageId);
    },
    [onSelect]
  );

  return (
    /* eslint-disable jsx-a11y/no-static-element-interactions -- Keyboard handling delegated to input */
    <div
      ref={containerRef}
      className="fixed z-50 w-72 bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* eslint-enable jsx-a11y/no-static-element-interactions */}
      {/* Search input */}
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-surface-alt border border-border rounded outline-none focus:border-accent"
        />
      </div>

      {/* Page list */}
      <div className="max-h-64 overflow-y-auto">
        {filteredPages.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted text-center">
            No pages found
          </div>
        ) : (
          filteredPages.map((page, index) => {
            const isFlat = !('depth' in page);
            const depth = isFlat ? 0 : (page as WikiPageTreeNode).depth;
            const isSelected = index === selectedIndex;

            return (
              <button
                key={page.id}
                type="button"
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  isSelected ? 'bg-accent-subtle' : 'hover:bg-hover'
                }`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => handlePageClick(page.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="shrink-0">{page.icon || '📄'}</span>
                <span className="truncate text-primary">
                  {page.title || 'Untitled'}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 text-xs text-muted border-t border-border bg-surface-alt">
        <span className="mr-2">
          <kbd className="px-1 py-0.5 bg-hover rounded text-[10px]">↑↓</kbd>{' '}
          Navigate
        </span>
        <span className="mr-2">
          <kbd className="px-1 py-0.5 bg-hover rounded text-[10px]">Enter</kbd>{' '}
          Select
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-hover rounded text-[10px]">Esc</kbd>{' '}
          Cancel
        </span>
      </div>
    </div>
  );
}
