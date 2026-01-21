import { useState, useMemo, useCallback } from 'react';
import { DateFilterPreset, DateRange, Task } from '../types';
import { matchesDatePreset } from '../utils/date-filters';

interface DateFilterState {
  preset: DateFilterPreset;
  date: number | null;
  range: DateRange | null;
}

interface DateFilterHandlers {
  onPresetChange: (preset: DateFilterPreset) => void;
  onDateChange: (date: number | null) => void;
  onRangeChange: (range: DateRange | null) => void;
}

interface UseDateFilterReturn extends DateFilterState, DateFilterHandlers {
  presetCounts: Record<'all' | 'today' | 'tomorrow' | 'this-week', number>;
}

interface UseDateFilterOptions {
  initialPreset?: DateFilterPreset;
  initialDate?: number | null;
  initialRange?: DateRange | null;
  tasks: Task[];
}

export function useDateFilter({
  initialPreset = 'all',
  initialDate = null,
  initialRange = null,
  tasks,
}: UseDateFilterOptions): UseDateFilterReturn {
  const [preset, setPreset] = useState<DateFilterPreset>(initialPreset);
  const [date, setDate] = useState<number | null>(initialDate);
  const [range, setRange] = useState<DateRange | null>(initialRange);

  const presetCounts = useMemo(() => {
    const now = new Date();
    return {
      all: tasks.length,
      today: tasks.filter((t) => matchesDatePreset(t.dueDate, 'today', now))
        .length,
      tomorrow: tasks.filter((t) =>
        matchesDatePreset(t.dueDate, 'tomorrow', now)
      ).length,
      'this-week': tasks.filter((t) =>
        matchesDatePreset(t.dueDate, 'this-week', now)
      ).length,
    };
  }, [tasks]);

  const onPresetChange = useCallback((newPreset: DateFilterPreset) => {
    setPreset(newPreset);
    if (newPreset !== 'specific-date') {
      setDate(null);
    }
    if (newPreset !== 'date-range') {
      setRange(null);
    }
  }, []);

  const onDateChange = useCallback((newDate: number | null) => {
    if (!newDate) {
      setPreset('all');
      setDate(null);
      return;
    }
    setPreset('specific-date');
    setDate(newDate);
    setRange(null);
  }, []);

  const onRangeChange = useCallback((newRange: DateRange | null) => {
    if (!newRange) {
      setPreset('all');
      setRange(null);
      return;
    }
    setPreset('date-range');
    setRange(newRange);
    setDate(null);
  }, []);

  return {
    preset,
    date,
    range,
    presetCounts,
    onPresetChange,
    onDateChange,
    onRangeChange,
  };
}
