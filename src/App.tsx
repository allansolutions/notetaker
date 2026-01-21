import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTasks } from './hooks/useTasks';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { ThemeProvider } from './context/ThemeContext';
import { GoogleAuthProvider } from './context/GoogleAuthContext';
import { AuthProvider } from './context/AuthContext';
import { TasksProvider } from './context/TasksContext';
import { ViewType, TaskType, TASK_TYPE_OPTIONS, DateRange } from './types';
import {
  SpreadsheetView,
  SpreadsheetFilterState,
} from './components/views/SpreadsheetView';
import { AddTaskData } from './components/AddTaskModal';
import { TaskDetailView } from './components/views/TaskDetailView';
import { FullDayNotesView } from './components/views/FullDayNotesView';
import { ArchiveView } from './components/views/ArchiveView';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './components/LoginPage';
import { AuthGuard } from './components/AuthGuard';
import { MigrationPrompt } from './components/MigrationPrompt';
import { CommandPalette } from './components/CommandPalette';
import { TaskFinder } from './components/TaskFinder';
import {
  doesTaskMatchFilters,
  hasActiveFilters,
} from './utils/filter-matching';
import {
  formatDateCompact,
  formatDateRange,
  parseDateQuery,
  getUserLocale,
} from './utils/date-query';
import { getSingleDateFromFilter, startOfDay } from './utils/date-filters';

interface TaskNotesContext {
  originalFilters: SpreadsheetFilterState;
  pinnedTaskIds: string[];
}

const SIDEBAR_WIDTH_KEY = 'notetaker-sidebar-width';
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;

function createEmptyFilterState(): SpreadsheetFilterState {
  return {
    filters: {
      type: null,
      title: null,
      status: null,
      importance: null,
      dueDate: null,
    },
    dateFilterPreset: 'all',
    dateFilterDate: null,
    dateFilterRange: null,
  };
}

export function AppContent() {
  const {
    tasks,
    addTask,
    updateTaskById,
    removeTask,
    reorder,
    addSession,
    updateSession,
    deleteSession,
  } = useTasks();

  const { events: calendarEvents } = useCalendarEvents();

  const [currentView, setCurrentView] = useState<ViewType>('spreadsheet');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTaskFinderOpen, setIsTaskFinderOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [spreadsheetViewKey, setSpreadsheetViewKey] = useState(0);
  const [visibleTaskIds, setVisibleTaskIds] = useState<string[]>([]);

  // Task notes context - tracks filter state when navigating to task notes
  const [taskNotesContext, setTaskNotesContext] =
    useState<TaskNotesContext | null>(null);
  // Return filters - filters to apply when returning to spreadsheet from task notes
  const [returnFilters, setReturnFilters] =
    useState<SpreadsheetFilterState | null>(null);
  const [spreadsheetFilterState, setSpreadsheetFilterState] =
    useState<SpreadsheetFilterState>(createEmptyFilterState());

  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>(
    SIDEBAR_WIDTH_KEY,
    DEFAULT_SIDEBAR_WIDTH
  );
  const locale = useMemo(() => getUserLocale(), []);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, resizeRef.current.startWidth + delta)
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
      setIsResizing(true);
    },
    [sidebarWidth]
  );

  const handleSelectTask = useCallback((id: string) => {
    setSelectedTaskId(id);
    setCurrentView('task-detail');
  }, []);

  const handleBackToSpreadsheet = useCallback(() => {
    setCurrentView('spreadsheet');
    setSelectedTaskId(null);
    // Restore filters when going back to spreadsheet
    // If returnFilters is already set (from creating out-of-filter task), use those
    // Otherwise restore the original filters from task notes context
    if (!returnFilters && taskNotesContext) {
      setReturnFilters(taskNotesContext.originalFilters);
    }
    // Clear task notes context when going back
    setTaskNotesContext(null);
  }, [returnFilters, taskNotesContext]);

  useEffect(() => {
    if (currentView !== 'spreadsheet' && isAddTaskModalOpen) {
      setIsAddTaskModalOpen(false);
    }
  }, [currentView, isAddTaskModalOpen]);

  const handleNavigateToFullDayNotes = useCallback(
    (filterState: SpreadsheetFilterState, visibleTaskIds: string[]) => {
      // Store context for filtering tasks in notes view
      setTaskNotesContext({
        originalFilters: filterState,
        pinnedTaskIds: visibleTaskIds,
      });
      setCurrentView('full-day-notes');
    },
    []
  );

  const handleNavigateToArchive = useCallback(() => {
    setCurrentView('archive');
  }, []);

  // Split tasks into active and archived
  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'done'),
    [tasks]
  );
  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === 'done'),
    [tasks]
  );

  const handleCommandNavigateToTaskNotes = useCallback(() => {
    if (currentView === 'full-day-notes') return;
    const fallbackVisibleTaskIds = activeTasks
      .filter((task) => doesTaskMatchFilters(task, spreadsheetFilterState))
      .map((task) => task.id);
    const nextVisibleTaskIds =
      visibleTaskIds.length > 0 ? visibleTaskIds : fallbackVisibleTaskIds;
    handleNavigateToFullDayNotes(spreadsheetFilterState, nextVisibleTaskIds);
  }, [
    activeTasks,
    currentView,
    handleNavigateToFullDayNotes,
    spreadsheetFilterState,
    visibleTaskIds,
  ]);

  const handleCommandNewTask = useCallback(() => {
    if (currentView !== 'spreadsheet') {
      handleBackToSpreadsheet();
    }
    setIsAddTaskModalOpen(true);
  }, [currentView, handleBackToSpreadsheet]);

  // Apply a new filter state - updates all related state in one place
  const applyFilterState = useCallback(
    (nextFilterState: SpreadsheetFilterState) => {
      setSpreadsheetFilterState(nextFilterState);
      setTaskNotesContext((prev) => {
        if (!prev) return prev;
        return { ...prev, originalFilters: nextFilterState };
      });
      if (currentView === 'spreadsheet') {
        setReturnFilters(nextFilterState);
        setSpreadsheetViewKey((prev) => prev + 1);
      }
    },
    [currentView]
  );

  const handleCommandSetPreset = useCallback(
    (preset: SpreadsheetFilterState['dateFilterPreset']) => {
      // Convert relative presets to specific dates (anchored date filters)
      if (
        preset === 'today' ||
        preset === 'tomorrow' ||
        preset === 'yesterday'
      ) {
        const now = new Date();
        let targetDate = startOfDay(now);
        if (preset === 'tomorrow') {
          targetDate = new Date(targetDate);
          targetDate.setDate(targetDate.getDate() + 1);
        } else if (preset === 'yesterday') {
          targetDate = new Date(targetDate);
          targetDate.setDate(targetDate.getDate() - 1);
        }
        applyFilterState({
          ...spreadsheetFilterState,
          dateFilterPreset: 'specific-date',
          dateFilterDate: targetDate.getTime(),
          dateFilterRange: null,
        });
        return;
      }
      // For non-relative presets (all, this-week, etc.)
      if (spreadsheetFilterState.dateFilterPreset === preset) {
        return;
      }
      applyFilterState({
        ...spreadsheetFilterState,
        dateFilterPreset: preset,
        dateFilterDate: null,
        dateFilterRange: null,
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleCommandSetSpecificDate = useCallback(
    (date: number) => {
      applyFilterState({
        ...spreadsheetFilterState,
        dateFilterPreset: 'specific-date',
        dateFilterDate: date,
        dateFilterRange: null,
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleCommandSetDateRange = useCallback(
    (range: DateRange) => {
      applyFilterState({
        ...spreadsheetFilterState,
        dateFilterPreset: 'date-range',
        dateFilterDate: null,
        dateFilterRange: range,
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const getDateFilterCommand = useCallback(
    (query: string) => {
      const parsed = parseDateQuery(query, locale);

      if (parsed.type === 'invalid-range') {
        return [
          {
            id: 'date-range-invalid',
            label: 'End date must be after start date',
            disabled: true,
            onExecute: () => {},
          },
        ];
      }

      if (parsed.type === 'single') {
        const label = `Filter: Date - ${formatDateCompact(
          new Date(parsed.date),
          locale
        )}`;
        return [
          {
            id: `date-single-${parsed.date}`,
            label,
            keywords: ['date', 'filter'],
            onExecute: () => handleCommandSetSpecificDate(parsed.date),
          },
        ];
      }

      if (parsed.type === 'range') {
        const label = `Filter: Date Range - ${formatDateRange(
          parsed.range,
          locale
        )}`;
        return [
          {
            id: `date-range-${parsed.range.start}-${parsed.range.end}`,
            label,
            keywords: ['date', 'range', 'filter'],
            onExecute: () => handleCommandSetDateRange(parsed.range),
          },
        ];
      }

      return [];
    },
    [handleCommandSetDateRange, handleCommandSetSpecificDate, locale]
  );

  const handleCommandSetTypeFilter = useCallback(
    (type: TaskType) => {
      const currentTypeFilter = spreadsheetFilterState.filters.type;
      if (
        currentTypeFilter?.type === 'multiselect' &&
        currentTypeFilter.selected.size === 1 &&
        currentTypeFilter.selected.has(type)
      ) {
        return;
      }
      applyFilterState({
        ...spreadsheetFilterState,
        filters: {
          ...spreadsheetFilterState.filters,
          type: { type: 'multiselect', selected: new Set([type]) },
        },
      });
    },
    [applyFilterState, spreadsheetFilterState]
  );

  const handleCommandClearFilters = useCallback(() => {
    const emptyFilters = createEmptyFilterState();
    const isAlreadyEmpty =
      spreadsheetFilterState.dateFilterPreset === 'all' &&
      !spreadsheetFilterState.dateFilterDate &&
      !spreadsheetFilterState.dateFilterRange &&
      Object.values(spreadsheetFilterState.filters).every((filter) => {
        if (!filter) return true;
        if (filter.type === 'multiselect') return filter.selected.size === 0;
        if (filter.type === 'text') return filter.value.trim() === '';
        if (filter.type === 'date') return filter.value === null;
        if (filter.type === 'title-enhanced') {
          return (
            filter.searchText.trim() === '' && filter.selectedTaskIds === null
          );
        }
        return true;
      });

    if (isAlreadyEmpty) return;

    applyFilterState(emptyFilters);
  }, [applyFilterState, spreadsheetFilterState]);

  const commandPaletteCommands = useMemo(
    () => [
      {
        id: 'view-all',
        label: 'Filter: All',
        keywords: ['view', 'tasks', 'all', 'filter'],
        onExecute: () => handleCommandSetPreset('all'),
      },
      {
        id: 'filter-clear',
        label: 'Filter: Clear',
        keywords: ['clear', 'filters', 'reset'],
        onExecute: handleCommandClearFilters,
      },
      {
        id: 'view-today',
        label: 'Filter: Today',
        keywords: ['view', 'tasks', 'today', 'filter'],
        onExecute: () => handleCommandSetPreset('today'),
      },
      {
        id: 'view-tomorrow',
        label: 'Filter: Tomorrow',
        keywords: ['view', 'tasks', 'tomorrow', 'filter'],
        onExecute: () => handleCommandSetPreset('tomorrow'),
      },
      {
        id: 'view-yesterday',
        label: 'Filter: Yesterday',
        keywords: ['view', 'tasks', 'yesterday', 'filter'],
        onExecute: () => handleCommandSetPreset('yesterday'),
      },
      {
        id: 'view-this-week',
        label: 'Filter: This Week',
        keywords: ['view', 'tasks', 'week', 'filter'],
        onExecute: () => handleCommandSetPreset('this-week'),
      },
      {
        id: 'view-task-notes',
        label: 'Task: Notes',
        keywords: ['notes', 'full day', 'view'],
        onExecute: handleCommandNavigateToTaskNotes,
      },
      {
        id: 'task-new',
        label: 'Task: New',
        keywords: ['new', 'create', 'add', 'task'],
        onExecute: handleCommandNewTask,
      },
      {
        id: 'view-task-list',
        label: 'Task: List',
        keywords: ['list', 'tasks', 'view', 'spreadsheet'],
        onExecute: () => {
          if (currentView !== 'spreadsheet') {
            setCurrentView('spreadsheet');
          }
        },
      },
      ...TASK_TYPE_OPTIONS.map((option) => ({
        id: `task-type-${option.value}`,
        label: `Type: ${option.label}`,
        keywords: ['task', 'type', option.label.toLowerCase()],
        onExecute: () => handleCommandSetTypeFilter(option.value),
      })),
    ],
    [
      currentView,
      handleCommandSetPreset,
      handleCommandClearFilters,
      handleCommandNavigateToTaskNotes,
      handleCommandNewTask,
      handleCommandSetTypeFilter,
    ]
  );

  const handleAddTask = useCallback(
    async (data: AddTaskData) => {
      // Use the date from filter if a single-date filter is active and no dueDate specified
      const dueDate =
        data.dueDate ?? getSingleDateFromFilter(spreadsheetFilterState);
      await addTask(
        data.title,
        data.type,
        data.status,
        data.importance,
        data.estimate,
        dueDate
      );
    },
    [addTask, spreadsheetFilterState]
  );

  const handleInlineTaskCreate = useCallback(
    async (
      title: string,
      type: TaskType,
      insertAfterTaskId?: string | null
    ) => {
      // Find the index to insert at
      let insertAtIndex: number | undefined;
      if (insertAfterTaskId) {
        const afterIndex = tasks.findIndex((t) => t.id === insertAfterTaskId);
        if (afterIndex !== -1) {
          insertAtIndex = afterIndex + 1;
        }
      }
      // Use the date from filter if a single-date filter is active
      const dueDate = getSingleDateFromFilter(spreadsheetFilterState);
      const newTask = await addTask(
        title,
        type,
        'todo',
        undefined,
        undefined,
        dueDate,
        insertAtIndex
      );

      // If we're in task notes with active filters, check if the new task matches
      if (newTask && taskNotesContext) {
        const hasFilters = hasActiveFilters(taskNotesContext.originalFilters);
        const matchesFilters = hasFilters
          ? doesTaskMatchFilters(newTask, taskNotesContext.originalFilters)
          : true;

        // Always pin the new task so it shows immediately in notes view.
        setTaskNotesContext((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pinnedTaskIds: [...prev.pinnedTaskIds, newTask.id],
          };
        });

        if (hasFilters && !matchesFilters) {
          // Task doesn't match original filters - set up return filters
          // Clear all filters except title, set title to show pinned tasks + new task
          setReturnFilters({
            filters: {
              type: null,
              title: {
                type: 'title-enhanced',
                searchText: '',
                selectedTaskIds: new Set([
                  ...(taskNotesContext?.pinnedTaskIds ?? []),
                  newTask.id,
                ]),
              },
              status: null,
              importance: null,
              dueDate: null,
            },
            dateFilterPreset: 'all',
            dateFilterDate: null,
            dateFilterRange: null,
          });
        }
      }

      return newTask;
    },
    [addTask, tasks, taskNotesContext, spreadsheetFilterState]
  );

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

  // Filter tasks for task notes view based on pinned task IDs
  const filteredTasksForNotes = useMemo(() => {
    const baseTasks =
      taskNotesContext && taskNotesContext.pinnedTaskIds.length > 0
        ? tasks.filter((t) => taskNotesContext.pinnedTaskIds.includes(t.id))
        : tasks;
    return baseTasks.filter((task) =>
      doesTaskMatchFilters(task, spreadsheetFilterState)
    );
  }, [tasks, taskNotesContext, spreadsheetFilterState]);

  // Handle clearing return filters after they've been applied
  const handleClearReturnFilters = useCallback(() => {
    setReturnFilters(null);
  }, []);

  // Handle visible tasks change - memoized to prevent infinite re-renders
  const handleVisibleTasksChange = useCallback((tasks: { id: string }[]) => {
    setVisibleTaskIds(tasks.map((task) => task.id));
  }, []);

  const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMetaK = event.metaKey && event.key.toLowerCase() === 'k';
      if (!isMetaK) return;
      event.preventDefault();
      setIsCommandPaletteOpen((open) => {
        const next = !open;
        if (next) {
          setIsTaskFinderOpen(false);
        }
        return next;
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMetaP = event.metaKey && event.key.toLowerCase() === 'p';
      if (!isMetaP) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setIsTaskFinderOpen((open) => {
        const next = !open;
        if (next) {
          setIsCommandPaletteOpen(false);
        }
        return next;
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'task-detail':
        if (!selectedTask) {
          setCurrentView('spreadsheet');
          return null;
        }
        return (
          <TaskDetailView
            task={selectedTask}
            onUpdateTask={updateTaskById}
            onAddSession={addSession}
            onUpdateSession={updateSession}
            onDeleteSession={deleteSession}
            onBack={handleBackToSpreadsheet}
          />
        );
      case 'full-day-notes':
        return (
          <FullDayNotesView
            tasks={filteredTasksForNotes}
            onSelectTask={handleSelectTask}
            onBack={handleBackToSpreadsheet}
            onUpdateTask={updateTaskById}
            onAddTask={handleInlineTaskCreate}
            onAddSession={addSession}
            dateFilterPreset={
              taskNotesContext?.originalFilters.dateFilterPreset
            }
            dateFilterDate={taskNotesContext?.originalFilters.dateFilterDate}
            dateFilterRange={taskNotesContext?.originalFilters.dateFilterRange}
          />
        );
      case 'archive':
        return (
          <ArchiveView
            tasks={doneTasks}
            onUpdateTask={updateTaskById}
            onDeleteTask={removeTask}
            onReorder={reorder}
            onSelectTask={handleSelectTask}
            onBack={handleBackToSpreadsheet}
          />
        );
      case 'spreadsheet':
      default: {
        // Clear return filters after rendering with them
        const initialFilters = returnFilters ?? undefined;
        if (returnFilters) {
          // Use setTimeout to clear after render
          setTimeout(handleClearReturnFilters, 0);
        }
        return (
          <SpreadsheetView
            key={spreadsheetViewKey}
            tasks={activeTasks}
            onUpdateTask={updateTaskById}
            onDeleteTask={removeTask}
            onReorder={reorder}
            onSelectTask={handleSelectTask}
            onAddTask={handleAddTask}
            isAddTaskModalOpen={isAddTaskModalOpen}
            onAddTaskModalOpenChange={setIsAddTaskModalOpen}
            onNavigateToFullDayNotes={handleNavigateToFullDayNotes}
            onNavigateToArchive={handleNavigateToArchive}
            initialFilters={initialFilters}
            onFilterStateChange={setSpreadsheetFilterState}
            onVisibleTasksChange={handleVisibleTasksChange}
          />
        );
      }
    }
  };

  return (
    <div
      className={`flex min-h-screen ${isResizing ? 'select-none cursor-col-resize' : ''}`}
    >
      <div className="flex-1 max-w-[var(--width-content)] mx-auto py-20 px-24">
        {renderView()}
      </div>
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        commands={commandPaletteCommands}
        getDynamicCommands={getDateFilterCommand}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
      <TaskFinder
        isOpen={isTaskFinderOpen}
        tasks={tasks}
        onClose={() => setIsTaskFinderOpen(false)}
        onSelectTask={handleSelectTask}
      />
      <div
        data-testid="sidebar"
        className="shrink-0 bg-surface-alt sticky top-0 h-screen overflow-y-auto flex"
        style={{ width: sidebarWidth }}
      >
        {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Interactive separator (splitter) pattern */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          tabIndex={0}
          data-testid="sidebar-resize-handle"
          onMouseDown={handleResizeStart}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setSidebarWidth((w) => Math.min(MAX_SIDEBAR_WIDTH, w + 10));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setSidebarWidth((w) => Math.max(MIN_SIDEBAR_WIDTH, w - 10));
            }
          }}
          className="w-1 shrink-0 cursor-col-resize border-l border-border hover:bg-accent-subtle active:bg-accent-subtle transition-colors focus:bg-accent-subtle focus:outline-none"
        />
        {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="flex-1 overflow-y-auto">
          <Sidebar
            tasks={activeTasks}
            calendarEvents={calendarEvents}
            onUpdateTask={updateTaskById}
          />
        </div>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  return (
    <ThemeProvider>
      <GoogleAuthProvider>
        <TasksProvider>
          <MigrationPrompt />
          <AppContent />
        </TasksProvider>
      </GoogleAuthProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGuard fallback={<LoginPage />}>
        <AuthenticatedApp />
      </AuthGuard>
    </AuthProvider>
  );
}

export default App;
