import { useState, useCallback } from 'react';
import { Smile } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface WikiIconPickerProps {
  icon: string | null;
  onChange: (icon: string | null) => void;
}

// Common emojis for pages
const EMOJI_OPTIONS = [
  // Documents
  ['📄', '📝', '📋', '📑', '📒', '📕', '📗', '📘'],
  // Objects
  ['💡', '🔧', '🔑', '📌', '🎯', '🚀', '💎', '🔮'],
  // Activities
  ['📊', '📈', '📉', '🗂️', '📁', '🗃️', '📇', '🗄️'],
  // People
  ['👤', '👥', '🤝', '💼', '🏢', '🏠', '🌍', '🌐'],
  // Nature
  ['🌱', '🌿', '🌳', '🌺', '🌸', '🍀', '🌻', '🌹'],
  // Symbols
  ['⭐', '✨', '💫', '❤️', '🔥', '⚡', '✅', '❌'],
];

export function WikiIconPicker({
  icon,
  onChange,
}: WikiIconPickerProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (emoji: string) => {
      onChange(emoji);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setIsOpen(false);
  }, [onChange]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-dashed hover:bg-muted text-2xl"
        >
          {icon || <Smile className="w-5 h-5 text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Choose icon
            </span>
            {icon && (
              <button
                type="button"
                className="text-xs text-destructive hover:underline"
                onClick={handleRemove}
              >
                Remove
              </button>
            )}
          </div>
          {EMOJI_OPTIONS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-lg"
                  onClick={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
