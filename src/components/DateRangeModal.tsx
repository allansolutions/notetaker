import { useEffect, useState } from 'react';
import { DateRange } from '../types';
import { ChevronLeftIcon } from './icons';

interface DateRangeModalProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  onClose: () => void;
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

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function startOfDay(date: Date): number {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result.getTime();
}

function isSameDay(a: Date | null, b: Date): boolean {
  if (!a) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const time = startOfDay(date);
  return time > startOfDay(start) && time < startOfDay(end);
}

function Calendar({
  title,
  viewYear,
  viewMonth,
  selectedDate,
  rangeStart,
  rangeEnd,
  minDate,
  maxDate,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: {
  title: string;
  viewYear: number;
  viewMonth: number;
  selectedDate: Date | null;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  minDate?: Date | null;
  maxDate?: Date | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
}) {
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const minTime = minDate ? startOfDay(minDate) : null;
  const maxTime = maxDate ? startOfDay(maxDate) : null;

  const isDisabled = (day: number) => {
    const time = startOfDay(new Date(viewYear, viewMonth, day, 12, 0, 0));
    if (minTime !== null && time < minTime) return true;
    if (maxTime !== null && time > maxTime) return true;
    return false;
  };

  const getDayClassName = (day: number): string => {
    const date = new Date(viewYear, viewMonth, day, 12, 0, 0);
    if (isSameDay(selectedDate, date)) {
      return 'bg-blue-500 text-white';
    }
    if (isWithinRange(date, rangeStart, rangeEnd)) {
      return 'bg-blue-100 text-blue-700';
    }
    return 'text-primary hover:bg-hover';
  };

  return (
    <div className="w-64">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-1 text-muted hover:text-primary transition-colors"
          aria-label={`Previous month for ${title}`}
        >
          <ChevronLeftIcon />
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-muted">
            {title}
          </div>
          <h2 className="text-sm font-semibold text-primary">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          className="p-1 text-muted hover:text-primary transition-colors rotate-180"
          aria-label={`Next month for ${title}`}
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
                  onClick={() =>
                    onSelectDate(new Date(viewYear, viewMonth, day, 12, 0, 0))
                  }
                  disabled={isDisabled(day)}
                  className={`w-full h-full rounded text-sm transition-colors ${
                    isDisabled(day)
                      ? 'text-muted opacity-40 cursor-not-allowed'
                      : getDayClassName(day)
                  }`}
                >
                  {day}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DateRangeModal({
  value,
  onChange,
  onClose,
}: DateRangeModalProps) {
  const initialStart = value?.start ? new Date(value.start) : null;
  const initialEnd = value?.end ? new Date(value.end) : null;
  const [startDate, setStartDate] = useState<Date | null>(initialStart);
  const [endDate, setEndDate] = useState<Date | null>(initialEnd);

  const startViewBase = startDate ?? new Date();
  const endViewBase = endDate ?? startDate ?? new Date();

  const [startViewYear, setStartViewYear] = useState(
    startViewBase.getFullYear()
  );
  const [startViewMonth, setStartViewMonth] = useState(
    startViewBase.getMonth()
  );
  const [endViewYear, setEndViewYear] = useState(endViewBase.getFullYear());
  const [endViewMonth, setEndViewMonth] = useState(endViewBase.getMonth());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isApplyDisabled = !startDate || !endDate;

  const handleSelectStart = (date: Date) => {
    setStartDate(date);
  };

  const handleSelectEnd = (date: Date) => {
    if (!startDate) {
      setStartDate(date);
      setEndDate(date);
      return;
    }
    setEndDate(date);
  };

  const handleApply = () => {
    if (!startDate || !endDate) return;
    onChange({ start: startDate.getTime(), end: endDate.getTime() });
    onClose();
  };

  const handleClear = () => {
    onChange(null);
    onClose();
  };

  const maxStartDate = endDate ? new Date(endDate) : null;
  const minEndDate = startDate ? new Date(startDate) : null;

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
        aria-labelledby="daterange-modal-title"
        className="relative bg-surface rounded-xl shadow-xl mx-4"
      >
        <div className="px-4 pt-4 pb-2">
          <h2
            id="daterange-modal-title"
            className="text-sm font-semibold text-primary"
          >
            Choose date range
          </h2>
        </div>
        <div className="flex flex-col gap-4 px-4 pb-4 md:flex-row">
          <Calendar
            title="Start"
            viewYear={startViewYear}
            viewMonth={startViewMonth}
            selectedDate={startDate}
            rangeStart={startDate}
            rangeEnd={endDate}
            maxDate={maxStartDate}
            onPrevMonth={() => {
              if (startViewMonth === 0) {
                setStartViewYear(startViewYear - 1);
              }
              setStartViewMonth((startViewMonth + 11) % 12);
            }}
            onNextMonth={() => {
              if (startViewMonth === 11) {
                setStartViewYear(startViewYear + 1);
              }
              setStartViewMonth((startViewMonth + 1) % 12);
            }}
            onSelectDate={handleSelectStart}
          />
          <Calendar
            title="End"
            viewYear={endViewYear}
            viewMonth={endViewMonth}
            selectedDate={endDate}
            rangeStart={startDate}
            rangeEnd={endDate}
            minDate={minEndDate}
            onPrevMonth={() => {
              if (endViewMonth === 0) {
                setEndViewYear(endViewYear - 1);
              }
              setEndViewMonth((endViewMonth + 11) % 12);
            }}
            onNextMonth={() => {
              if (endViewMonth === 11) {
                setEndViewYear(endViewYear + 1);
              }
              setEndViewMonth((endViewMonth + 1) % 12);
            }}
            onSelectDate={handleSelectEnd}
          />
        </div>
        <div className="flex justify-between items-center px-4 pb-4">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted hover:text-primary transition-colors"
          >
            Clear
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-muted hover:text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplyDisabled}
              className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                isApplyDisabled
                  ? 'bg-muted text-muted cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
