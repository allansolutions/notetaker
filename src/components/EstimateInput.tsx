import { useState } from 'react';

interface EstimateInputProps {
  onSubmit: (minutes: number) => void;
}

const PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
];

export function EstimateInput({ onSubmit }: EstimateInputProps) {
  const [customValue, setCustomValue] = useState('');

  const handleCustomSubmit = () => {
    const minutes = parseInt(customValue, 10);
    if (!isNaN(minutes) && minutes > 0) {
      onSubmit(minutes);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap justify-center">
        {PRESETS.map(({ label, minutes }) => (
          <button
            key={label}
            type="button"
            onClick={() => onSubmit(minutes)}
            className="px-4 py-2 rounded-md bg-hover text-primary hover:bg-blue-500 hover:text-white transition-colors duration-normal font-medium"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-center justify-center">
        <input
          type="number"
          min="1"
          placeholder="Custom (min)"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-32 px-3 py-2 rounded-md bg-hover text-primary border border-border focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleCustomSubmit}
          disabled={!customValue || parseInt(customValue, 10) <= 0}
          className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-normal font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Set
        </button>
      </div>
    </div>
  );
}
