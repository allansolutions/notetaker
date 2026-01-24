import { useMemo } from 'react';
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

interface ArchiveViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onSelectTask: (id: string) => void;
  onBack: () => void;
  dateFilterPreset: DateFilterPreset;
  dateFilterDate: number | null;
  dateFilterRange: DateRange | null;
  onDateFilterChange: (
    preset: DateFilterPreset,
    date: number | null,
    range: DateRange | null
  ) => void;
  filters: ColumnFilters;
  onFiltersChange: (filters: ColumnFilters) => void;
  groupBy?: GroupByMode;
  onGroupByChange?: (groupBy: GroupByMode) => void;
}

export function ArchiveView({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
  onSelectTask,
  onBack,
  dateFilterPreset,
  dateFilterDate,
  dateFilterRange,
  onDateFilterChange,
  filters,
  onFiltersChange,
  groupBy = 'none',
  onGroupByChange,
}: ArchiveViewProps): JSX.Element {
  const presetCounts = useMemo(() => computePresetCounts(tasks), [tasks]);

  const handlePresetChange = (preset: DateFilterPreset) => {
    const newDate = preset !== 'specific-date' ? null : dateFilterDate;
    const newRange = preset !== 'date-range' ? null : dateFilterRange;
    onDateFilterChange(preset, newDate, newRange);
  };

  const handleDateChange = (date: number | null) => {
    if (!date) {
      onDateFilterChange('all', null, null);
    } else {
      onDateFilterChange('specific-date', date, null);
    }
  };

  const handleRangeChange = (range: DateRange | null) => {
    if (!range) {
      onDateFilterChange('all', null, null);
    } else {
      onDateFilterChange('date-range', null, range);
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
          onFiltersChange={onFiltersChange}
          groupBy={groupBy}
          onGroupByChange={onGroupByChange}
        />
      )}
    </div>
  );
}
