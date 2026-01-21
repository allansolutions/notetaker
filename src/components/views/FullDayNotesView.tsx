import {
  Task,
  TaskType,
  TimeSession,
  DateFilterPreset,
  DateRange,
} from '../../types';
import { BackButton } from '../BackButton';
import { TaskNotesEditor } from '../TaskNotesEditor';
import { DateFilterTitle } from '../DateFilterTitle';

interface FullDayNotesViewProps {
  tasks: Task[];
  onSelectTask: (id: string) => void;
  onBack: () => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onAddTask?: (
    title: string,
    type: TaskType,
    insertAfterTaskId?: string | null
  ) => Promise<Task | null>;
  onAddSession?: (taskId: string, session: TimeSession) => void;
  dateFilterPreset?: DateFilterPreset;
  dateFilterDate?: number | null;
  dateFilterRange?: DateRange | null;
}

export function FullDayNotesView({
  tasks,
  onSelectTask,
  onBack,
  onUpdateTask,
  onAddTask,
  onAddSession,
  dateFilterPreset = 'all',
  dateFilterDate,
  dateFilterRange,
}: FullDayNotesViewProps) {
  // Default no-op handlers if not provided
  const handleUpdateTask = onUpdateTask || (() => {});
  const handleAddTask = onAddTask || (async () => null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <BackButton onClick={onBack} />
        <h1 className="text-lg font-semibold text-primary">Task Notes</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DateFilterTitle
          preset={dateFilterPreset}
          specificDate={dateFilterDate}
          dateRange={dateFilterRange}
        />
        {tasks.length === 0 && !onAddTask ? (
          <p className="text-muted italic">
            No tasks match the current filters.
          </p>
        ) : (
          <TaskNotesEditor
            tasks={tasks}
            onUpdateTask={handleUpdateTask}
            onAddTask={handleAddTask}
            onSelectTask={onSelectTask}
            onAddSession={onAddSession}
          />
        )}
      </div>
    </div>
  );
}
