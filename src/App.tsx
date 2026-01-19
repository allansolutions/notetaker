import { useState, useCallback, useEffect, useRef } from 'react';
import { Editor, createBlock } from './components/Editor';
import { Outline } from './components/Outline';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ThemeProvider } from './context/ThemeContext';
import { Block, TodoMetadata } from './types';
import './styles/main.css';

const STORAGE_KEY = 'notetaker-blocks';
const SIDEBAR_WIDTH_KEY = 'notetaker-sidebar-width';
const TODO_METADATA_KEY = 'notetaker-todo-metadata';
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;

function App() {
  const [blocks, setBlocks] = useLocalStorage<Block[]>(STORAGE_KEY, [
    createBlock(),
  ]);
  const [navigateToId, setNavigateToId] = useState<string | null>(null);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(
    new Set()
  );
  const [hiddenBlockIds, setHiddenBlockIds] = useState<Set<string>>(new Set());
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>(
    SIDEBAR_WIDTH_KEY,
    DEFAULT_SIDEBAR_WIDTH
  );
  const [todoMetadata, setTodoMetadata] = useLocalStorage<
    Record<string, TodoMetadata>
  >(TODO_METADATA_KEY, {});
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, resizeRef.current.startWidth + delta)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
      setIsResizing(true);
    },
    [sidebarWidth]
  );

  const handleNavigate = useCallback((id: string) => {
    setNavigateToId(id);
  }, []);

  const handleNavigateComplete = useCallback(() => {
    setNavigateToId(null);
  }, []);

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setHiddenBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleUpdateTodoMetadata = useCallback(
    (blockId: string, metadata: TodoMetadata) => {
      setTodoMetadata((prev) => ({
        ...prev,
        [blockId]: { ...prev[blockId], ...metadata },
      }));
    },
    [setTodoMetadata]
  );

  return (
    <ThemeProvider>
      <div
        className={`flex min-h-screen ${isResizing ? 'select-none cursor-col-resize' : ''}`}
      >
        <div className="flex-1 max-w-[var(--width-content)] mx-auto py-20 px-24">
          <Editor
            blocks={blocks}
            setBlocks={setBlocks}
            navigateToId={navigateToId}
            onNavigateComplete={handleNavigateComplete}
            collapsedBlockIds={collapsedBlockIds}
            onToggleCollapse={handleToggleCollapse}
            hiddenBlockIds={hiddenBlockIds}
          />
        </div>
        <div
          data-testid="sidebar"
          className="shrink-0 bg-surface-alt sticky top-0 h-screen overflow-y-auto flex"
          style={{ width: sidebarWidth }}
        >
          {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Interactive separator (splitter) pattern */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            tabIndex={0}
            data-testid="sidebar-resize-handle"
            onMouseDown={handleResizeStart}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setSidebarWidth((w) => Math.min(MAX_SIDEBAR_WIDTH, w + 10));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setSidebarWidth((w) => Math.max(MIN_SIDEBAR_WIDTH, w - 10));
              }
            }}
            className="w-1 shrink-0 cursor-col-resize border-l border-border hover:bg-accent-subtle active:bg-accent-subtle transition-colors focus:bg-accent-subtle focus:outline-none"
          />
          {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
          <div className="flex-1 overflow-y-auto">
            <Outline
              blocks={blocks}
              onNavigate={handleNavigate}
              hiddenBlockIds={hiddenBlockIds}
              onToggleVisibility={handleToggleVisibility}
              todoMetadata={todoMetadata}
              onUpdateTodoMetadata={handleUpdateTodoMetadata}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
