import { useState, useRef, useEffect } from 'react';
import { ClockIcon } from '../icons';

interface EstimateCellProps {
  value: number | undefined;
  onChange: (estimate: number | undefined) => void;
}

const ESTIMATE_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
];

function formatEstimate(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export function EstimateCell({ value, onChange }: EstimateCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePresetClick = (minutes: number) => {
    onChange(minutes);
    setIsOpen(false);
    setCustomValue('');
  };

  const handleCustomSubmit = () => {
    const minutes = parseInt(customValue, 10);
    if (!isNaN(minutes) && minutes > 0) {
      onChange(minutes);
      setIsOpen(false);
      setCustomValue('');
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-small rounded hover:bg-hover transition-colors min-w-[60px]"
      >
        {value ? (
          <span className="text-primary">{formatEstimate(value)}</span>
        ) : (
          <span className="text-muted">
            <ClockIcon />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1 p-2 bg-surface border border-border rounded-lg shadow-lg min-w-[140px]"
        >
          <div className="flex flex-wrap gap-1 mb-2">
            {ESTIMATE_PRESETS.map(({ label, minutes }) => (
              <button
                key={label}
                type="button"
                onClick={() => handlePresetClick(minutes)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  value === minutes
                    ? 'bg-primary text-white'
                    : 'bg-hover text-primary hover:bg-primary/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="number"
              min="1"
              placeholder="Custom"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              className="w-16 px-2 py-1 text-xs rounded bg-hover border border-border text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted self-center">min</span>
          </div>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
              className="mt-2 w-full text-xs text-muted hover:text-primary transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
