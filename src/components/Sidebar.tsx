import { Task } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { Agenda } from './Agenda';

interface SidebarProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export function Sidebar({ tasks, onUpdateTask }: SidebarProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-muted uppercase tracking-wider">
          Schedule
        </div>
        <ThemeToggle />
      </div>

      <Agenda tasks={tasks} onUpdateTask={onUpdateTask} />
    </div>
  );
}
