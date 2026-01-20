import { DndContext, DragEndEvent, Modifier } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  Task,
  CalendarEvent,
  AGENDA_END_HOUR,
  AGENDA_START_HOUR,
  SNAP_INTERVAL,
} from '../types';
import { CurrentTimeLine } from './CurrentTimeLine';
import { AgendaBlock } from './AgendaBlock';
import { CalendarEventBlock } from './CalendarEventBlock';

interface AgendaProps {
  tasks: Task[];
  calendarEvents?: CalendarEvent[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

const HOUR_HEIGHT = 48; // pixels per hour
const SNAP_GRID_SIZE = (SNAP_INTERVAL / 60) * HOUR_HEIGHT; // 12 pixels for 15-minute intervals

const snapToGrid: Modifier = ({ transform }) => ({
  ...transform,
  y: Math.round(transform.y / SNAP_GRID_SIZE) * SNAP_GRID_SIZE,
});

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function Agenda({
  tasks,
  calendarEvents = [],
  onUpdateTask,
}: AgendaProps) {
  const hours = Array.from(
    { length: AGENDA_END_HOUR - AGENDA_START_HOUR },
    (_, i) => AGENDA_START_HOUR + i
  );

  // Show tasks that have a startTime and are scheduled for today
  const scheduledTasks = tasks.filter(
    (task) =>
      task.startTime !== undefined && task.dueDate && isToday(task.dueDate)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);

    if (!task?.startTime) return;

    // Convert pixel delta to minutes
    const deltaMinutes = (delta.y / HOUR_HEIGHT) * 60;
    const newStartTime = task.startTime + deltaMinutes;

    // Snap to SNAP_INTERVAL minutes
    const snappedStartTime =
      Math.round(newStartTime / SNAP_INTERVAL) * SNAP_INTERVAL;

    // Clamp to valid agenda range
    const minStartTime = AGENDA_START_HOUR * 60;
    const maxStartTime = AGENDA_END_HOUR * 60 - (task.duration ?? 60);
    const clampedStartTime = Math.max(
      minStartTime,
      Math.min(maxStartTime, snappedStartTime)
    );

    onUpdateTask(taskId, { startTime: clampedStartTime });
  };

  return (
    <div data-testid="agenda">
      <DndContext
        modifiers={[restrictToVerticalAxis, snapToGrid]}
        onDragEnd={handleDragEnd}
      >
        <div
          className="relative"
          style={{ height: hours.length * HOUR_HEIGHT }}
        >
          {/* Hour markers */}
          {hours.map((hour, index) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border"
              style={{ top: index * HOUR_HEIGHT }}
            >
              <span className="text-xs text-muted pl-1">
                {formatHour(hour)}
              </span>
            </div>
          ))}

          {/* Current time line */}
          <CurrentTimeLine hourHeight={HOUR_HEIGHT} />

          {/* Calendar events (behind tasks) */}
          {calendarEvents
            .filter((event) => !event.isAllDay)
            .map((event) => (
              <CalendarEventBlock
                key={`cal-${event.id}`}
                event={event}
                hourHeight={HOUR_HEIGHT}
              />
            ))}

          {/* Scheduled tasks */}
          {scheduledTasks
            .filter((task) => task.startTime !== undefined)
            .map((task) => (
              <AgendaBlock
                key={task.id}
                task={task}
                hourHeight={HOUR_HEIGHT}
                onUpdateTask={(updates) => onUpdateTask(task.id, updates)}
              />
            ))}
        </div>
      </DndContext>
    </div>
  );
}

export { HOUR_HEIGHT, snapToGrid, SNAP_GRID_SIZE };
