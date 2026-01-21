import { useState, useMemo, useCallback } from 'react';
import { Task, DateFilterPreset } from '../../types';
import { TaskTable, ColumnFilters } from '../spreadsheet/TaskTable';
import { BackButton } from '../BackButton';
import { DateFilterTabs } from '../DateFilterTabs';
import { matchesDatePreset } from '../../utils/date-filters';

const defaultFilters: ColumnFilters = {
  type: null,
  title: null,
  status: null, // Not used in archive (all tasks are "done")
  importance: null,
  dueDate: null,
};

interface ArchiveViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
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
}: ArchiveViewProps) {
  const [dateFilterPreset, setDateFilterPreset] =
    useState<DateFilterPreset>('all');
  const [filters, setFilters] = useState<ColumnFilters>(defaultFilters);

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

  // No-op for adding tasks in archive view
  const handleAddTask = useCallback(() => {
    // Tasks cannot be added directly to archive
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} />
          <h1 className="text-lg font-semibold text-primary">Archive</h1>
        </div>
        <DateFilterTabs
          activePreset={dateFilterPreset}
          onPresetChange={setDateFilterPreset}
          counts={presetCounts}
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
          onAddTask={handleAddTask}
          dateFilterPreset={dateFilterPreset}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}
    </div>
  );
}
