import { useState, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { WikiPageTreeNode } from '../types';
import { WikiTreeItem } from './WikiTreeItem';

interface WikiTreeProps {
  tree: WikiPageTreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
  onDeletePage: (id: string) => void;
}

const STORAGE_KEY = 'wiki-tree-expanded';

function loadExpandedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore errors
  }
  return new Set();
}

function saveExpandedIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore errors
  }
}

export function WikiTree({
  tree,
  selectedId,
  onSelect,
  onCreatePage,
  onDeletePage,
}: WikiTreeProps): JSX.Element {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(loadExpandedIds);

  // Save expanded state when it changes
  useEffect(() => {
    saveExpandedIds(expandedIds);
  }, [expandedIds]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCreateChild = useCallback(
    (parentId: string) => {
      // Expand the parent to show the new child
      setExpandedIds((prev) => new Set([...prev, parentId]));
      onCreatePage(parentId);
    },
    [onCreatePage]
  );

  return (
    <div className="py-2">
      {/* Header with add button */}
      <div className="flex items-center justify-between px-3 mb-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Pages
        </h2>
        <button
          type="button"
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted"
          onClick={() => onCreatePage(null)}
          title="Add root page"
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Tree */}
      {tree.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground italic">
          No pages yet. Click + to create one.
        </p>
      ) : (
        <div>
          {tree.map((node) => (
            <WikiTreeItem
              key={node.id}
              node={node}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={handleToggleExpand}
              onCreateChild={handleCreateChild}
              onDelete={onDeletePage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
