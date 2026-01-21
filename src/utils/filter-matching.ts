import { Task } from '../types';
import { FilterValue } from '../components/spreadsheet/ColumnFilter';
import { SpreadsheetFilterState } from '../components/views/SpreadsheetView';
import { matchesDatePreset } from './date-filters';

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

export function matchesMultiselect(
  filterValue: FilterValue | null,
  taskValue: string
): boolean {
  if (filterValue?.type !== 'multiselect' || filterValue.selected.size === 0) {
    return true;
  }
  return filterValue.selected.has(taskValue);
}

export function matchesTextFilter(
  filterValue: FilterValue | null,
  taskValue: string
): boolean {
  if (filterValue?.type !== 'text' || !filterValue.value.trim()) {
    return true;
  }
  const pattern = filterValue.value.trim();
  if (pattern.includes('*')) {
    return wildcardMatch(taskValue, pattern);
  }
  return taskValue.toLowerCase().includes(pattern.toLowerCase());
}

export function matchesDateFilter(
  filterValue: FilterValue | null,
  taskDate: number | undefined
): boolean {
  if (filterValue?.type !== 'date' || filterValue.value === null) {
    return true;
  }
  if (!taskDate) return false;
  const filterDate = new Date(filterValue.value);
  const taskDateObj = new Date(taskDate);
  return (
    filterDate.getFullYear() === taskDateObj.getFullYear() &&
    filterDate.getMonth() === taskDateObj.getMonth() &&
    filterDate.getDate() === taskDateObj.getDate()
  );
}

export function matchesTitleEnhancedFilter(
  filterValue: FilterValue | null,
  task: { id: string; title: string }
): boolean {
  if (filterValue?.type !== 'title-enhanced') {
    return true;
  }
  const { searchText, selectedTaskIds } = filterValue;

  // If specific tasks are selected, check if this task is in the set
  if (selectedTaskIds !== null) {
    return selectedTaskIds.has(task.id);
  }

  // Otherwise, match by search text (null selectedTaskIds means all matching tasks)
  if (!searchText.trim()) {
    return true;
  }

  const pattern = searchText.trim();
  if (pattern.includes('*')) {
    return wildcardMatch(task.title, pattern);
  }
  return task.title.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Check if a task matches the given filter state (column filters + date preset).
 * Used to determine if a newly created task falls outside the current filters.
 */
export function doesTaskMatchFilters(
  task: Task,
  filterState: SpreadsheetFilterState
): boolean {
  const { filters, dateFilterPreset, dateFilterDate, dateFilterRange } =
    filterState;

  // Check date preset filter
  if (
    !matchesDatePreset(task.dueDate, dateFilterPreset, new Date(), {
      specificDate: dateFilterDate,
      range: dateFilterRange,
    })
  ) {
    return false;
  }

  // Check column filters
  // Skip dueDate column filter when a preset (other than 'all') is active
  const skipDueDateFilter = dateFilterPreset !== 'all';

  return (
    matchesMultiselect(filters.type, task.type) &&
    matchesTitleFilter(filters.title, task) &&
    matchesMultiselect(filters.status, task.status) &&
    matchesMultiselect(filters.importance, task.importance ?? '') &&
    (skipDueDateFilter || matchesDateFilter(filters.dueDate, task.dueDate))
  );
}

/**
 * Match title filter (handles both text and title-enhanced types)
 */
function matchesTitleFilter(
  filterValue: FilterValue | null,
  task: { id: string; title: string }
): boolean {
  if (!filterValue) return true;

  if (filterValue.type === 'title-enhanced') {
    return matchesTitleEnhancedFilter(filterValue, task);
  }

  if (filterValue.type === 'text') {
    return matchesTextFilter(filterValue, task.title);
  }

  return true;
}

/**
 * Check if there are any active filters in the filter state.
 */
export function hasActiveFilters(filterState: SpreadsheetFilterState): boolean {
  const { filters, dateFilterPreset, dateFilterDate, dateFilterRange } =
    filterState;

  // Check date preset
  if (dateFilterPreset !== 'all') {
    return true;
  }

  if (dateFilterDate || dateFilterRange) {
    return true;
  }

  // Check column filters
  return Object.values(filters).some((f) => {
    if (!f) return false;
    if (f.type === 'multiselect') return f.selected.size > 0;
    if (f.type === 'text') return f.value.trim() !== '';
    if (f.type === 'date') return f.value !== null;
    if (f.type === 'title-enhanced') {
      return f.searchText.trim() !== '' || f.selectedTaskIds !== null;
    }
    return false;
  });
}
