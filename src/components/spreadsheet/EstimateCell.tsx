import { useState, useRef, useEffect } from 'react';
import { ClockIcon } from '../icons';
import { TimeSession } from '../../types';
import {
  formatMinutes,
  computeTimeSpentWithActive,
} from '../../utils/task-operations';
import { parseTimeInput } from '../../utils/time-parsing';

interface EstimateCellProps {
  value: number | undefined;
  sessions?: TimeSession[];
  onChange: (estimate: number | undefined) => void;
}

export function EstimateCell({ value, sessions, onChange }: EstimateCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const timeSpentMs = computeTimeSpentWithActive(sessions);
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
