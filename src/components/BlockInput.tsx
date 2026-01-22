import { useRef, useLayoutEffect, KeyboardEvent } from 'react';
import { Block, BlockType } from '../types';
import { detectBlockType, stripPrefix } from '../utils/markdown';
import { blockTypeClasses } from '../utils/block-styles';
import { SplitInfo } from '../utils/block-operations';

export type { SplitInfo };

interface BlockInputProps {
  block: Block;
  onUpdate: (id: string, content: string, type: BlockType) => void;
  onEnter: (id: string, splitInfo?: SplitInfo) => void;
  onBackspace: (id: string) => void;
  onMerge: (id: string) => void;
  onFocus: (id: string) => void;
  onArrowUp: (id: string) => void;
  onArrowDown: (id: string) => void;
  isFocused: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEnterEdit: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  numberedIndex: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  /** Cursor offset to use when focusing this block (for merge operations) */
  pendingCursorOffset?: number | null;
  /** True if this is the last block of its task (enables $ task creation) */
  isLastBlock?: boolean;
  /** Callback when user types $ prefix and presses Enter in last block */
  onTaskCreate?: (title: string) => void;
  /** Callback to indent a bullet block (Tab key) */
  onIndent?: (id: string) => void;
  /** Callback to unindent a bullet block (Shift+Tab key) */
  onUnindent?: (id: string) => void;
}

const wrapperBaseClasses: Partial<Record<BlockType, string>> = {
  h1: 'flex items-center pt-4 first:pt-0',
  quote: 'flex items-center my-px border-l-[3px] border-primary pl-3.5 ml-0.5',
};

const placeholders: Partial<Record<BlockType, string>> = {
  paragraph: "Type '/' for commands...",
  code: 'Code',
};

// Helper to get cursor position in a contentEditable element
function getCursorPosition(
  el: HTMLDivElement,
  sel: Selection | null,
  textLength: number
): number {
  if (!sel || sel.rangeCount === 0) return textLength;
  const range = sel.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(el);
  preCaretRange.setEnd(range.startContainer, range.startOffset);
  return preCaretRange.toString().length;
}

export function BlockInput({
  block,
  onUpdate,
  onEnter,
  onBackspace,
  onMerge,
  onFocus,
  onArrowUp,
  onArrowDown,
  isFocused,
  isSelected,
  onSelect,
  onEnterEdit,
  onMoveUp,
  onMoveDown,
  numberedIndex,
  isCollapsed,
  onToggleCollapse,
  pendingCursorOffset,
  isLastBlock,
  onTaskCreate,
  onIndent,
  onUnindent,
}: BlockInputProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const cursorPositionedRef = useRef(false);

  // Reset cursor positioned flag when focus is lost
  useLayoutEffect(() => {
    if (!isFocused) {
      cursorPositionedRef.current = false;
    }
  }, [isFocused]);

  // Focus wrapper when selected
  useLayoutEffect(() => {
    if (isSelected && wrapperRef.current) {
      // Small delay to ensure blur has completed
      setTimeout(() => {
        wrapperRef.current?.focus();
      }, 0);
    }
  }, [isSelected]);

  // Set initial content only once on mount
  useLayoutEffect(() => {
    if (inputRef.current && isInitialMount.current) {
      inputRef.current.textContent = block.content;
      isInitialMount.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: only set content on initial mount, not on updates
  }, []);

  // Sync content and position cursor when merge happens
  useLayoutEffect(() => {
    if (pendingCursorOffset != null && inputRef.current) {
      const el = inputRef.current;
      // Sync content first
      el.textContent = block.content;
      // Mark that we've positioned the cursor for this focus session
      cursorPositionedRef.current = true;
      // Then position cursor at the join point
      setTimeout(() => {
        el.focus();
        if (!el.firstChild) return;
        const range = document.createRange();
        const sel = window.getSelection();
        const offset = Math.min(
          pendingCursorOffset,
          el.textContent?.length || 0
        );
        range.setStart(el.firstChild, offset);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }, 0);
    }
  }, [pendingCursorOffset, block.content]);

  // Handle focus changes (default behavior - cursor to end)
  useLayoutEffect(() => {
    // Skip if cursor was already positioned (by merge effect or previous focus)
    if (cursorPositionedRef.current) return;

    if (isFocused && inputRef.current && block.type !== 'divider') {
      cursorPositionedRef.current = true;
      const el = inputRef.current;
      // Use setTimeout(0) to ensure React has fully committed
      setTimeout(() => {
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        if (el.childNodes.length > 0) {
          // Move cursor to end (default behavior)
          range.selectNodeContents(el);
          range.collapse(false);
        } else {
          range.setStart(el, 0);
          range.collapse(true);
        }
        sel?.removeAllRanges();
        sel?.addRange(range);
      }, 0);
    }
  }, [isFocused, block.id, block.type, pendingCursorOffset]);

  const handleInput = () => {
    const text = inputRef.current?.textContent || '';
    const detectedType = detectBlockType(text);

    if (detectedType !== 'paragraph' && block.type === 'paragraph') {
      const content = stripPrefix(text, detectedType);

      if (inputRef.current) {
        inputRef.current.textContent = content;
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(inputRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      onUpdate(block.id, content, detectedType);
    } else {
      onUpdate(block.id, text, block.type);
    }
  };

  // Handle meta key shortcuts, returns true if handled
  const handleMetaShortcut = (e: KeyboardEvent<HTMLDivElement>): boolean => {
    if (!e.metaKey) return false;

    if (e.key === 'e') {
      e.preventDefault();
      onSelect(block.id);
      inputRef.current?.blur();
      return true;
    }

    if (e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault();
      onMoveUp(block.id);
      return true;
    }

    if (e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault();
      onMoveDown(block.id);
      return true;
    }

    if (e.key === 'Enter' && block.type === 'h1') {
      e.preventDefault();
      onToggleCollapse?.(block.id);
      return true;
    }

    if (
      e.key === 'Enter' &&
      (block.type === 'todo' || block.type === 'todo-checked')
    ) {
      e.preventDefault();
      const newType = block.type === 'todo' ? 'todo-checked' : 'todo';
      onUpdate(block.id, block.content, newType);
      return true;
    }

    return false;
  };

  // Handle Enter key for block splitting
  const handleEnterKey = (text: string, sel: Selection | null) => {
    const cursorPos = inputRef.current
      ? getCursorPosition(inputRef.current, sel, text.length)
      : text.length;

    const contentBefore = text.slice(0, cursorPos);
    const contentAfter = text.slice(cursorPos);

    if (inputRef.current) {
      inputRef.current.textContent = contentBefore;
    }

    onEnter(block.id, { contentBefore, contentAfter });
  };

  // Handle Backspace at start of block
  const handleBackspaceAtStart = (text: string) => {
    // For todo blocks, convert to paragraph (remove checkbox) instead of merge/delete
    if (block.type === 'todo' || block.type === 'todo-checked') {
      onUpdate(block.id, text, 'paragraph');
    } else if (block.type === 'bullet' && (block.level ?? 0) > 0) {
      // For indented bullets, unindent first
      onUnindent?.(block.id);
    } else if (text === '') {
      onBackspace(block.id);
    } else {
      onMerge(block.id);
    }
  };

  // Handle task creation via $ prefix in last block
  const tryTaskCreation = (text: string): boolean => {
    if (!isLastBlock || !text.startsWith('$ ')) return false;
    const title = text.slice(2).trim();
    if (!title || !onTaskCreate) return false;

    onTaskCreate(title);
    if (inputRef.current) {
      inputRef.current.textContent = '';
    }
    onUpdate(block.id, '', 'paragraph');
    return true;
  };

  // Handle Tab key for bullet indentation, returns true if handled
  const handleTabKey = (e: KeyboardEvent<HTMLDivElement>): boolean => {
    if (block.type !== 'bullet') return false;
    e.preventDefault();
    if (e.shiftKey) {
      onUnindent?.(block.id);
    } else {
      onIndent?.(block.id);
    }
    return true;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (handleMetaShortcut(e)) return;
    if (e.key === 'Tab' && handleTabKey(e)) return;

    const sel = window.getSelection();
    const text = inputRef.current?.textContent || '';
    const cursorPos = inputRef.current
      ? getCursorPosition(inputRef.current, sel, text.length)
      : text.length;
    const isAtStart = cursorPos === 0;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (tryTaskCreation(text)) return;
        handleEnterKey(text, sel);
        break;
      case 'ArrowUp':
        e.preventDefault();
        onArrowUp(block.id);
        break;
      case 'ArrowDown':
        e.preventDefault();
        onArrowDown(block.id);
        break;
      case 'Backspace':
        if (isAtStart) {
          e.preventDefault();
          handleBackspaceAtStart(text);
        }
        break;
      case 'Delete':
        if (
          isAtStart &&
          (block.type === 'todo' || block.type === 'todo-checked')
        ) {
          e.preventDefault();
          onUpdate(block.id, text, 'paragraph');
        }
        break;
    }
  };

  const handleWrapperKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isSelected) return;

    e.preventDefault();

    // Cmd+Return to toggle todo done state when selected
    if (
      e.metaKey &&
      e.key === 'Enter' &&
      (block.type === 'todo' || block.type === 'todo-checked')
    ) {
      const newType = block.type === 'todo' ? 'todo-checked' : 'todo';
      onUpdate(block.id, block.content, newType);
      return;
    }

    switch (e.key) {
      case 'Enter':
        onEnterEdit(block.id);
        break;
      case 'Escape':
        break;
      case 'ArrowUp':
        if (e.metaKey && e.shiftKey) {
          onMoveUp(block.id);
        } else {
          onArrowUp(block.id);
        }
        break;
      case 'ArrowDown':
        if (e.metaKey && e.shiftKey) {
          onMoveDown(block.id);
        } else {
          onArrowDown(block.id);
        }
        break;
      case 'Backspace':
      case 'Delete':
        onBackspace(block.id);
        break;
    }
  };

  const handleTodoClick = () => {
    const newType = block.type === 'todo' ? 'todo-checked' : 'todo';
    onUpdate(block.id, block.content, newType);
  };

  const baseInputClass =
    'block-input w-full outline-none border-none py-[3px] px-0.5 min-h-[1.5em] whitespace-pre-wrap break-words focus:bg-focus-bg focus:rounded-sm';
  const inputClass = `${baseInputClass} ${blockTypeClasses[block.type]}`;
  const placeholder = placeholders[block.type] ?? '';

  // Render divider as non-editable
  if (block.type === 'divider') {
    return (
      /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Custom editor block widget */
      <div
        className="group flex items-center my-px py-3 cursor-pointer focus:outline-none"
        data-block-id={block.id}
        onClick={() => onFocus(block.id)}
        onKeyDown={(e) => {
          e.preventDefault();
          switch (e.key) {
            case 'ArrowUp':
              onArrowUp(block.id);
              break;
            case 'ArrowDown':
              onArrowDown(block.id);
              break;
            case 'Backspace':
            case 'Delete':
              onBackspace(block.id);
              break;
            case 'Enter':
              onEnter(block.id);
              break;
          }
        }}
        tabIndex={0}
      >
        {/* eslint-enable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <hr className="w-full border-none border-t border-border group-focus:border-accent" />
      </div>
    );
  }

  // Render blocks with visual prefixes
  const renderPrefix = () => {
    switch (block.type) {
      case 'h1':
        return (
          <button
            type="button"
            aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
            className={`shrink-0 select-none text-primary flex items-center justify-center size-6 mr-1 -ml-7 text-muted cursor-pointer rounded-md transition-transform duration-normal hover:bg-hover hover:text-primary bg-transparent border-none p-0 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.(block.id);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4 2l4 4-4 4V2z" />
            </svg>
          </button>
        );
      case 'bullet':
        return (
          <span
            className="shrink-0 select-none text-primary w-6 h-6 flex items-center justify-center text-[1.4em] leading-none"
            style={{ marginLeft: (block.level ?? 0) * 24 }}
          >
            •
          </span>
        );
      case 'numbered':
        return (
          <span className="shrink-0 select-none text-primary w-7 pt-[3px] pr-1 text-right">
            {numberedIndex}.
          </span>
        );
      case 'todo':
        return (
          <button
            type="button"
            aria-label="Mark as complete"
            className="shrink-0 select-none text-primary w-6 pt-1 flex items-start justify-center cursor-pointer bg-transparent border-none p-0"
            onClick={handleTodoClick}
          >
            <span className="size-4 border-2 border-primary rounded-sm flex items-center justify-center text-xs transition-all duration-fast hover:bg-hover" />
          </button>
        );
      case 'todo-checked':
        return (
          <button
            type="button"
            aria-label="Mark as incomplete"
            className="shrink-0 select-none text-primary w-6 pt-1 flex items-start justify-center cursor-pointer bg-transparent border-none p-0"
            onClick={handleTodoClick}
          >
            <span className="size-4 border-2 border-accent bg-accent rounded-sm flex items-center justify-center text-xs transition-all duration-fast text-inverted">
              ✓
            </span>
          </button>
        );
      case 'quote':
        return <span className="shrink-0 select-none text-primary hidden" />;
      default:
        return null;
    }
  };

  const prefix = renderPrefix();
  const selectedClass = isSelected
    ? ' bg-accent-subtle rounded-sm ring-2 ring-accent-ring ring-inset'
    : '';

  const handleWrapperClick = () => {
    if (isSelected) {
      onEnterEdit(block.id);
    }
  };

  const wrapperBaseClass =
    wrapperBaseClasses[block.type] ?? 'flex items-center my-px';
  const wrapperClass = wrapperBaseClass + selectedClass;

  /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Custom editor block widget with selection mode */
  return (
    <div
      ref={wrapperRef}
      className={wrapperClass}
      data-block-id={block.id}
      onKeyDown={handleWrapperKeyDown}
      onClick={handleWrapperClick}
      tabIndex={0}
    >
      {prefix}
      <div
        ref={inputRef}
        className={prefix ? `${inputClass} flex-1` : inputClass}
        contentEditable={!isSelected}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocus(block.id)}
        suppressContentEditableWarning
        data-placeholder={placeholder}
      />
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */
}
