import { useState, useEffect } from 'react';
import { AGENDA_START_HOUR, AGENDA_END_HOUR } from '../types';

interface CurrentTimeLineProps {
  hourHeight: number;
}

export function CurrentTimeLine({ hourHeight }: CurrentTimeLineProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Only show if within agenda hours
  if (hours < AGENDA_START_HOUR || hours >= AGENDA_END_HOUR) {
    return null;
  }

  const minutesSinceStart = (hours - AGENDA_START_HOUR) * 60 + minutes;
  const top = (minutesSinceStart / 60) * hourHeight;

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-10"
      style={{ top }}
      data-testid="current-time-line"
    >
      <div className="relative flex items-center">
        <div
          className="absolute rounded-full bg-red-500"
          style={{ width: 8, height: 8, left: -4 }}
        />
        <div className="w-full h-px bg-red-500" />
      </div>
    </div>
  );
}
