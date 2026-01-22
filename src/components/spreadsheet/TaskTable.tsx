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
  DateRange,
  TASK_TYPE_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_IMPORTANCE_OPTIONS,
} from '../../types';
import { matchesDatePreset } from '../../utils/date-filters';
import {
  matchesMultiselect,
  matchesTextFilter,
  matchesDateFilter,
  matchesTitleEnhancedFilter,
} from '../../utils/filter-matching';
import { TypeCell } from './TypeCell';
import { StatusCell } from './StatusCell';
import { ImportanceCell } from './ImportanceCell';
import { TitleCell } from './TitleCell';
import { EstimateCell } from './EstimateCell';
import { DateCell } from './DateCell';
import { ColumnFilter, FilterValue } from './ColumnFilter';
import { DragHandleIcon, TrashIcon, PlusIcon } from '../icons';
import { AddTaskModal, AddTaskData } from '../AddTaskModal';
import { BlockedReasonModal } from '../BlockedReasonModal';

// Sort order maps for custom sorting
const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  'in-progress': 1,
  blocked: 2,
  done: 3,
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
  onReorder: (activeId: string, overId: string) => void;
  onSelectTask: (id: string) => void;
  onAddTask: (data: AddTaskData) => void;
  isAddTaskModalOpen?: boolean;
  onAddTaskModalOpenChange?: (isOpen: boolean) => void;
  dateFilterDate?: number | null;
  dateFilterRange?: DateRange | null;
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

interface BlockedReasonModalState {
  isOpen: boolean;
  taskId: string | null;
}

export function TaskTable({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onReorder,
  onSelectTask,
  onAddTask,
  isAddTaskModalOpen,
  onAddTaskModalOpenChange,
  dateFilterDate,
  dateFilterRange,
  dateFilterPreset = 'all',
  onVisibleTasksChange,
  filters: controlledFilters,
  onFiltersChange,
}: TaskTableProps) {
  const [internalAddModalOpen, setInternalAddModalOpen] = useState(false);
  const showAddModal = isAddTaskModalOpen ?? internalAddModalOpen;
  const setShowAddModal = onAddTaskModalOpenChange ?? setInternalAddModalOpen;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalFilters, setInternalFilters] =
    useState<ColumnFilters>(defaultFilters);
  const [blockedReasonModal, setBlockedReasonModal] =
    useState<BlockedReasonModalState>({ isOpen: false, taskId: null });

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

  // Handle status change - intercept 'blocked' to show reason modal
  const handleStatusChange = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      if (newStatus === 'blocked') {
        setBlockedReasonModal({ isOpen: true, taskId });
      } else {
        // Clear blockedReason when changing away from blocked
        onUpdateTask(taskId, { status: newStatus, blockedReason: undefined });
      }
    },
    [onUpdateTask]
  );

  const handleBlockedReasonSubmit = useCallback(
    (reason: string) => {
      if (blockedReasonModal.taskId) {
        onUpdateTask(blockedReasonModal.taskId, {
          status: 'blocked',
          blockedReason: reason,
        });
      }
      setBlockedReasonModal({ isOpen: false, taskId: null });
    },
    [blockedReasonModal.taskId, onUpdateTask]
  );

  const handleBlockedReasonCancel = useCallback(() => {
    setBlockedReasonModal({ isOpen: false, taskId: null });
  }, []);

  // Compute tasks filtered by all columns except title (for TitleFilter's checkbox list)
  const tasksFilteredByOtherColumns = useMemo(() => {
    return tasks.filter((task) => {
      // Apply date preset filter first
      if (
        !matchesDatePreset(task.dueDate, dateFilterPreset, new Date(), {
          specificDate: dateFilterDate,
          range: dateFilterRange,
        })
      ) {
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
    dateFilterDate,
    dateFilterRange,
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
        size: 120,
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
        size: 500,
        sortingFn: 'alphanumeric',
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row, getValue }) => (
          <StatusCell
            value={getValue() as TaskStatus}
            onChange={(value) => handleStatusChange(row.original.id, value)}
          />
        ),
        size: 110,
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
        size: 105,
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
        size: 75,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.dueDate ?? Infinity;
          const b = rowB.original.dueDate ?? Infinity;
          return a - b;
        },
      }),
    ],
    [onUpdateTask, onSelectTask, handleStatusChange]
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

    // Clear any active sorting so manual ordering takes effect
    setSorting([]);

    // Pass IDs directly - the context will find correct indices in the full tasks array
    onReorder(String(active.id), String(over.id));
  };

  const handleAddTask = (data: AddTaskData) => {
    onAddTask(data);
    setShowAddModal(false);
  };

  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full text-small table-fixed">
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
            items={visibleRows.map((row) => row.id)}
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

      {blockedReasonModal.isOpen && (
        <BlockedReasonModal
          onSubmit={handleBlockedReasonSubmit}
          onCancel={handleBlockedReasonCancel}
        />
      )}
    </div>
  );
}
