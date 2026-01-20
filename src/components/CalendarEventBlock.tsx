import type { CalendarEvent } from '../types';
import { AGENDA_START_HOUR, MIN_DURATION } from '../types';

interface CalendarEventBlockProps {
  event: CalendarEvent;
  hourHeight: number;
}

// Threshold below which we use compact single-line display
const COMPACT_HEIGHT_THRESHOLD = 24;

function formatEventTime(startTime: number): string {
  const hours = Math.floor(startTime / 60);
  const minutes = startTime % 60;
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 || 12;
  if (minutes === 0) {
    return `${displayHour}${period}`;
  }
  return `${displayHour}:${minutes.toString().padStart(2, '0')}${period}`;
}

export { formatEventTime, COMPACT_HEIGHT_THRESHOLD };

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
      className={`absolute left-16 right-1 bg-calendar rounded text-inverted overflow-hidden select-none ${event.htmlLink ? 'cursor-pointer' : ''}`}
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
      {height <= COMPACT_HEIGHT_THRESHOLD ? (
        <div className="px-1.5 h-full flex items-center text-[11px]">
          <span className="truncate">
            {event.summary}, {formatEventTime(event.startTime)}
          </span>
        </div>
      ) : (
        <div className="px-2 py-1 text-xs">
          <div className="truncate font-medium">{event.summary}</div>
          {event.description && height > 30 && (
            <div className="truncate opacity-80">{event.description}</div>
          )}
        </div>
      )}
    </div>
  );
}
