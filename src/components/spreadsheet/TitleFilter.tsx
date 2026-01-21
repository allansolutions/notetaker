import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface TitleFilterProps {
  searchText: string;
  selectedTaskIds: Set<string> | null; // null = all matching selected
  availableTasks: { id: string; title: string }[];
  onSearchChange: (text: string) => void;
  onSelectionChange: (taskIds: Set<string> | null) => void;
}

// Wildcard matching for text filter
function wildcardMatch(text: string, pattern: string): boolean {
  if (!pattern) return true;
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  // Convert wildcard pattern to regex
  const regexPattern = lowerPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
    .replace(/\*/g, '.*'); // Convert * to .*

  try {
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(lowerText);
  } catch {
    // Fallback to simple includes if regex fails
    return lowerText.includes(lowerPattern.replace(/\*/g, ''));
  }
}

export function TitleFilter({
  searchText,
  selectedTaskIds,
  availableTasks,
  onSearchChange,
  onSelectionChange,
}: TitleFilterProps) {
  const [localSearch, setLocalSearch] = useState(searchText);

  // Filter tasks by search text
  const filteredTasks = useMemo(() => {
    if (!localSearch.trim()) {
      return availableTasks;
    }
    const pattern = localSearch.trim();
    return availableTasks.filter((task) => {
      if (pattern.includes('*')) {
        return wildcardMatch(task.title, pattern);
      }
      return task.title.toLowerCase().includes(pattern.toLowerCase());
    });
  }, [availableTasks, localSearch]);

  // Determine which tasks are selected
  const selectedSet = useMemo(() => {
    if (selectedTaskIds === null) {
      // All matching tasks are selected
      return new Set(filteredTasks.map((t) => t.id));
    }
    return selectedTaskIds;
  }, [selectedTaskIds, filteredTasks]);

  const allSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((t) => selectedSet.has(t.id));
  const noneSelected = filteredTasks.every((t) => !selectedSet.has(t.id));

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange(value);
  };

  const handleSelectAll = () => {
    // Select all filtered tasks
    onSelectionChange(null);
  };

  const handleClear = () => {
    // Deselect all
    onSelectionChange(new Set());
  };

  const handleToggle = (taskId: string) => {
    const newSelected = new Set(selectedSet);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    // If all tasks are now selected, use null to indicate "all"
    const allNowSelected = filteredTasks.every((t) => newSelected.has(t.id));
    if (allNowSelected && filteredTasks.length === availableTasks.length) {
      onSelectionChange(null);
    } else {
      onSelectionChange(newSelected);
    }
  };

  const displayCount =
    selectedTaskIds === null ? filteredTasks.length : selectedSet.size;

  return (
    <div className="min-w-[220px]">
      {/* Search input */}
      <Input
        type="text"
        value={localSearch}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search titles..."
        className="h-8 text-sm mb-2"
        data-testid="title-filter-search"
      />

      {/* Select all / Clear links */}
      <div className="flex items-center justify-between mb-2 text-xs">
        <div className="flex gap-2">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleSelectAll}
            disabled={allSelected}
          >
            Select all {filteredTasks.length}
          </Button>
          <span className="text-muted-foreground">-</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleClear}
            disabled={noneSelected}
          >
            Clear
          </Button>
        </div>
        <span className="text-muted-foreground">{displayCount} selected</span>
      </div>

      {/* Scrollable checkbox list */}
      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {filteredTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">
            No tasks match search
          </p>
        ) : (
          filteredTasks.map((task) => (
            <label
              key={task.id}
              className="flex items-center gap-2 cursor-pointer hover:bg-accent px-1 py-0.5 rounded text-sm"
            >
              <Checkbox
                checked={selectedSet.has(task.id)}
                onCheckedChange={() => handleToggle(task.id)}
                data-testid={`title-filter-checkbox-${task.id}`}
              />
              <span className="truncate" title={task.title}>
                {task.title}
              </span>
            </label>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">Use * as wildcard</p>
    </div>
  );
}
