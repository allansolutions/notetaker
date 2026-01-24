import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Task, DateFilterPreset, DateRange } from '../../types';
import { TaskTable, ColumnFilters } from '../spreadsheet/TaskTable';
import { DocumentIcon, ArchiveIcon } from '../icons';
import { AddTaskData } from '../AddTaskModal';
import { DateFilterMenu } from '../DateFilterMenu';
import { DateFilterTitle } from '../DateFilterTitle';
import { computePresetCounts } from '../../utils/date-filters';

export interface SpreadsheetFilterState {
  filters: ColumnFilters;
  dateFilterPreset: DateFilterPreset;
  dateFilterDate?: number | null;
  dateFilterRange?: DateRange | null;
}

const defaultFilters: ColumnFilters = {
  type: null,
  assignee: null,
  title: null,
  status: null,
  importance: null,
  dueDate: null,
};

interface SpreadsheetViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onSelectTask: (id: string) => void;
  onAddTask: (data: AddTaskData) => void;
  isAddTaskModalOpen?: boolean;
  onAddTaskModalOpenChange?: (isOpen: boolean) => void;
  onNavigateToFullDayDetails: (
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
  onNavigateToFullDayDetails,
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

  // Apply initial filters when they change (e.g., returning from task details)
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

  const presetCounts = useMemo(() => computePresetCounts(tasks), [tasks]);

  const handleVisibleTasksChange = useCallback(
    (visibleTasks: Task[]) => {
      visibleTaskIdsRef.current = visibleTasks.map((t) => t.id);
      onVisibleTasksChange?.(visibleTasks);
    },
    [onVisibleTasksChange]
  );

  const handleNavigateToFullDayDetails = useCallback(() => {
    const filterState: SpreadsheetFilterState = {
      filters,
      dateFilterPreset,
      dateFilterDate,
      dateFilterRange,
    };
    onNavigateToFullDayDetails(filterState, visibleTaskIdsRef.current);
  }, [
    filters,
    dateFilterPreset,
    dateFilterDate,
    dateFilterRange,
    onNavigateToFullDayDetails,
  ]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={handleNavigateToFullDayDetails}
          className="text-small text-muted hover:text-primary flex items-center gap-1"
        >
          <DocumentIcon />
          Task Details
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

      <DateFilterTitle
        preset={dateFilterPreset}
        specificDate={dateFilterDate}
        dateRange={dateFilterRange}
      />

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
