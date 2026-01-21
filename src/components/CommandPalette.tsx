import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

export interface CommandPaletteCommand {
  id: string;
  label: string;
  keywords?: string[];
  disabled?: boolean;
  onExecute: () => void;
}

const getNormalizedQuery = (input: string) => {
  const normalized = input.trim().toLowerCase();
  const colonIndex = normalized.indexOf(':');
  return colonIndex >= 0 ? normalized.slice(colonIndex + 1).trim() : normalized;
};

const getSearchTokens = (command: CommandPaletteCommand) => {
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

const matchesQuery = (
  command: CommandPaletteCommand,
  queryTokens: string[]
) => {
  const searchTokens = getSearchTokens(command);
  return queryTokens.every((queryToken) =>
    searchTokens.some((token) => token.startsWith(queryToken))
  );
};

interface CommandPaletteProps {
  isOpen: boolean;
  commands: CommandPaletteCommand[];
  getDynamicCommands?: (query: string) => CommandPaletteCommand[];
  onClose: () => void;
}

export function CommandPalette({
  isOpen,
  commands,
  getDynamicCommands,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = getNormalizedQuery(query);

    if (!normalizedQuery) return commands;
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    return commands.filter((command) => matchesQuery(command, queryTokens));
  }, [commands, query]);

  const dynamicCommands = useMemo(() => {
    if (!getDynamicCommands) return [];
    const normalizedQuery = getNormalizedQuery(query);
    return getDynamicCommands(normalizedQuery);
  }, [getDynamicCommands, query]);

  const visibleCommands = useMemo(
    () => [...dynamicCommands, ...filteredCommands],
    [dynamicCommands, filteredCommands]
  );

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

  const handleExecute = (command: CommandPaletteCommand | undefined) => {
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
            Command Palette
          </h2>
        </div>
        <div className="px-4 pb-4">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div
          role="listbox"
          aria-label="Commands"
          className="max-h-72 overflow-y-auto pb-2"
        >
          {visibleCommands.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">
              No commands found.
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
                  {command.label}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
