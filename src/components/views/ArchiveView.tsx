import { useState } from 'react';
import { Task } from '../../types';
import { TaskTable, ColumnFilters } from '../spreadsheet/TaskTable';
import { BackButton } from '../BackButton';
import { DateFilterMenu } from '../DateFilterMenu';
import { useDateFilter } from '../../hooks/useDateFilter';

const DEFAULT_FILTERS: ColumnFilters = {
  type: null,
  assignee: null,
  title: null,
  status: null,
  importance: null,
  dueDate: null,
};

const noop = (): void => {};

interface ArchiveViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onSelectTask: (id: string) => void;
  onBack: () => void;
}

export function ArchiveView({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
  onSelectTask,
  onBack,
}: ArchiveViewProps): JSX.Element {
  const {
    preset: dateFilterPreset,
    date: dateFilterDate,
    range: dateFilterRange,
    presetCounts,
    onPresetChange,
    onDateChange,
    onRangeChange,
  } = useDateFilter({ tasks });
  const [filters, setFilters] = useState<ColumnFilters>(DEFAULT_FILTERS);

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
          onPresetChange={onPresetChange}
          onDateChange={onDateChange}
          onRangeChange={onRangeChange}
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
        />
      )}
    </div>
  );
}
