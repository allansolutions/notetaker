import {
  useState,
  useRef,
  useLayoutEffect,
  KeyboardEvent,
  ClipboardEvent,
} from 'react';
import { Block, BlockType } from '../types';
import { detectBlockType, stripPrefix } from '../utils/markdown';
import { blockTypeClasses } from '../utils/block-styles';
import { SplitInfo } from '../utils/block-operations';
import { PagePicker } from './PagePicker';

export type { SplitInfo };

interface BlockInputProps {
  block: Block;
  onUpdate: (id: string, content: string, type: BlockType) => void;
  onEnter: (id: string, splitInfo?: SplitInfo) => void;
  onBackspace: (id: string) => void;
  onMerge: (id: string) => void;
  onFocus: (id: string) => void;
  onArrowUp: (id: string, cursorX?: number) => void;
  onArrowDown: (id: string, cursorX?: number) => void;
  isFocused: boolean;
  isSelected: boolean;
  /** True if this block should receive wrapper focus in selection mode */
  isSelectionFocused?: boolean;
  /** True if multiple blocks are selected */
  isMultiSelected?: boolean;
  onSelect: (id: string) => void;
  onEnterEdit: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  /** Extend selection to include this block (Shift+Arrow) */
  onExtendSelection?: (id: string) => void;
  /** Delete all selected blocks */
  onDeleteSelected?: () => void;
  /** Copy selected blocks as markdown */
  onCopySelected?: () => void;
  /** Cut selected blocks as markdown (copy + delete) */
  onCutSelected?: () => void;
  /** Paste multi-line text into a block (edit mode) */
  onPasteBlocks?: (blockId: string, text: string, cursorOffset: number) => void;
  /** Paste text replacing selected blocks (selection mode) */
  onPasteSelected?: (text: string) => void;
  /** Clear multi-selection */
  onClearSelection?: () => void;
  /** Select the previous block (selection mode navigation) */
  onSelectPrevious?: (id: string) => void;
  /** Select the next block (selection mode navigation) */
  onSelectNext?: (id: string) => void;
  /** Get the previous block's id */
  getPreviousBlockId?: (id: string) => string | null;
  /** Get the next block's id */
  getNextBlockId?: (id: string) => string | null;
  numberedIndex: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (id: string) => void;
  /** Cursor offset to use when focusing this block (for merge operations) */
  pendingCursorOffset?: number | null;
  /** Target X coordinate and direction for cursor positioning when focusing via arrow keys */
  pendingCursorX?: { x: number; fromTop: boolean } | null;
  /** True if this is the last block of its task (enables $ task creation) */
  isLastBlock?: boolean;
  /** Callback when user types $ prefix and presses Enter in last block */
  onTaskCreate?: (title: string) => void;
  /** Callback to indent a bullet block (Tab key) */
  onIndent?: (id: string) => void;
  /** Callback to unindent a bullet block (Shift+Tab key) */
  onUnindent?: (id: string) => void;
  /** Undo the last operation */
  onUndo?: () => void;
  /** Redo the last undone operation */
  onRedo?: () => void;
  /** Counter incremented after undo/redo to trigger content re-sync */
  undoGeneration?: number;
  /** Convert this block to a wiki page embed */
  onConvertToEmbed?: (blockId: string, pageId: string) => void;
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

// Helper to get the bounding rect of the cursor position
function getCursorRect(el: HTMLDivElement): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  const rangeRect = range.getBoundingClientRect();

  // If range rect has no dimensions (collapsed cursor), insert a temporary span
  if (rangeRect.height === 0) {
    const span = document.createElement('span');
    span.textContent = '\u200b'; // zero-width space
    range.insertNode(span);
    const spanRect = span.getBoundingClientRect();
    span.remove();
    el.normalize();
    return spanRect;
  }

  return rangeRect;
}

// Helper to check if cursor is on the first line of a contentEditable element
function isOnFirstLine(el: HTMLDivElement): boolean {
  const cursorRect = getCursorRect(el);
  if (!cursorRect) return true;

  const elRect = el.getBoundingClientRect();
  // Use line-height as threshold (~24px for 1.5em at 16px base)
  // Cursor is on first line if its top is within one line-height of element top
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
  return cursorRect.top - elRect.top < lineHeight;
}

// Helper to check if cursor is on the last line of a contentEditable element
function isOnLastLine(el: HTMLDivElement): boolean {
  const cursorRect = getCursorRect(el);
  if (!cursorRect) return true;

  const elRect = el.getBoundingClientRect();
  // Cursor is on last line if its bottom is within one line-height of element bottom
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
  return elRect.bottom - cursorRect.bottom < lineHeight;
}

// Helper to position cursor at a target X coordinate on a specific line
function positionCursorAtX(
  el: HTMLDivElement,
  targetX: number,
  fromTop: boolean
): void {
  const text = el.textContent || '';
  if (!text || !el.firstChild) {
    // Empty block, just focus
    el.focus();
    return;
  }

  el.focus();
  const range = document.createRange();
  const sel = window.getSelection();

  // Find the character position closest to targetX on the target line
  let bestOffset = 0;
  let bestDistance = Infinity;
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
  const elRect = el.getBoundingClientRect();

  for (let i = 0; i <= text.length; i++) {
    range.setStart(el.firstChild, i);
    range.collapse(true);

    // Insert temporary span to get position
    const span = document.createElement('span');
    span.textContent = '\u200b';
    range.insertNode(span);
    const spanRect = span.getBoundingClientRect();
    span.remove();
    el.normalize();

    // Check if this position is on the target line
    const isOnTargetLine = fromTop
      ? spanRect.top - elRect.top < lineHeight
      : elRect.bottom - spanRect.bottom < lineHeight;

    if (isOnTargetLine) {
      const distance = Math.abs(spanRect.left - targetX);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestOffset = i;
      }
    }
  }

  // Position cursor at the best offset found
  range.setStart(el.firstChild, bestOffset);
  range.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(range);
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
  isSelectionFocused,
  isMultiSelected,
  onSelect,
  onEnterEdit,
  onMoveUp,
  onMoveDown,
  onExtendSelection,
  onDeleteSelected,
  onCopySelected,
  onCutSelected,
  onPasteBlocks,
  onPasteSelected,
  onClearSelection,
  onSelectPrevious,
  onSelectNext,
  getPreviousBlockId,
  getNextBlockId,
  numberedIndex,
  isCollapsed,
  onToggleCollapse,
  pendingCursorOffset,
  pendingCursorX,
  isLastBlock,
  onTaskCreate,
  onIndent,
  onUnindent,
  onUndo,
  onRedo,
  undoGeneration,
  onConvertToEmbed,
}: BlockInputProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const cursorPositionedRef = useRef(false);
  const [showPagePicker, setShowPagePicker] = useState(false);

  // Reset cursor positioned flag when focus is lost
  useLayoutEffect(() => {
    if (!isFocused) {
      cursorPositionedRef.current = false;
    }
  }, [isFocused]);

  // Focus wrapper when this block should have selection focus
  useLayoutEffect(() => {
    if (isSelectionFocused && wrapperRef.current) {
      // Small delay to ensure blur has completed
      setTimeout(() => {
        wrapperRef.current?.focus();
      }, 0);
    }
  }, [isSelectionFocused]);

  // Set initial content only once on mount
  useLayoutEffect(() => {
    if (inputRef.current && isInitialMount.current) {
      inputRef.current.textContent = block.content;
      isInitialMount.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: only set content on initial mount, not on updates
  }, []);

  // Re-sync contentEditable text after undo/redo
  const lastUndoGenRef = useRef(undoGeneration);
  useLayoutEffect(() => {
    if (undoGeneration != null && undoGeneration !== lastUndoGenRef.current) {
      lastUndoGenRef.current = undoGeneration;
      if (inputRef.current) {
        inputRef.current.textContent = block.content;
      }
    }
  }, [undoGeneration, block.content]);

  // Track which cursor offset we've already processed to avoid re-running on content changes
  const processedCursorOffsetRef = useRef<number | null>(null);

  // Sync content and position cursor when merge happens
  useLayoutEffect(() => {
    // Only process each pendingCursorOffset value once
    if (
      pendingCursorOffset != null &&
      inputRef.current &&
      processedCursorOffsetRef.current !== pendingCursorOffset
    ) {
      processedCursorOffsetRef.current = pendingCursorOffset;
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
    // Reset when pendingCursorOffset becomes null
    if (pendingCursorOffset == null) {
      processedCursorOffsetRef.current = null;
    }
  }, [pendingCursorOffset, block.content]);

  // Track which cursor X we've already processed
  const processedCursorXRef = useRef<{ x: number; fromTop: boolean } | null>(
    null
  );

  // Position cursor at target X when navigating between blocks with arrow keys
  useLayoutEffect(() => {
    if (
      pendingCursorX != null &&
      inputRef.current &&
      (processedCursorXRef.current?.x !== pendingCursorX.x ||
        processedCursorXRef.current?.fromTop !== pendingCursorX.fromTop)
    ) {
      processedCursorXRef.current = pendingCursorX;
      cursorPositionedRef.current = true;
      const el = inputRef.current;
      setTimeout(() => {
        positionCursorAtX(el, pendingCursorX.x, pendingCursorX.fromTop);
      }, 0);
    }
    if (pendingCursorX == null) {
      processedCursorXRef.current = null;
    }
  }, [pendingCursorX]);

  // Handle focus changes (default behavior - cursor to end)
  useLayoutEffect(() => {
    // Skip if cursor was already positioned (by merge effect, cursorX effect, or previous focus)
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
  }, [isFocused, block.id, block.type, pendingCursorOffset, pendingCursorX]);

  const handleInput = () => {
    const text = inputRef.current?.textContent || '';
    const detectedType = detectBlockType(text);

    // Check for /embed command
    if (text === '/embed' && onConvertToEmbed) {
      setShowPagePicker(true);
      return;
    }

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

  const handlePageSelect = (pageId: string) => {
    setShowPagePicker(false);
    onConvertToEmbed?.(block.id, pageId);
  };

  const handlePagePickerCancel = () => {
    setShowPagePicker(false);
    // Clear the /embed text
    if (inputRef.current) {
      inputRef.current.textContent = '';
    }
    onUpdate(block.id, '', block.type);
    inputRef.current?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain');
    e.preventDefault();

    if (text.includes('\n')) {
      const el = inputRef.current;
      if (!el) return;
      const sel = window.getSelection();
      const offset = getCursorPosition(el, sel, el.textContent?.length ?? 0);
      onPasteBlocks?.(block.id, text, offset);
    } else {
      // Insert as plain text to strip any formatting (e.g. color styles)
      document.execCommand('insertText', false, text);
    }
  };

  // Handle meta key shortcuts, returns true if handled
  const handleMetaShortcut = (e: KeyboardEvent<HTMLDivElement>): boolean => {
    if (!e.metaKey) return false;

    if (e.key === 'z') {
      e.preventDefault();
      (e.shiftKey ? onRedo : onUndo)?.();
      return true;
    }

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

  // Handle ArrowUp - move to previous block if on first line
  const handleArrowUp = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!inputRef.current || !isOnFirstLine(inputRef.current)) return;
    e.preventDefault();
    const cursorRect = getCursorRect(inputRef.current);
    onArrowUp(block.id, cursorRect?.left);
  };

  // Handle ArrowDown - move to next block if on last line
  const handleArrowDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!inputRef.current || !isOnLastLine(inputRef.current)) return;
    e.preventDefault();
    const cursorRect = getCursorRect(inputRef.current);
    onArrowDown(block.id, cursorRect?.left);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (handleMetaShortcut(e)) return;
    if (e.key === 'Tab' && handleTabKey(e)) return;

    // Escape key: select current block (like Notion)
    if (e.key === 'Escape') {
      e.preventDefault();
      onSelect(block.id);
      inputRef.current?.blur();
      return;
    }

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
        handleArrowUp(e);
        break;
      case 'ArrowDown':
        handleArrowDown(e);
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

  // Handle vertical arrow key in selection mode with modifier awareness
  const handleSelectionArrow = (
    e: KeyboardEvent<HTMLDivElement>,
    direction: 'up' | 'down'
  ) => {
    if (e.metaKey && e.shiftKey) {
      (direction === 'up' ? onMoveUp : onMoveDown)(block.id);
    } else if (e.shiftKey) {
      const adjacentId =
        direction === 'up'
          ? getPreviousBlockId?.(block.id)
          : getNextBlockId?.(block.id);
      if (adjacentId) onExtendSelection?.(adjacentId);
    } else {
      (direction === 'up' ? onSelectPrevious : onSelectNext)?.(block.id);
    }
  };

  // Handle Cmd+key shortcuts in selection mode, returns true if handled
  const handleWrapperMetaKey = (e: KeyboardEvent<HTMLDivElement>): boolean => {
    if (!e.metaKey) return false;

    switch (e.key) {
      case 'z':
        if (e.shiftKey) onRedo?.();
        else onUndo?.();
        return true;
      case 'c':
        onCopySelected?.();
        return true;
      case 'x':
        onCutSelected?.();
        return true;
      case 'v':
        navigator.clipboard.readText().then((text) => {
          if (text) onPasteSelected?.(text);
        });
        return true;
      case 'Enter':
        if (
          !isMultiSelected &&
          (block.type === 'todo' || block.type === 'todo-checked')
        ) {
          const newType = block.type === 'todo' ? 'todo-checked' : 'todo';
          onUpdate(block.id, block.content, newType);
          return true;
        }
        return false;
      default:
        return false;
    }
  };

  const handleWrapperKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isSelected) return;

    e.preventDefault();

    if (handleWrapperMetaKey(e)) return;

    switch (e.key) {
      case 'Enter':
        if (!isMultiSelected) onEnterEdit(block.id);
        break;
      case 'Escape':
        onClearSelection?.();
        break;
      case 'ArrowUp':
        handleSelectionArrow(e, 'up');
        break;
      case 'ArrowDown':
        handleSelectionArrow(e, 'down');
        break;
      case 'Backspace':
      case 'Delete':
        if (isMultiSelected) {
          onDeleteSelected?.();
        } else {
          onBackspace(block.id);
        }
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
          if (e.metaKey && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) onRedo?.();
            else onUndo?.();
            return;
          }
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
    <>
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
          onPaste={handlePaste}
          onFocus={() => onFocus(block.id)}
          suppressContentEditableWarning
          data-placeholder={placeholder}
        />
      </div>
      {showPagePicker && (
        <PagePicker
          onSelect={handlePageSelect}
          onCancel={handlePagePickerCancel}
          anchorRef={wrapperRef}
        />
      )}
    </>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */
}
