import { useEffect, useState } from 'react';
import { ChevronLeftIcon } from './icons';

interface DatePickerModalProps {
  value: number | undefined;
  onChange: (date: number | undefined) => void;
  onClose: () => void;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // Convert Sunday=0 to Monday=0 based index
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function DatePickerModal({
  value,
  onChange,
  onClose,
}: DatePickerModalProps) {
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const selectedDate = value ? new Date(value) : null;
  const today = new Date();

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
    }
    setViewMonth((viewMonth + 11) % 12);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
    }
    setViewMonth((viewMonth + 1) % 12);
  };

  const handleSelectDay = (day: number) => {
    const date = new Date(viewYear, viewMonth, day, 12, 0, 0);
    onChange(date.getTime());
    onClose();
  };

  const handleClear = () => {
    onChange(undefined);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isSelectedDay = (day: number): boolean => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    );
  };

  const isToday = (day: number): boolean => {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  const getDayClassName = (day: number): string => {
    if (isSelectedDay(day)) {
      return 'bg-blue-500 text-white';
    }
    if (isToday(day)) {
      return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300';
    }
    return 'text-primary hover:bg-hover';
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="datepicker-modal-title"
        className="relative bg-surface rounded-lg shadow-xl w-72 mx-4"
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 text-muted hover:text-primary transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </button>
          <h2
            id="datepicker-modal-title"
            className="text-sm font-semibold text-primary"
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 text-muted hover:text-primary transition-colors rotate-180"
            aria-label="Next month"
          >
            <ChevronLeftIcon />
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="text-xs text-muted text-center font-medium"
              >
                {name}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <div key={index} className="aspect-square">
                {day !== null && (
                  <button
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`w-full h-full rounded text-sm transition-colors ${getDayClassName(day)}`}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center p-3 border-t border-border">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted hover:text-primary transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
