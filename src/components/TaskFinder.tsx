import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Task } from '../types';
import { useTaskSearchIndex } from '../hooks/useTaskSearchIndex';
import { highlightSnippet, tokenizeQuery } from '../utils/task-search';

interface TaskFinderProps {
  isOpen: boolean;
  tasks: Task[];
  onClose: () => void;
  onSelectTask: (taskId: string) => void;
}

const HIGHLIGHT_CLASS =
  'bg-accent-subtle font-semibold text-primary rounded-sm px-0.5';

export function TaskFinder({
  isOpen,
  tasks,
  onClose,
  onSelectTask,
}: TaskFinderProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchTasks } = useTaskSearchIndex(tasks);

  const results = useMemo(() => searchTasks(query), [query, searchTasks]);
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

  const handleExecute = (taskId: string | undefined) => {
    if (!taskId) return;
    onSelectTask(taskId);
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
      handleExecute(results[selectedIndex]?.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close task finder"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-finder-title"
        className="relative w-full max-w-xl mx-4 rounded-xl bg-surface shadow-xl border border-border"
      >
        <div className="px-4 pt-4 pb-2">
          <h2 id="task-finder-title" className="text-sm text-muted font-medium">
            Task Finder
          </h2>
        </div>
        <div className="px-4 pb-4">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search tasks..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div
          role="listbox"
          aria-label="Tasks"
          className="max-h-80 overflow-y-auto pb-2"
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">No tasks found.</div>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => handleExecute(result.id)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-accent-subtle text-primary'
                    : 'text-primary hover:bg-accent-subtle'
                }`}
              >
                <div className="font-medium text-sm text-primary">
                  {result.title || 'Untitled'}
                </div>
                {result.snippet ? (
                  <div className="mt-1 text-xs text-muted leading-relaxed">
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
