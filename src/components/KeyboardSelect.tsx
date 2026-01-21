import { useState, useRef, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { cn } from '@/lib/utils';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface KeyboardSelectProps<T extends string> {
  value: T | '';
  onChange: (value: T) => void;
  onAdvance: () => void;
  options: SelectOption<T>[];
  placeholder?: string;
  autoOpen?: boolean;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  id?: string;
  'aria-labelledby'?: string;
}

export function KeyboardSelect<T extends string>({
  value,
  onChange,
  onAdvance,
  options,
  placeholder = 'Select...',
  autoOpen = false,
  triggerRef,
  id,
  'aria-labelledby': ariaLabelledBy,
}: KeyboardSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const internalRef = useRef<HTMLButtonElement>(null!);
  const ref = triggerRef ?? internalRef;
  const hasAutoOpened = useRef(false);

  // Auto-open on mount if autoOpen is true
  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current && ref.current) {
      hasAutoOpened.current = true;
      // Small delay to ensure modal is fully rendered
      requestAnimationFrame(() => {
        ref.current?.focus();
        setOpen(true);
      });
    }
  }, [autoOpen, ref]);

  const handleValueChange = (newValue: string) => {
    onChange(newValue as T);
    setOpen(false);
    // Call onAdvance after selection
    // Use requestAnimationFrame to ensure focus management completes first
    requestAnimationFrame(() => {
      onAdvance();
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  return (
    <Select
      open={open}
      onOpenChange={handleOpenChange}
      value={value}
      onValueChange={handleValueChange}
    >
      <SelectTrigger
        ref={ref}
        id={id}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          'flex-1 px-3 py-2 text-sm rounded bg-surface border border-border text-primary',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          !value && 'text-muted'
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
