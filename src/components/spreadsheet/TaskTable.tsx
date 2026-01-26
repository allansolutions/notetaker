import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
  DateGroup,
  getDateForGroup,
  getDateGroup,
  getGroupLabel,
  getGroupOrder,
  getRemainingWeekdayGroups,
  isWeekdayGroup,
} from '../../utils/date-groups';
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
import { AssigneeCell } from './AssigneeCell';
import { ColumnFilter, FilterValue } from './ColumnFilter';
import { DragHandleIcon, TrashIcon, PlusIcon, GroupIcon } from '../icons';
import {
  formatMinutes,
  computeTimeSpentWithActive,
} from '../../utils/task-operations';
import { useTeam } from '@/modules/teams/context/TeamContext';
import { AddTaskModal, AddTaskData, EditTaskData } from '../AddTaskModal';
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
  assignee: FilterValue | null;
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

export type GroupByMode =
  | 'none'
  | 'date'
  | 'type'
  | 'status'
  | 'importance'
  | 'assignee';

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
  // Grouping
  groupBy?: GroupByMode;
  onGroupByChange?: (groupBy: GroupByMode) => void;
  // Active row callback for command palette integration
  onActiveTaskChange?: (taskId: string | null) => void;
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
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isActive?: boolean;
}

function SortableRow({
  row,
  onDelete,
  isFirstInGroup,
  isLastInGroup,
  isActive,
}: SortableRowProps) {
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
  const isGrouped = isFirstInGroup !== undefined || isLastInGroup !== undefined;
  const groupClasses = isGrouped
    ? [
        'group-container-row',
        isFirstInGroup && 'group-first',
        isLastInGroup && 'group-last',
      ]
        .filter(Boolean)
        .join(' ')
    : 'border-b border-border';
  const activeClass = isActive ? 'ring-2 ring-accent ring-inset' : '';

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group hover:bg-hover ${dateClass} ${groupClasses} ${activeClass}`}
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

// Row data types for grouped rendering
type RowData =
  | { type: 'header'; group: string; label: string; remainingMinutes: number }
  | {
      type: 'task';
      task: Task;
      rowIndex: number;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
      group: string;
    };

// Group configuration for different group modes
interface GroupConfig {
  getGroup: (task: Task) => string;
  getLabel: (group: string) => string;
  getOrder: (group: string) => number;
  shouldSkipGroup?: (group: string) => boolean;
}

function GroupHeaderRow({
  label,
  columnCount,
  remainingMinutes,
}: {
  label: string;
  columnCount: number;
  remainingMinutes: number;
}) {
  return (
    <tr className="group-header-row">
      <td colSpan={columnCount + 2} className="pt-4 pb-1 px-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {label}
          {remainingMinutes > 0 && (
            <>: {formatMinutes(remainingMinutes)}</>
          )}
        </span>
      </td>
    </tr>
  );
}

// Map column IDs to their corresponding group modes
const COLUMN_GROUP_MAP: Record<string, GroupByMode> = {
  type: 'type',
  status: 'status',
  importance: 'importance',
  assigneeId: 'assignee',
  dueDate: 'date',
};

const COLUMN_LABELS: Record<string, string> = {
  type: 'type',
  status: 'status',
  importance: 'importance',
  assigneeId: 'assignee',
  dueDate: 'date',
};

function ColumnGroupButton({
  columnId,
  groupBy,
  onGroupByChange,
}: {
  columnId: string;
  groupBy: GroupByMode;
  onGroupByChange: (groupBy: GroupByMode) => void;
}) {
  const targetGroupBy = COLUMN_GROUP_MAP[columnId];
  if (!targetGroupBy) return null;

  const isActive = groupBy === targetGroupBy;

  return (
    <button
      type="button"
      onClick={() => onGroupByChange(isActive ? 'none' : targetGroupBy)}
      className={`p-0.5 rounded transition-colors ${
        isActive
          ? 'text-accent'
          : 'text-muted opacity-0 group-hover:opacity-50 hover:opacity-100'
      }`}
      title={
        isActive ? 'Disable grouping' : `Group by ${COLUMN_LABELS[columnId]}`
      }
    >
      <GroupIcon />
    </button>
  );
}

const defaultFilters: ColumnFilters = {
  type: null,
  assignee: null,
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
  groupBy = 'none',
  onGroupByChange,
  onActiveTaskChange,
}: TaskTableProps) {
  const { members } = useTeam();
  const [internalAddModalOpen, setInternalAddModalOpen] = useState(false);
  const showAddModal = isAddTaskModalOpen ?? internalAddModalOpen;
  const setShowAddModal = onAddTaskModalOpenChange ?? setInternalAddModalOpen;
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalFilters, setInternalFilters] =
    useState<ColumnFilters>(defaultFilters);
  const [blockedReasonModal, setBlockedReasonModal] =
    useState<BlockedReasonModalState>({ isOpen: false, taskId: null });
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

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
        matchesMultiselect(filters.assignee, task.assigneeId ?? '') &&
        matchesMultiselect(filters.status, task.status) &&
        matchesMultiselect(filters.importance, task.importance ?? '') &&
        (skipDueDateFilter || matchesDateFilter(filters.dueDate, task.dueDate))
      );
    });
  }, [
    tasks,
    filters.type,
    filters.assignee,
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

  // Build group configuration based on groupBy mode
  const groupConfig = useMemo((): GroupConfig | null => {
    if (groupBy === 'none') return null;

    const now = new Date();
    const remainingWeekdays = new Set(getRemainingWeekdayGroups(now));

    // Type grouping
    const typeOrder = TASK_TYPE_OPTIONS.reduce(
      (acc, opt, idx) => {
        acc[opt.value] = idx;
        return acc;
      },
      {} as Record<string, number>
    );
    const typeLabels = TASK_TYPE_OPTIONS.reduce(
      (acc, opt) => {
        acc[opt.value] = opt.label;
        return acc;
      },
      {} as Record<string, string>
    );

    // Status grouping
    const statusOrder: Record<string, number> = {
      todo: 0,
      'in-progress': 1,
      blocked: 2,
      done: 3,
    };
    const statusLabels = TASK_STATUS_OPTIONS.reduce(
      (acc, opt) => {
        acc[opt.value] = opt.label;
        return acc;
      },
      {} as Record<string, string>
    );

    // Importance grouping (high first)
    const importanceOrder: Record<string, number> = {
      high: 0,
      mid: 1,
      low: 2,
      '': 3, // No importance set
    };
    const importanceLabels: Record<string, string> = {
      high: 'High',
      mid: 'Mid',
      low: 'Low',
      '': 'No Importance',
    };

    // Assignee grouping
    const assigneeLabels = members.reduce(
      (acc, member) => {
        acc[member.userId] = member.user.name || member.user.email;
        return acc;
      },
      { '': 'Unassigned' } as Record<string, string>
    );
    const assigneeOrder = members.reduce(
      (acc, member, idx) => {
        acc[member.userId] = idx + 1; // Start at 1, 0 is for unassigned
        return acc;
      },
      { '': 0 } as Record<string, number>
    );

    switch (groupBy) {
      case 'date':
        return {
          getGroup: (task) => getDateGroup(task.dueDate, now),
          getLabel: (group) => getGroupLabel(group as DateGroup),
          getOrder: (group) => getGroupOrder(group as DateGroup),
          shouldSkipGroup: (group) =>
            isWeekdayGroup(group as DateGroup) &&
            !remainingWeekdays.has(group as DateGroup),
        };
      case 'type':
        return {
          getGroup: (task) => task.type,
          getLabel: (group) => typeLabels[group] || group,
          getOrder: (group) => typeOrder[group] ?? 999,
        };
      case 'status':
        return {
          getGroup: (task) => task.status,
          getLabel: (group) => statusLabels[group] || group,
          getOrder: (group) => statusOrder[group] ?? 999,
        };
      case 'importance':
        return {
          getGroup: (task) => task.importance || '',
          getLabel: (group) => importanceLabels[group] || group,
          getOrder: (group) => importanceOrder[group] ?? 999,
        };
      case 'assignee':
        return {
          getGroup: (task) => task.assigneeId || '',
          getLabel: (group) => assigneeLabels[group] || 'Unknown',
          getOrder: (group) => assigneeOrder[group] ?? 999,
        };
      default:
        return null;
    }
  }, [groupBy, members]);

  // Compute grouped row data for visual grouping
  const groupedRowData = useMemo((): RowData[] => {
    if (!groupConfig) return [];

    // Compute group for each task and sort by group order (preserving original order within groups)
    const tasksWithGroups = filteredTasks.map((task, originalIndex) => ({
      task,
      group: groupConfig.getGroup(task),
      originalIndex,
    }));

    // Sort by group order, then by original index to preserve order within groups
    tasksWithGroups.sort((a, b) => {
      const groupDiff =
        groupConfig.getOrder(a.group) - groupConfig.getOrder(b.group);
      if (groupDiff !== 0) return groupDiff;
      return a.originalIndex - b.originalIndex;
    });

    // Compute remaining time per group
    const groupRemainingMinutes = new Map<string, number>();
    for (const { task, group } of tasksWithGroups) {
      if (task.estimate !== undefined) {
        const spentMs = computeTimeSpentWithActive(task.sessions);
        const spentMinutes = Math.floor(spentMs / 60000);
        const remaining = Math.max(0, task.estimate - spentMinutes);
        groupRemainingMinutes.set(
          group,
          (groupRemainingMinutes.get(group) ?? 0) + remaining
        );
      }
    }

    // Build row data with headers
    const rowData: RowData[] = [];
    let currentGroup: string | null = null;
    let groupStartIndex = 0;

    tasksWithGroups.forEach((item, index) => {
      const { task, group } = item;

      // Check if we should skip this group (e.g., past weekdays for date grouping)
      const shouldShowGroup = !groupConfig.shouldSkipGroup?.(group);

      if (shouldShowGroup && group !== currentGroup) {
        // Mark the previous group's last row
        if (rowData.length > 0) {
          const lastRow = rowData[rowData.length - 1];
          if (lastRow.type === 'task') {
            lastRow.isLastInGroup = true;
          }
        }

        // Add header for new group
        rowData.push({
          type: 'header',
          group,
          label: groupConfig.getLabel(group),
          remainingMinutes: groupRemainingMinutes.get(group) ?? 0,
        });
        currentGroup = group;
        groupStartIndex = rowData.length;
      }

      // Determine if this is first in group
      const isFirstInGroup =
        rowData.length === groupStartIndex ||
        rowData[rowData.length - 1]?.type === 'header';

      rowData.push({
        type: 'task',
        task,
        rowIndex: index,
        isFirstInGroup,
        isLastInGroup: false, // Will be updated when next group starts or at end
        group,
      });
    });

    // Mark the final task as last in group
    if (rowData.length > 0) {
      const lastRow = rowData[rowData.length - 1];
      if (lastRow.type === 'task') {
        lastRow.isLastInGroup = true;
      }
    }

    return rowData;
  }, [filteredTasks, groupConfig]);

  // Extract sorted task IDs and task-to-group mapping from groupedRowData
  const { sortedTaskIds, taskGroupMap } = useMemo(() => {
    const ids: string[] = [];
    const groupMap = new Map<string, string>();

    for (const row of groupedRowData) {
      if (row.type === 'task') {
        ids.push(row.task.id);
        groupMap.set(row.task.id, row.group);
      }
    }

    return { sortedTaskIds: ids, taskGroupMap: groupMap };
  }, [groupedRowData]);

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
      columnHelper.accessor('assigneeId', {
        header: 'Assignee',
        cell: ({ row }) => (
          <AssigneeCell
            value={row.original.assigneeId}
            assignee={row.original.assignee}
            onChange={(userId) =>
              onUpdateTask(row.original.id, { assigneeId: userId })
            }
          />
        ),
        size: 140,
        sortingFn: (rowA, rowB) => {
          const a =
            rowA.original.assignee?.name || rowA.original.assignee?.email || '';
          const b =
            rowB.original.assignee?.name || rowB.original.assignee?.email || '';
          return a.localeCompare(b);
        },
      }),
      columnHelper.accessor('title', {
        header: 'Task',
        cell: ({ row, getValue }) => (
          <TitleCell
            value={getValue() as string}
            onClick={() => onSelectTask(row.original.id)}
          />
        ),
        size: 375,
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
        size: 100,
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

  // Get navigable task IDs based on current display order
  const navigableTaskIds = useMemo(() => {
    if (groupBy !== 'none') {
      return sortedTaskIds;
    }
    return visibleRows.map((row) => row.original.id);
  }, [groupBy, sortedTaskIds, visibleRows]);

  // Reset active row when visible tasks change
  useEffect(() => {
    setActiveRowIndex(null);
  }, [navigableTaskIds.length, groupBy]);

  // Notify parent when active task changes
  useEffect(() => {
    const activeTaskId =
      activeRowIndex !== null
        ? (navigableTaskIds[activeRowIndex] ?? null)
        : null;
    onActiveTaskChange?.(activeTaskId);
  }, [activeRowIndex, navigableTaskIds, onActiveTaskChange]);

  // Keyboard navigation - compute next active index for arrow keys
  const getNextActiveIndex = useCallback(
    (key: 'ArrowDown' | 'ArrowUp', current: number | null, count: number) => {
      if (key === 'ArrowDown') {
        if (current === null) return 0;
        return current >= count - 1 ? null : current + 1;
      }
      // ArrowUp
      if (current === null) return count - 1;
      return current <= 0 ? null : current - 1;
    },
    []
  );

  const handleMoveRow = useCallback(
    (direction: 'up' | 'down') => {
      if (activeRowIndex === null) return false;

      const taskCount = navigableTaskIds.length;
      const activeTaskId = navigableTaskIds[activeRowIndex];
      if (!activeTaskId) return false;

      const targetIndex =
        direction === 'down' ? activeRowIndex + 1 : activeRowIndex - 1;
      if (targetIndex < 0 || targetIndex >= taskCount) return false;

      const targetTaskId = navigableTaskIds[targetIndex];
      if (!targetTaskId) return false;

      // When grouping by date, handle cross-group moves
      if (groupBy === 'date') {
        const activeGroup = taskGroupMap.get(activeTaskId);
        const targetGroup = taskGroupMap.get(targetTaskId);

        if (activeGroup && targetGroup && activeGroup !== targetGroup) {
          const newDate = getDateForGroup(targetGroup as DateGroup);
          if (newDate !== undefined) {
            onUpdateTask(activeTaskId, { dueDate: newDate });
          } else {
            return false;
          }
        }
      }

      setSorting([]);
      onReorder(activeTaskId, targetTaskId);
      setActiveRowIndex(targetIndex);
      return true;
    },
    [
      activeRowIndex,
      navigableTaskIds,
      groupBy,
      taskGroupMap,
      onUpdateTask,
      onReorder,
    ]
  );

  const handleEnterKey = useCallback(
    (shiftKey: boolean) => {
      if (activeRowIndex === null) return;

      const taskId = navigableTaskIds[activeRowIndex];
      if (!taskId) return;

      if (shiftKey) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) setEditingTask(task);
      } else {
        onSelectTask(taskId);
      }
    },
    [activeRowIndex, navigableTaskIds, tasks, onSelectTask]
  );

  useEffect(() => {
    const shouldIgnoreKeyEvent = (target: HTMLElement) =>
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      target.closest('[role="dialog"]') ||
      target.closest('[role="listbox"]') ||
      target.closest('[role="menu"]');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreKeyEvent(e.target as HTMLElement)) return;

      const taskCount = navigableTaskIds.length;
      if (taskCount === 0) return;

      if (e.shiftKey && e.key === 'ArrowDown' && activeRowIndex !== null) {
        e.preventDefault();
        handleMoveRow('down');
      } else if (e.shiftKey && e.key === 'ArrowUp' && activeRowIndex !== null) {
        e.preventDefault();
        handleMoveRow('up');
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveRowIndex(getNextActiveIndex(e.key, activeRowIndex, taskCount));
      } else if (e.key === 'Enter' && activeRowIndex !== null) {
        e.preventDefault();
        handleEnterKey(e.shiftKey);
      } else if (e.key === 'Escape' && activeRowIndex !== null) {
        e.preventDefault();
        setActiveRowIndex(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeRowIndex,
    navigableTaskIds,
    getNextActiveIndex,
    handleMoveRow,
    handleEnterKey,
  ]);

  // Build assignee options from team members
  const assigneeOptions = useMemo(() => {
    const options = members.map((member) => ({
      value: member.userId,
      label: member.user.name || member.user.email,
    }));
    // Add "Unassigned" option with empty string as value
    return [{ value: '', label: 'Unassigned' }, ...options];
  }, [members]);

  // Map column IDs to filter config
  const filterConfig: Record<
    string,
    {
      type: 'multiselect' | 'text' | 'date' | 'title-enhanced';
      options?: { value: string; label: string }[];
      filterKey: keyof ColumnFilters;
    }
  > = useMemo(
    () => ({
      type: {
        type: 'multiselect',
        options: TASK_TYPE_OPTIONS,
        filterKey: 'type',
      },
      assigneeId: {
        type: 'multiselect',
        options: assigneeOptions,
        filterKey: 'assignee',
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
    }),
    [assigneeOptions]
  );

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

    const activeId = String(active.id);
    const overId = String(over.id);

    // When grouping is enabled, handle cross-group drops
    if (groupBy === 'date') {
      const activeGroup = taskGroupMap.get(activeId);
      const overGroup = taskGroupMap.get(overId);

      if (activeGroup && overGroup && activeGroup !== overGroup) {
        // Get the date for the target group
        const newDate = getDateForGroup(overGroup as DateGroup);

        if (newDate !== undefined) {
          // Update the task's dueDate to match the target group
          onUpdateTask(activeId, { dueDate: newDate });
        } else {
          // For past/future/no-date groups, reject the drop entirely
          // The task stays in its original position
          return;
        }
      }
    }

    // Clear any active sorting so manual ordering takes effect
    setSorting([]);

    // Pass IDs directly - the context will find correct indices in the full tasks array
    onReorder(activeId, overId);
  };

  const handleAddTask = (data: AddTaskData) => {
    onAddTask(data);
    setShowAddModal(false);
  };

  const handleEditTask = (data: EditTaskData) => {
    onUpdateTask(data.id, {
      type: data.type,
      title: data.title,
      status: data.status,
      importance: data.importance,
      estimate: data.estimate,
      dueDate: data.dueDate,
      assigneeId: data.assigneeId,
    });
    setEditingTask(null);
  };

  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <table ref={tableRef} className="w-full text-small table-fixed">
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
                        {/* Group icon for groupable columns */}
                        {onGroupByChange && (
                          <ColumnGroupButton
                            columnId={header.id}
                            groupBy={groupBy}
                            onGroupByChange={onGroupByChange}
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
            items={
              groupBy !== 'none'
                ? sortedTaskIds
                : visibleRows.map((row) => row.id)
            }
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {groupBy !== 'none'
                ? groupedRowData.map((rowData) => {
                    if (rowData.type === 'header') {
                      return (
                        <GroupHeaderRow
                          key={`header-${rowData.group}`}
                          label={rowData.label}
                          columnCount={columns.length}
                          remainingMinutes={rowData.remainingMinutes}
                        />
                      );
                    }

                    // Find the table row for this task
                    const tableRow = visibleRows.find(
                      (r) => r.original.id === rowData.task.id
                    );
                    if (!tableRow) return null;

                    // Find the index in navigableTaskIds to check if active
                    const navIndex = navigableTaskIds.indexOf(rowData.task.id);

                    return (
                      <SortableRow
                        key={tableRow.id}
                        row={tableRow}
                        onDelete={() => onDeleteTask(tableRow.original.id)}
                        isFirstInGroup={rowData.isFirstInGroup}
                        isLastInGroup={rowData.isLastInGroup}
                        isActive={activeRowIndex === navIndex}
                      />
                    );
                  })
                : visibleRows.map((row, index) => (
                    <SortableRow
                      key={row.id}
                      row={row}
                      onDelete={() => onDeleteTask(row.original.id)}
                      isActive={activeRowIndex === index}
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

      {editingTask && (
        <AddTaskModal
          onSubmit={handleAddTask}
          onClose={() => setEditingTask(null)}
          editTask={editingTask}
          onEditSubmit={handleEditTask}
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
