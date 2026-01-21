import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTasks } from './hooks/useTasks';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { ThemeProvider } from './context/ThemeContext';
import { GoogleAuthProvider } from './context/GoogleAuthContext';
import { AuthProvider } from './context/AuthContext';
import { TasksProvider } from './context/TasksContext';
import { ViewType, TaskType } from './types';
import {
  SpreadsheetView,
  SpreadsheetFilterState,
} from './components/views/SpreadsheetView';
import { AddTaskData } from './components/AddTaskModal';
import { TaskDetailView } from './components/views/TaskDetailView';
import { FullDayNotesView } from './components/views/FullDayNotesView';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './components/LoginPage';
import { AuthGuard } from './components/AuthGuard';
import { MigrationPrompt } from './components/MigrationPrompt';
import {
  doesTaskMatchFilters,
  hasActiveFilters,
} from './utils/filter-matching';
import './styles/main.css';

interface TaskNotesContext {
  originalFilters: SpreadsheetFilterState;
  pinnedTaskIds: string[];
}

const SIDEBAR_WIDTH_KEY = 'notetaker-sidebar-width';
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;

function AppContent() {
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

  // Task notes context - tracks filter state when navigating to task notes
  const [taskNotesContext, setTaskNotesContext] =
    useState<TaskNotesContext | null>(null);
  // Return filters - filters to apply when returning to spreadsheet from task notes
  const [returnFilters, setReturnFilters] =
    useState<SpreadsheetFilterState | null>(null);

  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>(
    SIDEBAR_WIDTH_KEY,
    DEFAULT_SIDEBAR_WIDTH
  );
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

  const handleAddTask = useCallback(
    async (data: AddTaskData) => {
      await addTask(
        data.title,
        data.type,
        data.status,
        data.importance,
        data.estimate,
        data.dueDate
      );
    },
    [addTask]
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
      const newTask = await addTask(
        title,
        type,
        'todo',
        undefined,
        undefined,
        undefined,
        insertAtIndex
      );

      // If we're in task notes with active filters, check if the new task matches
      if (
        newTask &&
        taskNotesContext &&
        hasActiveFilters(taskNotesContext.originalFilters)
      ) {
        const matchesFilters = doesTaskMatchFilters(
          newTask,
          taskNotesContext.originalFilters
        );

        // Add new task to pinned tasks so it shows in notes view
        setTaskNotesContext((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pinnedTaskIds: [...prev.pinnedTaskIds, newTask.id],
          };
        });

        if (!matchesFilters) {
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
          });
        }
      }

      return newTask;
    },
    [addTask, tasks, taskNotesContext]
  );

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

  // Filter tasks for task notes view based on pinned task IDs
  const filteredTasksForNotes = useMemo(() => {
    if (!taskNotesContext || taskNotesContext.pinnedTaskIds.length === 0) {
      // No filters active - show all tasks
      return tasks;
    }
    const pinnedSet = new Set(taskNotesContext.pinnedTaskIds);
    return tasks.filter((t) => pinnedSet.has(t.id));
  }, [tasks, taskNotesContext]);

  // Handle clearing return filters after they've been applied
  const handleClearReturnFilters = useCallback(() => {
    setReturnFilters(null);
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
            tasks={tasks}
            onUpdateTask={updateTaskById}
            onDeleteTask={removeTask}
            onReorder={reorder}
            onSelectTask={handleSelectTask}
            onAddTask={handleAddTask}
            onNavigateToFullDayNotes={handleNavigateToFullDayNotes}
            initialFilters={initialFilters}
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
            tasks={tasks}
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
