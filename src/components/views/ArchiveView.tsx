import { useState, useMemo } from 'react';
import { Task, DateFilterPreset, DateRange } from '../../types';
import { TaskTable, ColumnFilters } from '../spreadsheet/TaskTable';
import { BackButton } from '../BackButton';
import { DateFilterMenu } from '../DateFilterMenu';
import { matchesDatePreset } from '../../utils/date-filters';

const defaultFilters: ColumnFilters = {
  type: null,
  title: null,
  status: null,
  importance: null,
  dueDate: null,
};

// No-op handler for archive view (tasks cannot be added to archive)
function noop(): void {}

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
}: ArchiveViewProps): JSX.Element {
  const [dateFilterPreset, setDateFilterPreset] =
    useState<DateFilterPreset>('all');
  const [dateFilterDate, setDateFilterDate] = useState<number | null>(null);
  const [dateFilterRange, setDateFilterRange] = useState<DateRange | null>(
    null
  );
  const [filters, setFilters] = useState<ColumnFilters>(defaultFilters);

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
