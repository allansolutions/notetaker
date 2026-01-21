import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Task, DateFilterPreset, DateRange } from '../../types';
import { TaskTable, ColumnFilters } from '../spreadsheet/TaskTable';
import { DocumentIcon, ArchiveIcon } from '../icons';
import { AddTaskData } from '../AddTaskModal';
import { DateFilterMenu } from '../DateFilterMenu';
import { matchesDatePreset } from '../../utils/date-filters';

export interface SpreadsheetFilterState {
  filters: ColumnFilters;
  dateFilterPreset: DateFilterPreset;
  dateFilterDate?: number | null;
  dateFilterRange?: DateRange | null;
}

const defaultFilters: ColumnFilters = {
  type: null,
  title: null,
  status: null,
  importance: null,
  dueDate: null,
};

interface SpreadsheetViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelectTask: (id: string) => void;
  onAddTask: (data: AddTaskData) => void;
  isAddTaskModalOpen?: boolean;
  onAddTaskModalOpenChange?: (isOpen: boolean) => void;
  onNavigateToFullDayNotes: (
    filterState: SpreadsheetFilterState,
    visibleTaskIds: string[]
  ) => void;
  onNavigateToArchive: () => void;
  onVisibleTasksChange?: (tasks: Task[]) => void;
  initialFilters?: SpreadsheetFilterState;
  onFilterStateChange?: (state: SpreadsheetFilterState) => void;
}

export function SpreadsheetView({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
  onSelectTask,
  onAddTask,
  isAddTaskModalOpen,
  onAddTaskModalOpenChange,
  onNavigateToFullDayNotes,
  onNavigateToArchive,
  onVisibleTasksChange,
  initialFilters,
  onFilterStateChange,
}: SpreadsheetViewProps) {
  const [dateFilterPreset, setDateFilterPreset] = useState<DateFilterPreset>(
    initialFilters?.dateFilterPreset ?? 'all'
  );
  const [dateFilterDate, setDateFilterDate] = useState<number | null>(
    initialFilters?.dateFilterDate ?? null
  );
  const [dateFilterRange, setDateFilterRange] = useState<DateRange | null>(
    initialFilters?.dateFilterRange ?? null
  );
  const [filters, setFilters] = useState<ColumnFilters>(
    initialFilters?.filters ?? defaultFilters
  );

  // Track visible task IDs for navigation
  const visibleTaskIdsRef = useRef<string[]>([]);

  // Apply initial filters when they change (e.g., returning from task notes)
  const initialFiltersApplied = useRef(false);
  useEffect(() => {
    if (initialFilters && !initialFiltersApplied.current) {
      setDateFilterPreset(initialFilters.dateFilterPreset);
      setDateFilterDate(initialFilters.dateFilterDate ?? null);
      setDateFilterRange(initialFilters.dateFilterRange ?? null);
      setFilters(initialFilters.filters);
      initialFiltersApplied.current = true;
    }
  }, [initialFilters]);

  useEffect(() => {
    onFilterStateChange?.({
      filters,
      dateFilterPreset,
      dateFilterDate,
      dateFilterRange,
    });
  }, [
    filters,
    dateFilterPreset,
    dateFilterDate,
    dateFilterRange,
    onFilterStateChange,
  ]);

  // Calculate counts for each preset
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

  const handleVisibleTasksChange = useCallback(
    (visibleTasks: Task[]) => {
      visibleTaskIdsRef.current = visibleTasks.map((t) => t.id);
      onVisibleTasksChange?.(visibleTasks);
    },
    [onVisibleTasksChange]
  );

  const handleNavigateToFullDayNotes = useCallback(() => {
    const filterState: SpreadsheetFilterState = {
      filters,
      dateFilterPreset,
      dateFilterDate,
      dateFilterRange,
    };
    onNavigateToFullDayNotes(filterState, visibleTaskIdsRef.current);
  }, [
    filters,
    dateFilterPreset,
    dateFilterDate,
    dateFilterRange,
    onNavigateToFullDayNotes,
  ]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={handleNavigateToFullDayNotes}
          className="text-small text-muted hover:text-primary flex items-center gap-1"
        >
          <DocumentIcon />
          Task Notes
        </button>
        <DateFilterMenu
          activePreset={dateFilterPreset}
          selectedDate={dateFilterDate}
          selectedRange={dateFilterRange}
          counts={presetCounts}
          onPresetChange={(preset) => {
            setDateFilterPreset(preset);
            if (preset !== 'specific-date') {
              setDateFilterDate(null);
            }
            if (preset !== 'date-range') {
              setDateFilterRange(null);
            }
          }}
          onDateChange={(date) => {
            if (!date) {
              setDateFilterPreset('all');
              setDateFilterDate(null);
              return;
            }
            setDateFilterPreset('specific-date');
            setDateFilterDate(date);
            setDateFilterRange(null);
          }}
          onRangeChange={(range) => {
            if (!range) {
              setDateFilterPreset('all');
              setDateFilterRange(null);
              return;
            }
            setDateFilterPreset('date-range');
            setDateFilterRange(range);
            setDateFilterDate(null);
          }}
        />
        <button
          type="button"
          onClick={onNavigateToArchive}
          className="text-small text-muted hover:text-primary flex items-center gap-1"
        >
          <ArchiveIcon />
          Archive
        </button>
      </div>

      <TaskTable
        tasks={tasks}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onReorder={onReorder}
        onSelectTask={onSelectTask}
        onAddTask={onAddTask}
        dateFilterDate={dateFilterDate}
        dateFilterRange={dateFilterRange}
        isAddTaskModalOpen={isAddTaskModalOpen}
        onAddTaskModalOpenChange={onAddTaskModalOpenChange}
        dateFilterPreset={dateFilterPreset}
        onVisibleTasksChange={handleVisibleTasksChange}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}
