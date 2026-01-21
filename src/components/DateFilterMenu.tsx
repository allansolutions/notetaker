import { useMemo, useState } from 'react';
import { DateFilterPreset, DateRange } from '../types';
import { DatePickerModal } from './DatePickerModal';
import { DateRangeModal } from './DateRangeModal';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  formatDateCompact,
  formatDateRange,
  getUserLocale,
} from '../utils/date-query';
import { getRelativeDateLabel } from '../utils/date-filters';

interface DateFilterMenuProps {
  activePreset: DateFilterPreset;
  selectedDate: number | null;
  selectedRange: DateRange | null;
  onPresetChange: (preset: DateFilterPreset) => void;
  onDateChange: (date: number | null) => void;
  onRangeChange: (range: DateRange | null) => void;
  counts?: Record<'all' | 'today' | 'tomorrow' | 'this-week', number>;
}

const PRESET_LABELS: Record<
  'all' | 'today' | 'tomorrow' | 'this-week',
  string
> = {
  all: 'All',
  today: 'Today',
  tomorrow: 'Tomorrow',
  'this-week': 'This Week',
};

export function DateFilterMenu({
  activePreset,
  selectedDate,
  selectedRange,
  onPresetChange,
  onDateChange,
  onRangeChange,
  counts,
}: DateFilterMenuProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);

  const locale = useMemo(() => getUserLocale(), []);

  const label = useMemo(() => {
    if (activePreset === 'specific-date' && selectedDate) {
      const relativeLabel = getRelativeDateLabel(selectedDate);
      if (relativeLabel) {
        return `Date: ${relativeLabel.charAt(0).toUpperCase() + relativeLabel.slice(1)}`;
      }
      return `Date: ${formatDateCompact(new Date(selectedDate), locale)}`;
    }
    if (activePreset === 'date-range' && selectedRange) {
      return `Date: ${formatDateRange(selectedRange, locale)}`;
    }
    if (activePreset in PRESET_LABELS) {
      return `Date: ${PRESET_LABELS[activePreset as keyof typeof PRESET_LABELS]}`;
    }
    return 'Date: All';
  }, [activePreset, selectedDate, selectedRange, locale]);

  const handlePresetClick = (preset: keyof typeof PRESET_LABELS) => {
    setIsPopoverOpen(false);
    onPresetChange(preset);
  };

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="px-3 py-1 text-sm rounded-md transition-colors text-muted hover:text-primary hover:bg-hover"
          >
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-64 p-3">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted">
              Presets
            </div>
            <div className="space-y-1">
              {Object.entries(PRESET_LABELS).map(([preset, presetLabel]) => {
                const isActive = activePreset === preset;
                const count = counts?.[preset as keyof typeof PRESET_LABELS];
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      handlePresetClick(preset as keyof typeof PRESET_LABELS)
                    }
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted hover:text-primary hover:bg-hover'
                    }`}
                  >
                    <span>{presetLabel}</span>
                    {count !== undefined && (
                      <span className="text-xs text-muted">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border pt-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsPopoverOpen(false);
                  setIsDatePickerOpen(true);
                }}
                className="w-full text-left px-2 py-1 rounded-md text-sm text-muted hover:text-primary hover:bg-hover"
              >
                Choose date...
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPopoverOpen(false);
                  setIsRangePickerOpen(true);
                }}
                className="w-full text-left px-2 py-1 rounded-md text-sm text-muted hover:text-primary hover:bg-hover"
              >
                Choose range...
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPopoverOpen(false);
                  onPresetChange('all');
                  onDateChange(null);
                  onRangeChange(null);
                }}
                className="w-full text-left px-2 py-1 rounded-md text-sm text-muted hover:text-primary hover:bg-hover"
              >
                Clear
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {isDatePickerOpen && (
        <DatePickerModal
          value={selectedDate ?? undefined}
          onChange={(value) => {
            onDateChange(value ?? null);
            setIsDatePickerOpen(false);
          }}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}
      {isRangePickerOpen && (
        <DateRangeModal
          value={selectedRange}
          onChange={(range) => {
            onRangeChange(range);
            setIsRangePickerOpen(false);
          }}
          onClose={() => setIsRangePickerOpen(false)}
        />
      )}
    </>
  );
}
