import { useState, useRef, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

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
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleSelectAll}
        >
          All
        </Button>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleClear}
        >
          None
        </Button>
      </div>
      <div className="space-y-1.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 cursor-pointer hover:bg-accent px-1 py-0.5 rounded text-sm"
          >
            <Checkbox
              checked={selected.has(option.value)}
              onCheckedChange={() => handleToggle(option.value)}
            />
            <span>{option.label}</span>
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
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search..."
        className="h-8 text-sm"
      />
      <p className="text-xs text-muted-foreground mt-1.5">Use * as wildcard</p>
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
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);
      onChange(date.getTime());
    }
  };

  return (
    <div className="min-w-[160px]">
      <Input
        type="date"
        value={formatDateForInput(value)}
        onChange={handleDateChange}
        className="h-8 text-sm"
      />
      {value && (
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground mt-1"
          onClick={() => onChange(null)}
        >
          Clear date
        </Button>
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

  const isActive =
    filterValue !== null &&
    ((filterValue.type === 'multiselect' && filterValue.selected.size > 0) ||
      (filterValue.type === 'text' && filterValue.value.trim() !== '') ||
      (filterValue.type === 'date' && filterValue.value !== null));

  const handleClearFilter = () => {
    onFilterChange(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className={`size-6 ${
          isActive
            ? 'text-foreground bg-accent'
            : 'text-muted-foreground opacity-0 group-hover:opacity-50 hover:opacity-100'
        }`}
        title={isActive ? 'Filter active' : 'Filter'}
        data-testid="filter-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Filter className="size-3.5" />
      </Button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-50 bg-popover text-popover-foreground rounded-md border p-3 shadow-md"
          data-testid="filter-dropdown"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Filter
            </span>
            {isActive && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-5 text-muted-foreground hover:text-destructive"
                onClick={handleClearFilter}
                title="Clear filter"
              >
                <X className="size-3" />
              </Button>
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
