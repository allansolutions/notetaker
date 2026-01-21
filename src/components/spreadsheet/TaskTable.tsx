import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  SortDirection,
} from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  Task,
  TaskType,
  TaskStatus,
  TaskImportance,
  DateFilterPreset,
  TASK_TYPE_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_IMPORTANCE_OPTIONS,
} from '../../types';
import { matchesDatePreset } from '../../utils/date-filters';
import { TypeCell } from './TypeCell';
import { StatusCell } from './StatusCell';
import { ImportanceCell } from './ImportanceCell';
import { TitleCell } from './TitleCell';
import { EstimateCell } from './EstimateCell';
import { DateCell } from './DateCell';
import { ColumnFilter, FilterValue } from './ColumnFilter';
import { DragHandleIcon, TrashIcon, PlusIcon } from '../icons';
import { AddTaskModal, AddTaskData } from '../AddTaskModal';

// Sort order maps for custom sorting
const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  'in-progress': 1,
  done: 2,
};

const IMPORTANCE_ORDER: Record<TaskImportance, number> = {
  low: 0,
  mid: 1,
  high: 2,
};

// Filter state type
export interface ColumnFilters {
  type: FilterValue | null;
  title: FilterValue | null;
  status: FilterValue | null;
  importance: FilterValue | null;
  dueDate: FilterValue | null;
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

// Helper functions for filtering to reduce cognitive complexity
function matchesMultiselect(
  filterValue: FilterValue | null,
  taskValue: string
): boolean {
  if (filterValue?.type !== 'multiselect' || filterValue.selected.size === 0) {
    return true;
  }
  return filterValue.selected.has(taskValue);
}

function matchesTextFilter(
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

function matchesDateFilter(
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

function matchesTitleEnhancedFilter(
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

function SortIcon({ direction }: { direction: SortDirection | false }) {
  if (!direction) {
    return (
      <svg
        className="w-3 h-3 text-muted opacity-0 group-hover:opacity-50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-3 h-3 text-primary"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {direction === 'asc' ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      )}
    </svg>
  );
}

interface TaskTableProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelectTask: (id: string) => void;
  onAddTask: (data: AddTaskData) => void;
  dateFilterPreset?: DateFilterPreset;
  onVisibleTasksChange?: (tasks: Task[]) => void;
  // Optional controlled filter state
  filters?: ColumnFilters;
  onFiltersChange?: (filters: ColumnFilters) => void;
}

const columnHelper = createColumnHelper<Task>();

function DragHandle() {
  return (
    <div className="cursor-grab active:cursor-grabbing text-muted hover:text-primary px-1">
      <DragHandleIcon />
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted hover:text-error px-1 opacity-0 group-hover:opacity-100 transition-opacity"
      title="Delete task"
    >
      <TrashIcon />
    </button>
  );
}

// Helper to determine row background based on due date
function getRowDateClass(dueDate: number | undefined): string {
  if (!dueDate) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDate = new Date(dueDate);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate.getTime() === today.getTime()) {
    return 'bg-today';
  }
  if (taskDate.getTime() < today.getTime()) {
    return 'bg-overdue';
  }
  return '';
}

interface SortableRowProps {
  row: ReturnType<
    ReturnType<typeof useReactTable<Task>>['getRowModel']
  >['rows'][number];
  onDelete: () => void;
}

function SortableRow({ row, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.original.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  const dateClass = getRowDateClass(row.original.dueDate);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group hover:bg-hover border-b border-border ${dateClass}`}
      data-testid={`task-row-${row.original.id}`}
    >
      <td className="py-1 w-8">
        <div {...attributes} {...listeners}>
          <DragHandle />
        </div>
      </td>
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="py-1"
          style={{ width: cell.column.getSize() }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
      <td className="py-1 w-8">
        <DeleteButton onClick={onDelete} />
      </td>
    </tr>
  );
}

const defaultFilters: ColumnFilters = {
  type: null,
  title: null,
  status: null,
  importance: null,
  dueDate: null,
};

export function TaskTable({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
  onSelectTask,
  onAddTask,
  dateFilterPreset = 'all',
  onVisibleTasksChange,
  filters: controlledFilters,
  onFiltersChange,
}: TaskTableProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalFilters, setInternalFilters] =
    useState<ColumnFilters>(defaultFilters);

  // Use controlled or internal filters
  const isControlled = controlledFilters !== undefined;
  const filters = isControlled ? controlledFilters : internalFilters;

  const updateFilter = useCallback(
    (column: keyof ColumnFilters, value: FilterValue | null) => {
      const newFilters = { ...filters, [column]: value };
      if (isControlled && onFiltersChange) {
        onFiltersChange(newFilters);
      } else {
        setInternalFilters(newFilters);
      }
    },
    [filters, isControlled, onFiltersChange]
  );

  // Compute tasks filtered by all columns except title (for TitleFilter's checkbox list)
  const tasksFilteredByOtherColumns = useMemo(() => {
    return tasks.filter((task) => {
      // Apply date preset filter first
      if (!matchesDatePreset(task.dueDate, dateFilterPreset)) {
        return false;
      }

      // Apply all column filters except title
      const skipDueDateFilter = dateFilterPreset !== 'all';
      return (
        matchesMultiselect(filters.type, task.type) &&
        matchesMultiselect(filters.status, task.status) &&
        matchesMultiselect(filters.importance, task.importance ?? '') &&
        (skipDueDateFilter || matchesDateFilter(filters.dueDate, task.dueDate))
      );
    });
  }, [
    tasks,
    filters.type,
    filters.status,
    filters.importance,
    filters.dueDate,
    dateFilterPreset,
  ]);

  // Filter tasks based on date preset and column filters (including title)
  const filteredTasks = useMemo(() => {
    return tasksFilteredByOtherColumns.filter((task) => {
      // Apply title filter (handles both text and title-enhanced types)
      if (filters.title?.type === 'title-enhanced') {
        return matchesTitleEnhancedFilter(filters.title, task);
      }
      return matchesTextFilter(filters.title, task.title);
    });
  }, [tasksFilteredByOtherColumns, filters.title]);

  const hasActiveFilters = useMemo(() => {
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
  }, [filters]);

  const clearAllFilters = useCallback(() => {
    if (isControlled && onFiltersChange) {
      onFiltersChange(defaultFilters);
    } else {
      setInternalFilters(defaultFilters);
    }
  }, [isControlled, onFiltersChange]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('type', {
        header: 'Type',
        cell: ({ row, getValue }) => (
          <TypeCell
            value={getValue() as TaskType}
            onChange={(value) => onUpdateTask(row.original.id, { type: value })}
          />
        ),
        size: 140,
        sortingFn: 'alphanumeric',
      }),
      columnHelper.accessor('title', {
        header: 'Task',
        cell: ({ row, getValue }) => (
          <TitleCell
            value={getValue() as string}
            onClick={() => onSelectTask(row.original.id)}
          />
        ),
        sortingFn: 'alphanumeric',
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row, getValue }) => (
          <StatusCell
            value={getValue() as TaskStatus}
            onChange={(value) =>
              onUpdateTask(row.original.id, { status: value })
            }
          />
        ),
        size: 180,
        sortingFn: (rowA, rowB) => {
          const a = STATUS_ORDER[rowA.original.status];
          const b = STATUS_ORDER[rowB.original.status];
          return a - b;
        },
      }),
      columnHelper.accessor('importance', {
        header: 'Importance',
        cell: ({ row, getValue }) => (
          <ImportanceCell
            value={getValue()}
            onChange={(value) =>
              onUpdateTask(row.original.id, { importance: value })
            }
          />
        ),
        size: 100,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.importance
            ? IMPORTANCE_ORDER[rowA.original.importance]
            : -1;
          const b = rowB.original.importance
            ? IMPORTANCE_ORDER[rowB.original.importance]
            : -1;
          return a - b;
        },
      }),
      columnHelper.accessor('estimate', {
        header: 'Time',
        cell: ({ row, getValue }) => (
          <EstimateCell
            value={getValue() as number | undefined}
            sessions={row.original.sessions}
            onChange={(estimate) => onUpdateTask(row.original.id, { estimate })}
          />
        ),
        size: 130,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.estimate ?? Infinity;
          const b = rowB.original.estimate ?? Infinity;
          return a - b;
        },
      }),
      columnHelper.accessor('dueDate', {
        header: 'Date',
        cell: ({ row, getValue }) => (
          <DateCell
            value={getValue() as number | undefined}
            onChange={(date) =>
              onUpdateTask(row.original.id, { dueDate: date })
            }
          />
        ),
        size: 100,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.dueDate ?? Infinity;
          const b = rowB.original.dueDate ?? Infinity;
          return a - b;
        },
      }),
    ],
    [onUpdateTask, onSelectTask]
  );

  const table = useReactTable({
    data: filteredTasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
  });

  // Notify parent of visible tasks (after filtering and sorting)
  const visibleRows = table.getRowModel().rows;
  useEffect(() => {
    if (onVisibleTasksChange) {
      onVisibleTasksChange(visibleRows.map((row) => row.original));
    }
  }, [visibleRows, onVisibleTasksChange]);

  // Map column IDs to filter config
  const filterConfig: Record<
    string,
    {
      type: 'multiselect' | 'text' | 'date' | 'title-enhanced';
      options?: { value: string; label: string }[];
      filterKey: keyof ColumnFilters;
    }
  > = {
    type: {
      type: 'multiselect',
      options: TASK_TYPE_OPTIONS,
      filterKey: 'type',
    },
    title: { type: 'title-enhanced', filterKey: 'title' },
    status: {
      type: 'multiselect',
      options: TASK_STATUS_OPTIONS,
      filterKey: 'status',
    },
    importance: {
      type: 'multiselect',
      options: TASK_IMPORTANCE_OPTIONS,
      filterKey: 'importance',
    },
    dueDate: { type: 'date', filterKey: 'dueDate' },
  };

  // Prepare available tasks for title filter (filtered by other columns)
  const availableTasksForTitleFilter = useMemo(
    () =>
      tasksFilteredByOtherColumns.map((t) => ({
        id: t.id,
        title: t.title,
      })),
    [tasksFilteredByOtherColumns]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex);
    }
  };

  const handleAddTask = (data: AddTaskData) => {
    onAddTask(data);
    setShowAddModal(false);
  };

  return (
    <div className="w-full">
      {hasActiveFilters && (
        <div className="flex items-center justify-between mb-2 px-2 py-1 bg-primary/5 border border-primary/20 rounded text-xs">
          <span className="text-primary">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-muted hover:text-primary"
          >
            Clear all filters
          </button>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full text-small">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="text-left text-xs text-muted uppercase tracking-wider border-b border-border"
              >
                <th className="pb-2 w-8"></th>
                {headerGroup.headers.map((header) => {
                  const config = filterConfig[header.id];
                  return (
                    <th
                      key={header.id}
                      className="pb-2 font-semibold px-2"
                      style={{ width: header.column.getSize() }}
                    >
                      <div className="group flex items-center gap-1">
                        <button
                          type="button"
                          className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <SortIcon direction={header.column.getIsSorted()} />
                        </button>
                        {config && (
                          <ColumnFilter
                            filterType={config.type}
                            options={config.options}
                            filterValue={filters[config.filterKey]}
                            onFilterChange={(value) =>
                              updateFilter(config.filterKey, value)
                            }
                            availableTasks={
                              config.type === 'title-enhanced'
                                ? availableTasksForTitleFilter
                                : undefined
                            }
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="pb-2 w-8"></th>
              </tr>
            ))}
          </thead>
          <SortableContext
            items={filteredTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <SortableRow
                  key={row.id}
                  row={row}
                  onDelete={() => onDeleteTask(row.original.id)}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>

      {/* Add Task Button */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-border text-muted hover:border-muted hover:text-primary hover:bg-hover transition-colors"
          aria-label="Add task"
        >
          <PlusIcon />
        </button>
      </div>

      {showAddModal && (
        <AddTaskModal
          onSubmit={handleAddTask}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
