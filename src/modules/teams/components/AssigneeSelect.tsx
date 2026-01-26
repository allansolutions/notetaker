import { useRef, useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTeam } from '../context/TeamContext';

interface AssigneeSelectProps {
  value: string | '';
  onChange: (value: string) => void;
  onAdvance?: () => void;
  autoOpen?: boolean;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  id?: string;
  'aria-labelledby'?: string;
}

export function AssigneeSelect({
  value,
  onChange,
  onAdvance,
  autoOpen = false,
  triggerRef,
  id,
  'aria-labelledby': ariaLabelledBy,
}: AssigneeSelectProps) {
  const { members } = useTeam();
  const [open, setOpen] = useState(false);
  const internalRef = useRef<HTMLButtonElement>(null!);
  const ref = triggerRef ?? internalRef;
  const hasAutoOpened = useRef(false);

  // Auto-open on mount if autoOpen is true
  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current && ref.current) {
      hasAutoOpened.current = true;
      requestAnimationFrame(() => {
        ref.current?.focus();
        setOpen(true);
      });
    }
  }, [autoOpen, ref]);

  const handleValueChange = (newValue: string) => {
    onChange(newValue);
    setOpen(false);
    if (onAdvance) {
      requestAnimationFrame(() => {
        onAdvance();
      });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  // Find the selected member's display name
  const selectedMember = members.find((m) => m.userId === value);
  const displayValue = selectedMember
    ? selectedMember.user.name || selectedMember.user.email
    : '';

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
        <SelectValue placeholder="Select assignee...">
          {displayValue || 'Select assignee...'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {members.map((member) => (
          <SelectItem key={member.userId} value={member.userId}>
            <div className="flex items-center gap-2">
              {member.user.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-primary">
                  {(member.user.name || member.user.email)[0].toUpperCase()}
                </div>
              )}
              <span>{member.user.name || member.user.email}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
