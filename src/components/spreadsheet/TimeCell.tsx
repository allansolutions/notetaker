import { useState, useRef, useEffect } from 'react';
import { ClockIcon } from '../icons';
import { TimeSession } from '../../types';
import {
  formatMinutes,
  computeTimeSpentWithActive,
} from '../../utils/task-operations';
import { parseTimeInput } from '../../utils/time-parsing';

interface TimeCellProps {
  sessions?: TimeSession[];
  estimate?: number;
  onChange: (sessions: TimeSession[]) => void;
}

export function TimeCell({ sessions, estimate, onChange }: TimeCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const timeSpentMs = computeTimeSpentWithActive(sessions);
  const timeSpentMinutes = Math.floor(timeSpentMs / 60000);
  const isOverEstimate =
    estimate !== undefined && timeSpentMs > estimate * 60000;
  const canEdit = timeSpentMinutes === 0;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (canEdit) {
      setInputValue('');
      setIsEditing(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits, h, m, and spaces
    const val = e.target.value.replace(/[^0-9hHmM\s]/g, '').toLowerCase();
    setInputValue(val);
  };

  const handleInputBlur = () => {
    commitValue();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitValue();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue('');
    }
  };

  const commitValue = () => {
    const trimmed = inputValue.trim();
    if (trimmed !== '') {
      const minutes = parseTimeInput(trimmed);
      if (minutes !== undefined && minutes > 0) {
        // Create a completed session with the specified duration
        const now = Date.now();
        const newSession: TimeSession = {
          id: crypto.randomUUID(),
          startTime: now - minutes * 60000,
          endTime: now,
        };
        onChange([...(sessions || []), newSession]);
      }
    }
    setIsEditing(false);
    setInputValue('');
  };

  if (isEditing) {
    return (
      <div className="flex items-center px-2 py-1 text-small whitespace-nowrap">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          className="w-16 px-1 py-0 text-small rounded bg-hover border border-border text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="1h 30m"
        />
      </div>
    );
  }

  if (timeSpentMinutes > 0) {
    return (
      <div className="flex items-center px-2 py-1 text-small whitespace-nowrap">
        <span className={isOverEstimate ? 'text-red-500' : 'text-muted'}>
          {formatMinutes(timeSpentMinutes)}
        </span>
      </div>
    );
  }

  // Time is 0, show editable button
  return (
    <div className="flex items-center px-2 py-1 text-small whitespace-nowrap">
      <button
        type="button"
        onClick={handleClick}
        className="text-muted hover:bg-hover rounded transition-colors px-1"
      >
        <ClockIcon />
      </button>
    </div>
  );
}
