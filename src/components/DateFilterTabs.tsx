import { DateFilterPreset, DATE_FILTER_PRESET_OPTIONS } from '../types';

interface DateFilterTabsProps {
  activePreset: DateFilterPreset;
  onPresetChange: (preset: DateFilterPreset) => void;
  counts?: Record<DateFilterPreset, number>;
}

export function DateFilterTabs({
  activePreset,
  onPresetChange,
  counts,
}: DateFilterTabsProps) {
  return (
    <div
      className="flex gap-1"
      role="tablist"
      aria-label="Filter tasks by date"
    >
      {DATE_FILTER_PRESET_OPTIONS.map((option) => {
        const isActive = activePreset === option.value;
        const count = counts?.[option.value];

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onPresetChange(option.value)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted hover:text-primary hover:bg-hover'
            }`}
          >
            {option.label}
            {count !== undefined && (
              <span
                className={`ml-1 text-xs ${isActive ? 'text-primary/70' : 'text-muted'}`}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
