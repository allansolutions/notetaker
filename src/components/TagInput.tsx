import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  KeyboardEvent,
} from 'react';

interface TagInputProps {
  tags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({
  tags,
  availableTags,
  onChange,
  placeholder = 'Add tag...',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const suggestions = useMemo(
    () =>
      inputValue.trim()
        ? availableTags.filter(
            (tag) =>
              tag.toLowerCase().includes(inputValue.toLowerCase()) &&
              !tags.includes(tag)
          )
        : [],
    [inputValue, availableTags, tags]
  );

  // Check if input matches an existing tag exactly
  const exactMatch = suggestions.some(
    (s) => s.toLowerCase() === inputValue.toLowerCase()
  );

  // Show "Create" option if no exact match and input has value
  const showCreateOption = inputValue.trim() && !exactMatch;

  const totalOptions = suggestions.length + (showCreateOption ? 1 : 0);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInputValue('');
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onChange]
  );

  const selectHighlightedOption = useCallback(() => {
    if (highlightedIndex < suggestions.length) {
      addTag(suggestions[highlightedIndex]);
    } else if (showCreateOption) {
      addTag(inputValue.trim());
    }
  }, [highlightedIndex, suggestions, showCreateOption, inputValue, addTag]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (totalOptions > 0 && isOpen) {
            selectHighlightedOption();
          } else if (inputValue.trim()) {
            addTag(inputValue.trim());
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setInputValue('');
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (isOpen && totalOptions > 0) {
            setHighlightedIndex((prev) => (prev + 1) % totalOptions);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen && totalOptions > 0) {
            setHighlightedIndex(
              (prev) => (prev - 1 + totalOptions) % totalOptions
            );
          }
          break;
        case 'Backspace':
          if (!inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
          break;
      }
    },
    [
      totalOptions,
      isOpen,
      inputValue,
      tags,
      addTag,
      removeTag,
      selectHighlightedOption,
    ]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setIsOpen(true);
    },
    []
  );

  const handleInputFocus = useCallback(() => {
    if (inputValue.trim()) {
      setIsOpen(true);
    }
  }, [inputValue]);

  // Highlight matching text in suggestion
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <span className="font-semibold">
          {text.slice(index, index + query.length)}
        </span>
        {text.slice(index + query.length)}
      </>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Existing tags */}
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-muted rounded-full px-2.5 py-0.5 text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${tag}`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </span>
      ))}

      {/* Input with dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="bg-transparent border-none outline-none text-sm min-w-[80px] w-auto placeholder:text-muted-foreground/50"
          style={{ width: `${Math.max(80, inputValue.length * 8 + 20)}px` }}
        />

        {/* Dropdown */}
        {isOpen && totalOptions > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg min-w-[160px] max-h-[200px] overflow-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                className={`w-full text-left px-3 py-1.5 text-sm ${
                  index === highlightedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => addTag(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {highlightMatch(suggestion, inputValue)}
              </button>
            ))}
            {showCreateOption && (
              <button
                type="button"
                className={`w-full text-left px-3 py-1.5 text-sm ${
                  highlightedIndex === suggestions.length
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => addTag(inputValue.trim())}
                onMouseEnter={() => setHighlightedIndex(suggestions.length)}
              >
                Create "{inputValue.trim()}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
