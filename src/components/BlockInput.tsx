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
}

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
    const baseClass = 'block-input';
    return `${baseClass} block-${block.type}`;
  };

  const getPlaceholder = () => {
    if (block.type === 'paragraph') return "Type '/' for commands...";
    if (block.type === 'code') return 'Code';
    return '';
  };

  // Render divider as non-editable
  if (block.type === 'divider') {
    return (
      <div
        className="block-wrapper block-divider-wrapper"
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
        <hr className="block-divider" />
      </div>
    );
  }

  // Render blocks with visual prefixes
  const renderPrefix = () => {
    switch (block.type) {
      case 'bullet':
        return <span className="block-prefix bullet-prefix">•</span>;
      case 'numbered':
        return <span className="block-prefix numbered-prefix">{numberedIndex}.</span>;
      case 'todo':
        return (
          <span className="block-prefix todo-prefix" onClick={handleTodoClick}>
            <span className="todo-checkbox" />
          </span>
        );
      case 'todo-checked':
        return (
          <span className="block-prefix todo-prefix" onClick={handleTodoClick}>
            <span className="todo-checkbox checked">✓</span>
          </span>
        );
      case 'quote':
        return <span className="block-prefix quote-prefix" />;
      default:
        return null;
    }
  };

  const prefix = renderPrefix();
  const selectedClass = isSelected ? ' block-selected' : '';

  const handleWrapperClick = () => {
    if (isSelected) {
      onEnterEdit(block.id);
    }
  };

  if (prefix) {
    return (
      <div
        ref={wrapperRef}
        className={`block-wrapper block-${block.type}-wrapper${selectedClass}`}
        data-block-id={block.id}
        onKeyDown={handleWrapperKeyDown}
        onClick={handleWrapperClick}
        tabIndex={0}
      >
        {prefix}
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

  return (
    <div
      ref={wrapperRef}
      className={`block-wrapper${selectedClass}`}
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
