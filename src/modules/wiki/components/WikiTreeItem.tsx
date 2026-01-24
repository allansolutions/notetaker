import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import type { WikiPageTreeNode } from '../types';
import { cn } from '@/lib/utils';

interface WikiTreeItemProps {
  node: WikiPageTreeNode;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}

export function WikiTreeItem({
  node,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onCreateChild,
  onDelete,
}: WikiTreeItemProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(node.id);
    },
    [node.id, onToggleExpand]
  );

  const handleSelect = useCallback(() => {
    onSelect(node.id);
  }, [node.id, onSelect]);

  const handleCreateChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCreateChild(node.id);
    },
    [node.id, onCreateChild]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(node.id);
    },
    [node.id, onDelete]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(node.id);
      }
    },
    [node.id, onSelect]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group',
          'hover:bg-muted/50',
          isSelected && 'bg-muted'
        )}
        style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/collapse toggle */}
        <button
          type="button"
          className={cn(
            'w-4 h-4 flex items-center justify-center shrink-0',
            hasChildren ? 'visible' : 'invisible'
          )}
          onClick={handleToggle}
        >
          {hasChildren &&
            (isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            ))}
        </button>

        {/* Icon */}
        <span className="shrink-0 text-sm">
          {node.icon || <FileText className="w-4 h-4 text-muted-foreground" />}
        </span>

        {/* Title */}
        <span className="flex-1 truncate text-sm text-primary">
          {node.title || 'Untitled'}
        </span>

        {/* Action buttons (visible on hover) */}
        {isHovered && (
          <div className="flex items-center gap-1">
            {node.depth < 9 && (
              <button
                type="button"
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted"
                onClick={handleCreateChild}
                title="Add child page"
              >
                <Plus className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
            <button
              type="button"
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10"
              onClick={handleDelete}
              title="Delete page"
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <WikiTreeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
