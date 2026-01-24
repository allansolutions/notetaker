import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CheckSquare, FileText } from 'lucide-react';
import { Task } from '../types';
import type { WikiPage } from '../modules/wiki/types';
import { useTaskSearchIndex } from '../hooks/useTaskSearchIndex';
import { highlightSnippet, tokenizeQuery } from '../utils/task-search';

interface TaskFinderProps {
  isOpen: boolean;
  tasks: Task[];
  wikiPages?: WikiPage[];
  onClose: () => void;
  onSelectTask: (taskId: string) => void;
  onSelectWikiPage?: (pageId: string) => void;
}

interface UnifiedSearchResult {
  id: string;
  type: 'task' | 'wiki';
  title: string;
  snippet?: string;
  icon?: string | null;
}

const HIGHLIGHT_CLASS =
  'bg-accent-subtle font-semibold text-primary rounded-sm px-0.5';

function searchWikiPages(
  pages: WikiPage[],
  query: string
): UnifiedSearchResult[] {
  if (!query.trim()) {
    return pages.slice(0, 10).map((page) => ({
      id: page.id,
      type: 'wiki' as const,
      title: page.title || 'Untitled',
      icon: page.icon,
    }));
  }

  const queryLower = query.toLowerCase();
  const tokens = queryLower.split(/\s+/).filter(Boolean);

  return pages
    .filter((page) => {
      const titleLower = (page.title || '').toLowerCase();
      const contentLower = page.blocks
        .map((b) => b.content)
        .join(' ')
        .toLowerCase();

      return tokens.every(
        (token) => titleLower.includes(token) || contentLower.includes(token)
      );
    })
    .slice(0, 10)
    .map((page) => {
      // Find a snippet containing the query
      let snippet: string | undefined;
      const content = page.blocks.map((b) => b.content).join(' ');
      const contentLower = content.toLowerCase();
      const firstMatchIndex = contentLower.indexOf(tokens[0]);
      if (firstMatchIndex >= 0) {
        const start = Math.max(0, firstMatchIndex - 30);
        const end = Math.min(content.length, firstMatchIndex + 70);
        snippet =
          (start > 0 ? '...' : '') +
          content.slice(start, end) +
          (end < content.length ? '...' : '');
      }

      return {
        id: page.id,
        type: 'wiki' as const,
        title: page.title || 'Untitled',
        snippet,
        icon: page.icon,
      };
    });
}

export function TaskFinder({
  isOpen,
  tasks,
  wikiPages = [],
  onClose,
  onSelectTask,
  onSelectWikiPage,
}: TaskFinderProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchTasks } = useTaskSearchIndex(tasks);

  const results = useMemo(() => {
    const taskResults = searchTasks(query).map((r) => ({
      ...r,
      type: 'task' as const,
    }));

    const wikiResults = searchWikiPages(wikiPages, query);

    // Interleave results, showing tasks first if query matches task title
    return [...taskResults, ...wikiResults].slice(0, 20);
  }, [query, searchTasks, wikiPages]);

  const queryTokens = useMemo(() => tokenizeQuery(query), [query]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(0);
    }
  }, [results.length, selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleExecute = (result: UnifiedSearchResult | undefined) => {
    if (!result) return;
    if (result.type === 'task') {
      onSelectTask(result.id);
    } else if (result.type === 'wiki' && onSelectWikiPage) {
      onSelectWikiPage(result.id);
    }
    onClose();
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) =>
        results.length === 0 ? 0 : (prev + 1) % results.length
      );
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) =>
        results.length === 0 ? 0 : (prev - 1 + results.length) % results.length
      );
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      handleExecute(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  const hasWikiPages = wikiPages.length > 0;
  const title = hasWikiPages ? 'Search' : 'Task Finder';
  const placeholder = hasWikiPages
    ? 'Search tasks and wiki pages...'
    : 'Search tasks...';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close finder"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-finder-title"
        className="relative w-full max-w-xl mx-4 rounded-xl bg-surface shadow-xl border border-border"
      >
        <div className="px-4 pt-4 pb-2">
          <h2 id="task-finder-title" className="text-sm text-muted font-medium">
            {title}
          </h2>
        </div>
        <div className="px-4 pb-4">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div
          role="listbox"
          aria-label="Results"
          className="max-h-80 overflow-y-auto pb-2"
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">
              No results found.
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => handleExecute(result)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-accent-subtle text-primary'
                    : 'text-primary hover:bg-accent-subtle'
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.type === 'task' && (
                    <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  {result.type === 'wiki' && result.icon && (
                    <span className="text-sm shrink-0">{result.icon}</span>
                  )}
                  {result.type === 'wiki' && !result.icon && (
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium text-sm text-primary truncate">
                    {result.title || 'Untitled'}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {result.type === 'task' ? 'Task' : 'Wiki'}
                  </span>
                </div>
                {result.snippet ? (
                  <div className="mt-1 text-xs text-muted leading-relaxed ml-6">
                    {highlightSnippet(
                      result.snippet,
                      queryTokens,
                      HIGHLIGHT_CLASS
                    )}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
