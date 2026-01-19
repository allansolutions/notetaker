import { DndContext, DragEndEvent, Modifier } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  Block,
  TodoMetadata,
  AGENDA_END_HOUR,
  AGENDA_START_HOUR,
  SNAP_INTERVAL,
} from '../types';
import { CurrentTimeLine } from './CurrentTimeLine';
import { AgendaBlock } from './AgendaBlock';

interface AgendaProps {
  blocks: Block[];
  todoMetadata: Record<string, TodoMetadata>;
  onUpdateTodoMetadata: (blockId: string, metadata: TodoMetadata) => void;
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

export function Agenda({
  blocks,
  todoMetadata,
  onUpdateTodoMetadata,
}: AgendaProps) {
  const hours = Array.from(
    { length: AGENDA_END_HOUR - AGENDA_START_HOUR },
    (_, i) => AGENDA_START_HOUR + i
  );

  const isTodoBlock = (type: string): boolean =>
    type === 'todo' || type === 'todo-checked';

  const scheduledTodos = blocks.filter((block) => {
    const metadata = todoMetadata[block.id];
    return (
      isTodoBlock(block.type) &&
      metadata?.scheduled &&
      metadata.startTime !== undefined
    );
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const blockId = active.id as string;
    const metadata = todoMetadata[blockId];

    if (!metadata?.startTime) return;

    // Convert pixel delta to minutes
    const deltaMinutes = (delta.y / HOUR_HEIGHT) * 60;
    const newStartTime = metadata.startTime + deltaMinutes;

    // Snap to SNAP_INTERVAL minutes
    const snappedStartTime =
      Math.round(newStartTime / SNAP_INTERVAL) * SNAP_INTERVAL;

    // Clamp to valid agenda range
    const minStartTime = AGENDA_START_HOUR * 60;
    const maxStartTime = AGENDA_END_HOUR * 60 - (metadata.duration ?? 60);
    const clampedStartTime = Math.max(
      minStartTime,
      Math.min(maxStartTime, snappedStartTime)
    );

    onUpdateTodoMetadata(blockId, {
      ...metadata,
      startTime: clampedStartTime,
    });
  };

  return (
    <div className="mt-6" data-testid="agenda">
      <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        Agenda
      </div>
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

          {/* Scheduled todos */}
          {scheduledTodos.map((block) => {
            const metadata = todoMetadata[block.id];
            if (!metadata?.startTime) return null;

            return (
              <AgendaBlock
                key={block.id}
                block={block}
                metadata={metadata}
                hourHeight={HOUR_HEIGHT}
                onUpdateMetadata={(newMetadata) =>
                  onUpdateTodoMetadata(block.id, newMetadata)
                }
              />
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

export { HOUR_HEIGHT };
