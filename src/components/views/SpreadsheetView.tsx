import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Task, DateFilterPreset } from '../../types';
import { TaskTable, ColumnFilters } from '../spreadsheet/TaskTable';
import { DocumentIcon, ArchiveIcon } from '../icons';
import { AddTaskData } from '../AddTaskModal';
import { DateFilterTabs } from '../DateFilterTabs';
import { matchesDatePreset } from '../../utils/date-filters';

export interface SpreadsheetFilterState {
  filters: ColumnFilters;
  dateFilterPreset: DateFilterPreset;
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
  onNavigateToFullDayNotes: (
    filterState: SpreadsheetFilterState,
    visibleTaskIds: string[]
  ) => void;
  onNavigateToArchive: () => void;
  onVisibleTasksChange?: (tasks: Task[]) => void;
  initialFilters?: SpreadsheetFilterState;
}

export function SpreadsheetView({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
  onSelectTask,
  onAddTask,
  onNavigateToFullDayNotes,
  onNavigateToArchive,
  onVisibleTasksChange,
  initialFilters,
}: SpreadsheetViewProps) {
  const [dateFilterPreset, setDateFilterPreset] = useState<DateFilterPreset>(
    initialFilters?.dateFilterPreset ?? 'all'
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
      setFilters(initialFilters.filters);
      initialFiltersApplied.current = true;
    }
  }, [initialFilters]);

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
    };
    onNavigateToFullDayNotes(filterState, visibleTaskIdsRef.current);
  }, [filters, dateFilterPreset, onNavigateToFullDayNotes]);

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
        <DateFilterTabs
          activePreset={dateFilterPreset}
          onPresetChange={setDateFilterPreset}
          counts={presetCounts}
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
        dateFilterPreset={dateFilterPreset}
        onVisibleTasksChange={handleVisibleTasksChange}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}
