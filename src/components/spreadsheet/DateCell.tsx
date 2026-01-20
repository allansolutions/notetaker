import { useState } from 'react';
import { CalendarIcon } from '../icons';
import { DatePickerModal } from '../DatePickerModal';

interface DateCellProps {
  value: number | undefined;
  onChange: (date: number | undefined) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function DateCell({ value, onChange }: DateCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleChange = (date: number | undefined) => {
    onChange(date);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-1 text-small rounded hover:bg-hover transition-colors min-w-[60px]"
      >
        {value ? (
          <span className="text-primary">{formatDate(value)}</span>
        ) : (
          <span className="text-muted">
            <CalendarIcon />
          </span>
        )}
      </button>

      {isOpen && (
        <DatePickerModal
          value={value}
          onChange={handleChange}
          onClose={handleClose}
        />
      )}
    </>
  );
}
