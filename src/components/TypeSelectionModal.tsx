import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskType, TASK_TYPE_OPTIONS, TASK_TYPE_COLORS } from '../types';

interface TypeSelectionModalProps {
  onSelect: (type: TaskType) => void;
  onCancel: () => void;
}

export function TypeSelectionModal({
  onSelect,
  onCancel,
}: TypeSelectionModalProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // Track if we should ignore the first Enter (the one that opened the modal)
  const ignoreFirstEnter = useRef(true);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < TASK_TYPE_OPTIONS.length - 1 ? prev + 1 : prev
          );
          // Any navigation means user is interacting, so don't ignore Enter anymore
          ignoreFirstEnter.current = false;
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          ignoreFirstEnter.current = false;
          break;
        case 'Enter':
          e.preventDefault();
          // Ignore the first Enter that opened the modal
          if (ignoreFirstEnter.current) {
            ignoreFirstEnter.current = false;
            return;
          }
          onSelect(TASK_TYPE_OPTIONS[highlightedIndex].value);
          break;
        case 'Escape':
          e.preventDefault();
          onCancel();
          break;
      }
    },
    [highlightedIndex, onSelect, onCancel]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default"
        onClick={onCancel}
        aria-label="Close modal"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="type-selection-modal-title"
        className="relative bg-surface rounded-lg shadow-xl max-w-xs w-full mx-4"
      >
        <div className="p-4 border-b border-border">
          <h2
            id="type-selection-modal-title"
            className="text-lg font-semibold text-primary"
          >
            Select Task Type
          </h2>
        </div>

        <div className="p-2">
          {TASK_TYPE_OPTIONS.map((option, index) => {
            const colors = TASK_TYPE_COLORS[option.value];
            const isHighlighted = index === highlightedIndex;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                  isHighlighted ? 'bg-hover' : ''
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span
                  className={`w-3 h-3 rounded-full ${colors.bg.split(' ')[0]}`}
                />
                <span className="text-primary">{option.label}</span>
                {isHighlighted && (
                  <span className="ml-auto text-muted text-xs">Enter</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
