import { useRef, useState, useEffect, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Block,
  TodoMetadata,
  AGENDA_START_HOUR,
  AGENDA_END_HOUR,
  SNAP_INTERVAL,
  MIN_DURATION,
} from '../types';

interface AgendaBlockProps {
  block: Block;
  metadata: TodoMetadata;
  hourHeight: number;
  onUpdateMetadata: (metadata: TodoMetadata) => void;
}

export function AgendaBlock({
  block,
  metadata,
  hourHeight,
  onUpdateMetadata,
}: AgendaBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: block.id,
    });

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startDuration: number } | null>(
    null
  );

  const startMinutes = (metadata.startTime ?? 0) - AGENDA_START_HOUR * 60;
  const duration = metadata.duration ?? 60;
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
      const maxDuration = AGENDA_END_HOUR * 60 - (metadata.startTime ?? 0);
      const clampedDuration = Math.max(
        MIN_DURATION,
        Math.min(maxDuration, snappedDuration)
      );

      onUpdateMetadata({
        ...metadata,
        duration: clampedDuration,
      });
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
  }, [isResizing, hourHeight, metadata, onUpdateMetadata]);

  const style = {
    top,
    height: Math.max(height, 20),
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging || isResizing ? 20 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-12 right-1 bg-accent rounded px-2 py-1 text-xs text-primary overflow-hidden select-none ${
        isResizing ? '' : 'cursor-move'
      }`}
      style={style}
      data-testid={`agenda-block-${block.id}`}
      {...listeners}
      {...attributes}
    >
      <div className="truncate font-medium">{block.content || 'Untitled'}</div>
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
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const newDuration = Math.min(
              AGENDA_END_HOUR * 60 - (metadata.startTime ?? 0),
              duration + SNAP_INTERVAL
            );
            onUpdateMetadata({ ...metadata, duration: newDuration });
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const newDuration = Math.max(
              MIN_DURATION,
              duration - SNAP_INTERVAL
            );
            onUpdateMetadata({ ...metadata, duration: newDuration });
          }
        }}
        data-testid={`agenda-block-resize-${block.id}`}
      />
    </div>
  );
}
