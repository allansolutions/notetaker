import type { CalendarEvent } from '../types';
import { AGENDA_START_HOUR, MIN_DURATION } from '../types';

interface CalendarEventBlockProps {
  event: CalendarEvent;
  hourHeight: number;
}

export function CalendarEventBlock({
  event,
  hourHeight,
}: CalendarEventBlockProps) {
  const agendaStartMinutes = AGENDA_START_HOUR * 60;
  const offsetMinutes = event.startTime - agendaStartMinutes;
  const topPosition = (offsetMinutes / 60) * hourHeight;

  // Use minimum display height for very short events
  const displayDuration = Math.max(event.duration, MIN_DURATION);
  // Subtract 2px to create visual gap between back-to-back events
  const height = (displayDuration / 60) * hourHeight - 2;

  const openLink = () => {
    if (event.htmlLink) {
      window.open(event.htmlLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLink();
    }
  };

  return (
    <div
      data-testid="calendar-event-block"
      className={`absolute left-16 right-1 bg-calendar rounded text-xs text-inverted overflow-hidden select-none ${event.htmlLink ? 'cursor-pointer' : ''}`}
      style={{
        top: topPosition,
        height,
        zIndex: 0,
      }}
      onClick={event.htmlLink ? openLink : undefined}
      role={event.htmlLink ? 'button' : undefined}
      tabIndex={event.htmlLink ? 0 : undefined}
      onKeyDown={event.htmlLink ? handleKeyDown : undefined}
    >
      <div className="px-2 py-1">
        <div className="truncate font-medium">{event.summary}</div>
        {event.description && height > 30 && (
          <div className="truncate opacity-80">{event.description}</div>
        )}
      </div>
    </div>
  );
}
