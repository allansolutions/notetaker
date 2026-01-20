import { Task, TaskType } from '../../types';
import { BackButton } from '../BackButton';
import { TaskNotesEditor } from '../TaskNotesEditor';

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
}

export function FullDayNotesView({
  tasks,
  onSelectTask,
  onBack,
  onUpdateTask,
  onAddTask,
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
          />
        )}
      </div>
    </div>
  );
}
