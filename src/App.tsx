import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTasks } from './hooks/useTasks';
import { ThemeProvider } from './context/ThemeContext';
import { ViewType } from './types';
import { SpreadsheetView } from './components/views/SpreadsheetView';
import { TaskDetailView } from './components/views/TaskDetailView';
import { FullDayNotesView } from './components/views/FullDayNotesView';
import { Sidebar } from './components/Sidebar';
import './styles/main.css';

const SIDEBAR_WIDTH_KEY = 'notetaker-sidebar-width';
const DEFAULT_SIDEBAR_WIDTH = 240;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;

function App() {
  const { tasks, addTask, updateTaskById, removeTask, reorder } = useTasks();

  const [currentView, setCurrentView] = useState<ViewType>('spreadsheet');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
  }, []);

  const handleNavigateToFullDayNotes = useCallback(() => {
    setCurrentView('full-day-notes');
  }, []);

  const handleAddTask = useCallback(
    (title: string) => {
      const newTask = addTask(title);
      setSelectedTaskId(newTask.id);
      setCurrentView('task-detail');
    },
    [addTask]
  );

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

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
            onBack={handleBackToSpreadsheet}
          />
        );
      case 'full-day-notes':
        return (
          <FullDayNotesView
            tasks={tasks}
            onSelectTask={handleSelectTask}
            onBack={handleBackToSpreadsheet}
          />
        );
      case 'spreadsheet':
      default:
        return (
          <SpreadsheetView
            tasks={tasks}
            onUpdateTask={updateTaskById}
            onDeleteTask={removeTask}
            onReorder={reorder}
            onSelectTask={handleSelectTask}
            onAddTask={handleAddTask}
            onNavigateToFullDayNotes={handleNavigateToFullDayNotes}
          />
        );
    }
  };

  return (
    <ThemeProvider>
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
            <Sidebar tasks={tasks} onUpdateTask={updateTaskById} />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
