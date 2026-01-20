import { Task, CalendarEvent } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { Agenda } from './Agenda';
import { GoogleConnectButton } from './GoogleConnectButton';

interface SidebarProps {
  tasks: Task[];
  calendarEvents?: CalendarEvent[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export function Sidebar({
  tasks,
  calendarEvents = [],
  onUpdateTask,
}: SidebarProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-muted uppercase tracking-wider">
          Schedule
        </div>
        <ThemeToggle />
      </div>

      <Agenda
        tasks={tasks}
        calendarEvents={calendarEvents}
        onUpdateTask={onUpdateTask}
      />

      <div className="mt-4 pt-4 border-t border-border">
        <GoogleConnectButton />
      </div>
    </div>
  );
}
