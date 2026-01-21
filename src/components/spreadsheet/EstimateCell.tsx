import { useState, useRef, useEffect } from 'react';
import { ClockIcon } from '../icons';
import { TimeSession } from '../../types';
import { formatMinutes } from '../../utils/task-operations';

interface EstimateCellProps {
  value: number | undefined;
  sessions?: TimeSession[];
  onChange: (estimate: number | undefined) => void;
}

/**
 * Parse time input in JIRA-style format:
 * - "30" or "30m" = 30 minutes
 * - "2h" = 2 hours = 120 minutes
 * - "2h 30m" = 2 hours 30 minutes = 150 minutes
 * Returns undefined if input is invalid
 */
function parseTimeInput(input: string): number | undefined {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return undefined;

  // Pattern: optional hours, optional minutes
  // e.g., "2h", "30m", "2h 30m", "2h30m", or just "30"
  const match = trimmed.match(/^(?:(\d+)h)?\s*(?:(\d+)m?)?$/);
  if (!match) return undefined;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const mins = match[2] ? parseInt(match[2], 10) : 0;

  // If just a plain number with no h/m suffix, treat as minutes
  if (!trimmed.includes('h') && !trimmed.includes('m')) {
    const plainNumber = parseInt(trimmed, 10);
    if (!isNaN(plainNumber) && plainNumber > 0) {
      return plainNumber;
    }
    return undefined;
  }

  const total = hours * 60 + mins;
  return total > 0 ? total : undefined;
}

function calculateTimeSpent(sessions: TimeSession[] | undefined): number {
  if (!sessions || sessions.length === 0) return 0;
  return sessions.reduce((total, session) => {
    const end = session.endTime ?? Date.now();
    return total + (end - session.startTime);
  }, 0);
}

export function EstimateCell({ value, sessions, onChange }: EstimateCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const timeSpentMs = calculateTimeSpent(sessions);
  const timeSpentMinutes = Math.floor(timeSpentMs / 60000);
  const isOverEstimate = value !== undefined && timeSpentMs > value * 60000;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEstimateClick = () => {
    setInputValue(value !== undefined ? formatMinutes(value) : '');
    setIsEditing(true);
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
    if (trimmed === '') {
      onChange(undefined);
    } else {
      const minutes = parseTimeInput(trimmed);
      if (minutes !== undefined) {
        onChange(minutes);
      }
    }
    setIsEditing(false);
    setInputValue('');
  };

  const renderEstimateControl = () => {
    if (isEditing) {
      return (
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
      );
    }

    if (value !== undefined) {
      return (
        <button
          type="button"
          onClick={handleEstimateClick}
          className={`rounded hover:bg-hover transition-colors px-1 ${isOverEstimate ? 'text-red-500' : 'text-primary'}`}
        >
          {formatMinutes(value)}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleEstimateClick}
        className="text-muted hover:bg-hover rounded transition-colors px-1"
      >
        <ClockIcon />
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 text-small whitespace-nowrap">
      {value !== undefined && (
        <span className={isOverEstimate ? 'text-red-500' : 'text-muted'}>
          {formatMinutes(timeSpentMinutes)} /
        </span>
      )}
      {renderEstimateControl()}
    </div>
  );
}
