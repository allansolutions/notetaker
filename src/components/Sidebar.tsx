import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Task, CalendarEvent } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { SettingsMenu } from './SettingsMenu';
import { Agenda } from './Agenda';
import { GoogleConnectButton } from './GoogleConnectButton';

interface SidebarProps {
  tasks: Task[];
  calendarEvents?: CalendarEvent[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  tasks,
  calendarEvents = [],
  onUpdateTask,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  if (collapsed) {
    return (
      <div className="p-2 border-l border-border">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded hover:bg-accent-subtle transition-colors text-muted hover:text-foreground"
          aria-label="Expand sidebar"
        >
          <PanelRightOpen size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onToggleCollapse}
          className="p-1 -ml-1 rounded hover:bg-accent-subtle transition-colors text-muted hover:text-foreground"
          aria-label="Collapse sidebar"
        >
          <PanelRightClose size={16} />
        </button>
        <div className="text-xs font-semibold text-muted uppercase tracking-wider">
          Schedule
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <SettingsMenu />
        </div>
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
