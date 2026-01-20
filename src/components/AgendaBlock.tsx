import { useRef, useState, useEffect, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Task,
  AGENDA_START_HOUR,
  AGENDA_END_HOUR,
  SNAP_INTERVAL,
  MIN_DURATION,
  TASK_TYPE_COLORS,
} from '../types';

interface AgendaBlockProps {
  task: Task;
  hourHeight: number;
  onUpdateTask: (updates: Partial<Task>) => void;
}

export function AgendaBlock({
  task,
  hourHeight,
  onUpdateTask,
}: AgendaBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
    });

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startDuration: number } | null>(
    null
  );

  const startMinutes = (task.startTime ?? 0) - AGENDA_START_HOUR * 60;
  const duration = task.duration ?? 60;
  const top = (startMinutes / 60) * hourHeight;
  const height = (duration / 60) * hourHeight;

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      resizeRef.current = { startY: e.clientY, startDuration: duration };
      setIsResizing(true);
    },
    [duration]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;

      const deltaY = e.clientY - resizeRef.current.startY;
      const deltaMinutes = (deltaY / hourHeight) * 60;
      const newDuration = resizeRef.current.startDuration + deltaMinutes;

      // Snap to SNAP_INTERVAL minutes
      const snappedDuration =
        Math.round(newDuration / SNAP_INTERVAL) * SNAP_INTERVAL;

      // Clamp to valid range
      const maxDuration = AGENDA_END_HOUR * 60 - (task.startTime ?? 0);
      const clampedDuration = Math.max(
        MIN_DURATION,
        Math.min(maxDuration, snappedDuration)
      );

      onUpdateTask({ duration: clampedDuration });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, hourHeight, task.startTime, onUpdateTask]);

  const style = {
    top,
    height: Math.max(height, 20),
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging || isResizing ? 20 : 1,
  };

  const colors = TASK_TYPE_COLORS[task.type];

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-16 right-1 rounded text-xs overflow-hidden select-none ${colors.bg} ${colors.text}`}
      style={style}
      data-testid={`agenda-block-${task.id}`}
      {...attributes}
    >
      {/* Drag handle - fills block except resize area */}
      <div
        className="absolute inset-0 bottom-2 px-2 py-1 cursor-move"
        {...listeners}
      >
        <div className="truncate font-medium">{task.title || 'Untitled'}</div>
      </div>
      {/* Resize handle - bottom edge only */}
      <div
        role="slider"
        aria-label="Resize duration"
        aria-valuemin={15}
        aria-valuemax={1020}
        aria-valuenow={duration}
        tabIndex={0}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 focus:bg-black/10 focus:outline-none"
        onMouseDown={handleResizeStart}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          e.preventDefault();

          const maxDuration = AGENDA_END_HOUR * 60 - (task.startTime ?? 0);
          const delta = e.key === 'ArrowDown' ? SNAP_INTERVAL : -SNAP_INTERVAL;
          const newDuration = Math.max(
            MIN_DURATION,
            Math.min(maxDuration, duration + delta)
          );
          onUpdateTask({ duration: newDuration });
        }}
        data-testid={`agenda-block-resize-${task.id}`}
      />
    </div>
  );
}
