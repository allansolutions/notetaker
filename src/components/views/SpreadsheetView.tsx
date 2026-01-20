import { useState, useMemo } from 'react';
import { Task, DateFilterPreset } from '../../types';
import { TaskTable } from '../spreadsheet/TaskTable';
import { DocumentIcon } from '../icons';
import { AddTaskData } from '../AddTaskModal';
import { DateFilterTabs } from '../DateFilterTabs';
import { matchesDatePreset } from '../../utils/date-filters';

interface SpreadsheetViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelectTask: (id: string) => void;
  onAddTask: (data: AddTaskData) => void;
  onNavigateToFullDayNotes: () => void;
  onVisibleTasksChange?: (tasks: Task[]) => void;
}

export function SpreadsheetView({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
  onSelectTask,
  onAddTask,
  onNavigateToFullDayNotes,
  onVisibleTasksChange,
}: SpreadsheetViewProps) {
  const [dateFilterPreset, setDateFilterPreset] =
    useState<DateFilterPreset>('all');

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onNavigateToFullDayNotes}
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
        <div className="w-24"></div>
      </div>

      <TaskTable
        tasks={tasks}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onReorder={onReorder}
        onSelectTask={onSelectTask}
        onAddTask={onAddTask}
        dateFilterPreset={dateFilterPreset}
        onVisibleTasksChange={onVisibleTasksChange}
      />
    </div>
  );
}
