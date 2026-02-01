import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { BlockType } from '../types';

interface BlockCommand {
  id: string;
  label: string;
  type?: BlockType;
  keywords?: string[];
  children?: BlockCommand[];
}

const BLOCK_COMMANDS: BlockCommand[] = [
  {
    id: 'turn-into',
    label: 'Turn into',
    children: [
      { id: 'paragraph', label: 'Text', type: 'paragraph' },
      { id: 'h1', label: 'Heading 1', type: 'h1' },
      { id: 'h2', label: 'Heading 2', type: 'h2' },
      { id: 'h3', label: 'Heading 3', type: 'h3' },
      {
        id: 'bullet',
        label: 'Bulleted list',
        type: 'bullet',
        keywords: ['list'],
      },
      {
        id: 'numbered',
        label: 'Numbered list',
        type: 'numbered',
        keywords: ['list'],
      },
      {
        id: 'todo',
        label: 'To-do list',
        type: 'todo',
        keywords: ['checkbox', 'task', 'list'],
      },
      { id: 'quote', label: 'Quote', type: 'quote' },
      { id: 'code', label: 'Code', type: 'code' },
    ],
  },
  { id: 'delete', label: 'Delete', keywords: ['remove'] },
  { id: 'duplicate', label: 'Duplicate', keywords: ['copy', 'clone'] },
];

interface BlockCommandMenuProps {
  onConvertType: (type: BlockType) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

// Flatten commands for search results
function flattenCommands(commands: BlockCommand[]): BlockCommand[] {
  const result: BlockCommand[] = [];
  for (const cmd of commands) {
    if (cmd.children) {
      result.push(...cmd.children);
    } else {
      result.push(cmd);
    }
  }
  return result;
}

// Check if a command matches the search query
function matchesQuery(cmd: BlockCommand, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  if (cmd.label.toLowerCase().includes(lowerQuery)) return true;
  if (cmd.keywords?.some((k) => k.toLowerCase().includes(lowerQuery)))
    return true;
  return false;
}

export function BlockCommandMenu({
  onConvertType,
  onDelete,
  onDuplicate,
  onClose,
  anchorRef,
}: BlockCommandMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuIndex, setSubmenuIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSearching = searchQuery.trim().length > 0;

  // When searching, show flat filtered results
  // When not searching, show top-level commands (with submenu handling)
  const displayItems = useMemo(() => {
    if (isSearching) {
      const flat = flattenCommands(BLOCK_COMMANDS);
      return flat.filter((cmd) => matchesQuery(cmd, searchQuery));
    }
    return BLOCK_COMMANDS;
  }, [searchQuery, isSearching]);

  // Get current submenu items if viewing a submenu
  const submenuItems = useMemo(() => {
    if (!activeSubmenu) return [];
    const parent = BLOCK_COMMANDS.find((cmd) => cmd.id === activeSubmenu);
    return parent?.children ?? [];
  }, [activeSubmenu]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
    setActiveSubmenu(null);
    setSubmenuIndex(0);
  }, [searchQuery]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Position the menu below the anchor
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
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const executeCommand = useCallback(
    (cmd: BlockCommand) => {
      if (cmd.type) {
        onConvertType(cmd.type);
      } else if (cmd.id === 'delete') {
        onDelete();
      } else if (cmd.id === 'duplicate') {
        onDuplicate();
      }
      onClose();
    },
    [onConvertType, onDelete, onDuplicate, onClose]
  );

  const exitSubmenu = useCallback(() => {
    setActiveSubmenu(null);
    setSubmenuIndex(0);
  }, []);

  const enterSubmenu = useCallback((cmdId: string) => {
    setActiveSubmenu(cmdId);
    setSubmenuIndex(0);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isSearching) return false;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, displayItems.length - 1)
          );
          return true;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          return true;
        case 'Enter':
          e.preventDefault();
          if (displayItems[selectedIndex]) {
            executeCommand(displayItems[selectedIndex]);
          }
          return true;
        case 'Escape':
          e.preventDefault();
          onClose();
          return true;
      }
      return false;
    },
    [isSearching, displayItems, selectedIndex, executeCommand, onClose]
  );

  const handleSubmenuKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!activeSubmenu) return false;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSubmenuIndex((prev) =>
            Math.min(prev + 1, submenuItems.length - 1)
          );
          return true;
        case 'ArrowUp':
          e.preventDefault();
          setSubmenuIndex((prev) => Math.max(prev - 1, 0));
          return true;
        case 'ArrowLeft':
        case 'Escape':
          e.preventDefault();
          exitSubmenu();
          return true;
        case 'Enter':
          e.preventDefault();
          if (submenuItems[submenuIndex]) {
            executeCommand(submenuItems[submenuIndex]);
          }
          return true;
      }
      return false;
    },
    [activeSubmenu, submenuItems, submenuIndex, executeCommand, exitSubmenu]
  );

  const handleBrowseKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, displayItems.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'ArrowRight': {
          e.preventDefault();
          const cmd = displayItems[selectedIndex];
          if (cmd?.children) {
            enterSubmenu(cmd.id);
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const cmd = displayItems[selectedIndex];
          if (cmd?.children) {
            enterSubmenu(cmd.id);
          } else if (cmd) {
            executeCommand(cmd);
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [displayItems, selectedIndex, executeCommand, enterSubmenu, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (handleSearchKeyDown(e)) return;
      if (handleSubmenuKeyDown(e)) return;
      handleBrowseKeyDown(e);
    },
    [handleSearchKeyDown, handleSubmenuKeyDown, handleBrowseKeyDown]
  );

  const handleItemClick = useCallback(
    (cmd: BlockCommand, index: number) => {
      if (cmd.children && !isSearching) {
        setSelectedIndex(index);
        setActiveSubmenu(cmd.id);
        setSubmenuIndex(0);
      } else {
        executeCommand(cmd);
      }
    },
    [isSearching, executeCommand]
  );

  return (
    /* eslint-disable jsx-a11y/no-static-element-interactions -- Keyboard handling delegated to input */
    <div
      ref={containerRef}
      className="fixed z-50 w-56 bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* eslint-enable jsx-a11y/no-static-element-interactions */}
      {/* Search input */}
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-surface-alt border border-border rounded outline-none focus:border-accent"
        />
      </div>

      {/* Command list */}
      <div className="max-h-64 overflow-y-auto py-1">
        {displayItems.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted text-center">
            No commands found
          </div>
        ) : (
          displayItems.map((cmd, index) => {
            const isSelected = index === selectedIndex && !activeSubmenu;
            const hasSubmenu = !!cmd.children && !isSearching;
            const isSubmenuOpen = activeSubmenu === cmd.id;

            return (
              <div key={cmd.id} className="relative">
                <button
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
                    isSelected || isSubmenuOpen
                      ? 'bg-accent-subtle'
                      : 'hover:bg-hover'
                  }`}
                  onClick={() => handleItemClick(cmd, index)}
                  onMouseEnter={() => {
                    setSelectedIndex(index);
                    if (!isSearching && !cmd.children) {
                      setActiveSubmenu(null);
                    }
                  }}
                >
                  <span className="text-primary">{cmd.label}</span>
                  {hasSubmenu && <span className="text-muted text-xs">▶</span>}
                </button>

                {/* Submenu */}
                {isSubmenuOpen && submenuItems.length > 0 && (
                  <div className="absolute left-full top-0 ml-1 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-50">
                    {submenuItems.map((subCmd, subIndex) => {
                      const isSubSelected = subIndex === submenuIndex;
                      return (
                        <button
                          key={subCmd.id}
                          type="button"
                          className={`w-full flex items-center px-3 py-1.5 text-sm text-left transition-colors ${
                            isSubSelected
                              ? 'bg-accent-subtle'
                              : 'hover:bg-hover'
                          }`}
                          onClick={() => executeCommand(subCmd)}
                          onMouseEnter={() => setSubmenuIndex(subIndex)}
                        >
                          <span className="text-primary">{subCmd.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 text-xs text-muted border-t border-border bg-surface-alt flex flex-wrap gap-x-2">
        <span>
          <kbd className="px-1 py-0.5 bg-hover rounded text-[10px]">↑↓</kbd>{' '}
          Navigate
        </span>
        {!isSearching && (
          <span>
            <kbd className="px-1 py-0.5 bg-hover rounded text-[10px]">→</kbd>{' '}
            Submenu
          </span>
        )}
        <span>
          <kbd className="px-1 py-0.5 bg-hover rounded text-[10px]">Enter</kbd>{' '}
          Select
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-hover rounded text-[10px]">Esc</kbd>{' '}
          Close
        </span>
      </div>
    </div>
  );
}
