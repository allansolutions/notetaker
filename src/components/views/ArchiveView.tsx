import { useState, useMemo } from 'react';
import { SortingState } from '@tanstack/react-table';
import { Task, DateFilterPreset, DateRange } from '../../types';
import {
  TaskTable,
  ColumnFilters,
  GroupByMode,
} from '../spreadsheet/TaskTable';
import { BackButton } from '../BackButton';
import { DateFilterMenu } from '../DateFilterMenu';
import { computePresetCounts } from '../../utils/date-filters';

const noop = (): void => {};

const defaultFilters: ColumnFilters = {
  type: null,
  assignee: null,
  title: null,
  status: null,
  importance: null,
  dueDate: null,
};

const archiveDefaultSorting: SortingState = [{ id: 'dueDate', desc: true }];

interface ArchiveViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onSelectTask: (id: string) => void;
  onBack: () => void;
  onActiveTaskChange?: (taskId: string | null) => void;
}

export function ArchiveView({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
  onSelectTask,
  onBack,
  onActiveTaskChange,
}: ArchiveViewProps): JSX.Element {
  // Independent state - not shared with task list view
  const [dateFilterPreset, setDateFilterPreset] =
    useState<DateFilterPreset>('all');
  const [dateFilterDate, setDateFilterDate] = useState<number | null>(null);
  const [dateFilterRange, setDateFilterRange] = useState<DateRange | null>(
    null
  );
  const [filters, setFilters] = useState<ColumnFilters>(defaultFilters);
  const [groupBy, setGroupBy] = useState<GroupByMode>('date');

  const presetCounts = useMemo(() => computePresetCounts(tasks), [tasks]);

  const handlePresetChange = (preset: DateFilterPreset) => {
    setDateFilterPreset(preset);
    if (preset !== 'specific-date') setDateFilterDate(null);
    if (preset !== 'date-range') setDateFilterRange(null);
  };

  const handleDateChange = (date: number | null) => {
    if (!date) {
      setDateFilterPreset('all');
      setDateFilterDate(null);
    } else {
      setDateFilterPreset('specific-date');
      setDateFilterDate(date);
      setDateFilterRange(null);
    }
  };

  const handleRangeChange = (range: DateRange | null) => {
    if (!range) {
      setDateFilterPreset('all');
      setDateFilterRange(null);
    } else {
      setDateFilterPreset('date-range');
      setDateFilterRange(range);
      setDateFilterDate(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} />
          <h1 className="text-lg font-semibold text-primary">Archive</h1>
        </div>
        <DateFilterMenu
          activePreset={dateFilterPreset}
          selectedDate={dateFilterDate}
          selectedRange={dateFilterRange}
          counts={presetCounts}
          onPresetChange={handlePresetChange}
          onDateChange={handleDateChange}
          onRangeChange={handleRangeChange}
        />
        <div className="w-24"></div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted italic">No archived tasks.</p>
      ) : (
        <TaskTable
          tasks={tasks}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onReorder={onReorder}
          onSelectTask={onSelectTask}
          onAddTask={noop}
          dateFilterPreset={dateFilterPreset}
          dateFilterDate={dateFilterDate}
          dateFilterRange={dateFilterRange}
          filters={filters}
          onFiltersChange={setFilters}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          onActiveTaskChange={onActiveTaskChange}
          isArchive
          defaultSorting={archiveDefaultSorting}
        />
      )}
    </div>
  );
}
