import { useRef, useLayoutEffect, KeyboardEvent } from 'react';
import { Block, BlockType } from '../types';
import { detectBlockType, stripPrefix, getPrefix } from '../utils/markdown';

interface BlockInputProps {
  block: Block;
  onUpdate: (id: string, content: string, type: BlockType) => void;
  onEnter: (id: string) => void;
  onBackspace: (id: string) => void;
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
}

const blockTypeClasses: Record<BlockType, string> = {
  paragraph: 'text-body',
  h1: 'text-h1 leading-tight font-bold',
  h2: 'text-h2 leading-tight font-semibold mt-6 mb-px',
  h3: 'text-h3 leading-tight font-semibold mt-4 mb-px',
  bullet: 'text-body',
  numbered: 'text-body',
  todo: 'text-body',
  'todo-checked': 'text-body line-through text-muted',
  quote: 'text-body',
  code: 'font-mono text-small bg-surface-raised py-3 px-4 rounded-sm whitespace-pre-wrap',
  divider: '',
};

const wrapperBaseClasses: Partial<Record<BlockType, string>> = {
  h1: 'flex items-center pt-4 first:pt-0',
  quote: 'flex items-center my-px border-l-[3px] border-primary pl-3.5 ml-0.5',
};

const placeholders: Partial<Record<BlockType, string>> = {
  paragraph: "Type '/' for commands...",
  code: 'Code',
};

export function BlockInput({
  block,
  onUpdate,
  onEnter,
  onBackspace,
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
}: BlockInputProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

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
  }, []);

  // Handle focus changes
  useLayoutEffect(() => {
    if (isFocused && inputRef.current && block.type !== 'divider') {
      const el = inputRef.current;
      // Use setTimeout(0) to ensure React has fully committed
      setTimeout(() => {
        el.focus();
        // Move cursor to end
        const range = document.createRange();
        const sel = window.getSelection();
        if (el.childNodes.length > 0) {
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
  }, [isFocused, block.id, block.type]);

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

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const sel = window.getSelection();
    const text = inputRef.current?.textContent || '';
    const isAtStart = sel?.anchorOffset === 0 && sel?.focusOffset === 0;

    // Cmd+E to select block
    if (e.metaKey && e.key === 'e') {
      e.preventDefault();
      onSelect(block.id);
      inputRef.current?.blur();
      return;
    }

    // Cmd+Shift+Arrow to move block (works in both edit and select mode)
    if (e.metaKey && e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault();
      onMoveUp(block.id);
      return;
    }
    if (e.metaKey && e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault();
      onMoveDown(block.id);
      return;
    }

    // Cmd+Return to toggle collapse on H1 blocks
    if (e.metaKey && e.key === 'Enter' && block.type === 'h1') {
      e.preventDefault();
      onToggleCollapse?.(block.id);
      return;
    }

    // Cmd+Return to toggle todo done state
    if (
      e.metaKey &&
      e.key === 'Enter' &&
      (block.type === 'todo' || block.type === 'todo-checked')
    ) {
      e.preventDefault();
      const newType = block.type === 'todo' ? 'todo-checked' : 'todo';
      onUpdate(block.id, block.content, newType);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter(block.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onArrowUp(block.id);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onArrowDown(block.id);
    } else if (e.key === 'Backspace') {
      if (text === '' || (isAtStart && block.type !== 'paragraph')) {
        e.preventDefault();
        if (block.type !== 'paragraph') {
          const prefix = getPrefix(block.type);
          if (inputRef.current) {
            inputRef.current.textContent = prefix + text;
            const range = document.createRange();
            const sel = window.getSelection();
            if (inputRef.current.firstChild) {
              range.setStart(inputRef.current.firstChild, prefix.length);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }
          onUpdate(block.id, prefix + text, 'paragraph');
        } else if (text === '') {
          onBackspace(block.id);
        }
      }
    }
  };

  const handleWrapperKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Only handle when selected (not editing)
    if (!isSelected) return;

    // Cmd+Return to toggle todo done state when selected
    if (
      e.metaKey &&
      e.key === 'Enter' &&
      (block.type === 'todo' || block.type === 'todo-checked')
    ) {
      e.preventDefault();
      const newType = block.type === 'todo' ? 'todo-checked' : 'todo';
      onUpdate(block.id, block.content, newType);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onEnterEdit(block.id);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      return;
    }

    if (e.metaKey && e.shiftKey && e.key === 'ArrowUp') {
      e.preventDefault();
      onMoveUp(block.id);
      return;
    }
    if (e.metaKey && e.shiftKey && e.key === 'ArrowDown') {
      e.preventDefault();
      onMoveDown(block.id);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onArrowUp(block.id);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onArrowDown(block.id);
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onBackspace(block.id);
      return;
    }
  };

  const handleTodoClick = () => {
    const newType = block.type === 'todo' ? 'todo-checked' : 'todo';
    onUpdate(block.id, block.content, newType);
  };

  const getClassName = () => {
    const baseClass =
      'block-input w-full outline-none border-none py-[3px] px-0.5 min-h-[1.5em] whitespace-pre-wrap break-words focus:bg-focus-bg focus:rounded-sm';
    return `${baseClass} ${blockTypeClasses[block.type]}`;
  };

  const getPlaceholder = (): string => placeholders[block.type] ?? '';

  // Render divider as non-editable
  if (block.type === 'divider') {
    return (
      <div
        className="group flex items-center my-px py-3 cursor-pointer focus:outline-none"
        data-block-id={block.id}
        onClick={() => onFocus(block.id)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            onArrowUp(block.id);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onArrowDown(block.id);
          } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            onBackspace(block.id);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            onEnter(block.id);
          }
        }}
        tabIndex={0}
      >
        <hr className="w-full border-none border-t border-border group-focus:border-accent" />
      </div>
    );
  }

  // Render blocks with visual prefixes
  const renderPrefix = () => {
    switch (block.type) {
      case 'h1':
        return (
          <span
            className={`shrink-0 select-none text-primary flex items-center justify-center size-6 mr-1 -ml-7 text-muted cursor-pointer rounded-md transition-transform duration-normal hover:bg-hover hover:text-primary ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.(block.id);
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4 2l4 4-4 4V2z" />
            </svg>
          </span>
        );
      case 'bullet':
        return (
          <span className="shrink-0 select-none text-primary w-6 h-6 flex items-center justify-center text-[1.4em] leading-none">
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
          <span
            className="shrink-0 select-none text-primary w-6 pt-1 flex items-start justify-center cursor-pointer"
            onClick={handleTodoClick}
          >
            <span className="size-4 border-2 border-primary rounded-sm flex items-center justify-center text-xs transition-all duration-fast hover:bg-hover" />
          </span>
        );
      case 'todo-checked':
        return (
          <span
            className="shrink-0 select-none text-primary w-6 pt-1 flex items-start justify-center cursor-pointer"
            onClick={handleTodoClick}
          >
            <span className="size-4 border-2 border-accent bg-accent rounded-sm flex items-center justify-center text-xs transition-all duration-fast text-inverted">
              ✓
            </span>
          </span>
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

  const getWrapperClasses = (): string => {
    const baseClasses =
      wrapperBaseClasses[block.type] ?? 'flex items-center my-px';
    return baseClasses + selectedClass;
  };

  if (prefix) {
    return (
      <div
        ref={wrapperRef}
        className={getWrapperClasses()}
        data-block-id={block.id}
        onKeyDown={handleWrapperKeyDown}
        onClick={handleWrapperClick}
        tabIndex={0}
      >
        {prefix}
        <div
          ref={inputRef}
          className={getClassName() + ' flex-1'}
          contentEditable={!isSelected}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => onFocus(block.id)}
          suppressContentEditableWarning
          data-placeholder={getPlaceholder()}
        />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={'flex items-center my-px' + selectedClass}
      data-block-id={block.id}
      onKeyDown={handleWrapperKeyDown}
      onClick={handleWrapperClick}
      tabIndex={0}
    >
      <div
        ref={inputRef}
        className={getClassName()}
        contentEditable={!isSelected}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocus(block.id)}
        suppressContentEditableWarning
        data-placeholder={getPlaceholder()}
      />
    </div>
  );
}
