import { useState, useRef, useEffect, useCallback } from 'react';
import { FilterIcon, XIcon } from '../icons';

interface MultiSelectFilterProps {
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

function MultiSelectFilter({
  options,
  selected,
  onChange,
}: MultiSelectFilterProps) {
  const handleToggle = (value: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    onChange(new Set(options.map((o) => o.value)));
  };

  const handleClear = () => {
    onChange(new Set());
  };

  return (
    <div className="min-w-[140px]">
      <div className="flex gap-2 mb-2 text-xs">
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-muted hover:text-primary"
        >
          All
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="text-muted hover:text-primary"
        >
          None
        </button>
      </div>
      <div className="space-y-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 cursor-pointer hover:bg-hover px-1 py-0.5 rounded text-small"
          >
            <input
              type="checkbox"
              checked={selected.has(option.value)}
              onChange={() => handleToggle(option.value)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-primary">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface TextFilterProps {
  value: string;
  onChange: (value: string) => void;
}

function TextFilter({ value, onChange }: TextFilterProps) {
  return (
    <div className="min-w-[180px]">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
        className="w-full px-2 py-1 text-small bg-surface border border-border rounded text-primary placeholder:text-muted focus:outline-none focus:border-primary"
      />
      <p className="text-xs text-muted mt-1">Use * as wildcard</p>
    </div>
  );
}

interface DateFilterProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

function DateFilter({ value, onChange }: DateFilterProps) {
  const formatDateForInput = (timestamp: number | null): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // Format as YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) {
      onChange(null);
    } else {
      // Parse as local date (YYYY-MM-DD format)
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);
      onChange(date.getTime());
    }
  };

  return (
    <div className="min-w-[160px]">
      <input
        type="date"
        value={formatDateForInput(value)}
        onChange={handleDateChange}
        className="w-full px-2 py-1 text-small bg-surface border border-border rounded text-primary focus:outline-none focus:border-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted hover:text-primary mt-1"
        >
          Clear date
        </button>
      )}
    </div>
  );
}

export type FilterValue =
  | { type: 'multiselect'; selected: Set<string> }
  | { type: 'text'; value: string }
  | { type: 'date'; value: number | null };

interface ColumnFilterProps {
  filterType: 'multiselect' | 'text' | 'date';
  options?: { value: string; label: string }[];
  filterValue: FilterValue | null;
  onFilterChange: (value: FilterValue | null) => void;
}

export function ColumnFilter({
  filterType,
  options = [],
  filterValue,
  onFilterChange,
}: ColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const isActive =
    filterValue !== null &&
    ((filterValue.type === 'multiselect' && filterValue.selected.size > 0) ||
      (filterValue.type === 'text' && filterValue.value.trim() !== '') ||
      (filterValue.type === 'date' && filterValue.value !== null));

  const handleClearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFilterChange(null);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-0.5 rounded transition-colors ${
          isActive
            ? 'text-primary bg-primary/10'
            : 'text-muted opacity-0 group-hover:opacity-50 hover:opacity-100'
        }`}
        title={isActive ? 'Filter active' : 'Filter'}
        data-testid="filter-button"
      >
        <FilterIcon />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-surface border border-border rounded shadow-lg z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted uppercase">
              Filter
            </span>
            {isActive && (
              <button
                type="button"
                onClick={handleClearFilter}
                className="text-muted hover:text-error p-0.5"
                title="Clear filter"
              >
                <XIcon />
              </button>
            )}
          </div>

          {filterType === 'multiselect' && (
            <MultiSelectFilter
              options={options}
              selected={
                filterValue?.type === 'multiselect'
                  ? filterValue.selected
                  : new Set()
              }
              onChange={(selected) =>
                onFilterChange({ type: 'multiselect', selected })
              }
            />
          )}

          {filterType === 'text' && (
            <TextFilter
              value={filterValue?.type === 'text' ? filterValue.value : ''}
              onChange={(value) => onFilterChange({ type: 'text', value })}
            />
          )}

          {filterType === 'date' && (
            <DateFilter
              value={filterValue?.type === 'date' ? filterValue.value : null}
              onChange={(value) => onFilterChange({ type: 'date', value })}
            />
          )}
        </div>
      )}
    </div>
  );
}
