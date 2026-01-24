import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

export type CommandPaletteItemType = 'command' | 'task' | 'page' | 'contact';

export interface CommandPaletteItem {
  id: string;
  label: string;
  keywords?: string[];
  disabled?: boolean;
  /** Return false to hide this command from the palette. Checked before filtering. */
  shouldShow?: () => boolean;
  onExecute: () => void;
  type?: CommandPaletteItemType;
  icon?: ReactNode;
  meta?: string;
  snippet?: ReactNode;
  rank?: number;
}

const getNormalizedQuery = (input: string) => {
  const normalized = input.trim().toLowerCase();
  const colonIndex = normalized.indexOf(':');
  return colonIndex >= 0 ? normalized.slice(colonIndex + 1).trim() : normalized;
};

const getSearchTokens = (command: CommandPaletteItem) => {
  const labelLower = command.label.toLowerCase();
  const labelColonIndex = labelLower.indexOf(':');
  const labelAfterColon =
    labelColonIndex >= 0 ? labelLower.slice(labelColonIndex + 1).trim() : '';
  const rawTokens = [
    labelAfterColon || labelLower,
    ...(command.keywords ?? []),
  ];
  return rawTokens
    .flatMap((token) => token.toLowerCase().split(/[\s-]+/))
    .filter(Boolean);
};

const matchesQuery = (command: CommandPaletteItem, queryTokens: string[]) => {
  const searchTokens = getSearchTokens(command);
  return queryTokens.every((queryToken) =>
    searchTokens.some((token) => token.startsWith(queryToken))
  );
};

const scoreMatch = (command: CommandPaletteItem, queryTokens: string[]) => {
  if (queryTokens.length === 0) return 0;
  const searchTokens = getSearchTokens(command);
  let score = 0;
  for (const queryToken of queryTokens) {
    const match = searchTokens.find((token) => token.startsWith(queryToken));
    if (!match) continue;
    score += 1;
    if (match === queryToken) score += 0.5;
  }
  return score;
};

interface CommandPaletteProps {
  isOpen: boolean;
  commands: CommandPaletteItem[];
  getDynamicCommands?: (
    query: string,
    queryTokens: string[]
  ) => CommandPaletteItem[];
  onClose: () => void;
}

const TYPE_LABELS: Record<CommandPaletteItemType, string> = {
  command: 'Command',
  task: 'Task',
  page: 'Page',
  contact: 'Contact',
};

const getTypePriority = (type?: CommandPaletteItemType) =>
  type === 'command' ? 0 : 1;

export function CommandPalette({
  isOpen,
  commands,
  getDynamicCommands,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = useMemo(() => getNormalizedQuery(query), [query]);
  const queryTokens = useMemo(
    () => normalizedQuery.split(/\s+/).filter(Boolean),
    [normalizedQuery]
  );

  const filteredCommands = useMemo(() => {
    // First filter out commands that shouldn't show based on context
    const availableCommands = commands.filter(
      (command) => command.shouldShow?.() ?? true
    );

    if (!normalizedQuery) return availableCommands;

    return availableCommands.filter((command) =>
      matchesQuery(command, queryTokens)
    );
  }, [commands, normalizedQuery, queryTokens]);

  const dynamicCommands = useMemo(() => {
    if (!getDynamicCommands) return [];
    return getDynamicCommands(normalizedQuery, queryTokens);
  }, [getDynamicCommands, normalizedQuery, queryTokens]);

  const visibleCommands = useMemo(() => {
    const scoredCommands = filteredCommands.map((command) => ({
      ...command,
      rank:
        command.rank ??
        (queryTokens.length > 0 ? scoreMatch(command, queryTokens) : 0),
    }));

    const combined = [...scoredCommands, ...dynamicCommands];

    return combined
      .map((command, order) => ({
        command: { ...command, rank: command.rank ?? 0 },
        order,
      }))
      .sort((a, b) => {
        const typeDelta =
          getTypePriority(a.command.type) - getTypePriority(b.command.type);
        if (typeDelta !== 0) return typeDelta;
        if (queryTokens.length > 0 && b.command.rank !== a.command.rank) {
          return b.command.rank - a.command.rank;
        }
        return a.order - b.order;
      })
      .map(({ command }) => command);
  }, [dynamicCommands, filteredCommands, queryTokens]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex >= visibleCommands.length) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, visibleCommands.length]);

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

  const handleExecute = (command: CommandPaletteItem | undefined) => {
    if (!command || command.disabled) return;
    command.onExecute();
    onClose();
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) =>
        visibleCommands.length === 0 ? 0 : (prev + 1) % visibleCommands.length
      );
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) =>
        visibleCommands.length === 0
          ? 0
          : (prev - 1 + visibleCommands.length) % visibleCommands.length
      );
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      handleExecute(visibleCommands[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close command palette"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        className="relative w-full max-w-lg mx-4 rounded-xl bg-surface shadow-xl border border-border"
      >
        <div className="px-4 pt-4 pb-2">
          <h2
            id="command-palette-title"
            className="text-sm text-muted font-medium"
          >
            Command Center
          </h2>
        </div>
        <div className="px-4 pb-4">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search commands, tasks, pages, contacts..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div
          role="listbox"
          aria-label="Results"
          className="max-h-72 overflow-y-auto pb-2"
        >
          {visibleCommands.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">
              No results found.
            </div>
          ) : (
            visibleCommands.map((command, index) => {
              let commandClass = 'text-primary hover:bg-accent-subtle';
              if (command.disabled) {
                commandClass = 'text-muted cursor-not-allowed';
              } else if (index === selectedIndex) {
                commandClass = 'bg-accent-subtle text-primary';
              }

              return (
                <button
                  key={command.id}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(index)}
                  disabled={command.disabled}
                  onClick={() => handleExecute(command)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${commandClass}`}
                >
                  <div className="flex items-center gap-2">
                    {command.icon ? (
                      <span className="text-sm shrink-0">{command.icon}</span>
                    ) : null}
                    <span className="font-medium text-sm text-primary truncate">
                      {command.label}
                    </span>
                    {command.meta ? (
                      <span className="text-xs text-muted-foreground truncate">
                        {command.meta}
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                      {TYPE_LABELS[command.type ?? 'command']}
                    </span>
                  </div>
                  {command.snippet ? (
                    <div className="mt-1 text-xs text-muted leading-relaxed">
                      {command.snippet}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
