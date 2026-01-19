import { Task } from '../../types';
import { TaskTable } from '../spreadsheet/TaskTable';
import { DocumentIcon } from '../icons';

interface SpreadsheetViewProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelectTask: (id: string) => void;
  onAddTask: (title: string) => void;
  onNavigateToFullDayNotes: () => void;
}

export function SpreadsheetView({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
  onSelectTask,
  onAddTask,
  onNavigateToFullDayNotes,
}: SpreadsheetViewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onNavigateToFullDayNotes}
          className="text-small text-muted hover:text-primary flex items-center gap-1"
        >
          <DocumentIcon />
          Full Day Notes
        </button>
        <h1 className="text-lg font-semibold text-primary">Tasks</h1>
        <div className="w-24"></div>
      </div>

      <TaskTable
        tasks={tasks}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onReorder={onReorder}
        onSelectTask={onSelectTask}
        onAddTask={onAddTask}
      />
    </div>
  );
}
