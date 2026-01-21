import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Task } from './types';
import type { SpreadsheetFilterState } from './components/views/SpreadsheetView';
import { AppContent } from './App';

let mockTasks: Task[] = [];
const addTask = vi.fn();
const updateTaskById = vi.fn();
const removeTask = vi.fn();
const reorder = vi.fn();
const addSession = vi.fn();
const updateSession = vi.fn();
const deleteSession = vi.fn();

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  type: 'admin',
  title: 'Initial Task',
  status: 'todo',
  importance: 'mid',
  blocks: [],
  scheduled: false,
  startTime: 0,
  duration: 60,
  estimate: undefined,
  sessions: [],
  dueDate: undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

vi.mock('./hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: mockTasks,
    addTask,
    updateTaskById,
    removeTask,
    reorder,
    addSession,
    updateSession,
    deleteSession,
  }),
}));

vi.mock('./hooks/useCalendarEvents', () => ({
  useCalendarEvents: () => ({ events: [] }),
}));

vi.mock('./components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

type SpreadsheetViewMockProps = {
  tasks: Task[];
  onNavigateToFullDayNotes: (
    filterState: SpreadsheetFilterState,
    visibleTaskIds: string[]
  ) => void;
};

type FullDayNotesViewMockProps = {
  tasks: Task[];
  onAddTask?: (
    title: string,
    type: Task['type'],
    insertAfterTaskId?: string | null
  ) => void | Promise<unknown>;
};

vi.mock('./components/views/SpreadsheetView', async () => {
  const React = await import('react');
  return {
    SpreadsheetView: ({
      tasks,
      onNavigateToFullDayNotes,
    }: SpreadsheetViewMockProps) => {
      React.useEffect(() => {
        onNavigateToFullDayNotes(
          {
            filters: {
              type: null,
              title: null,
              status: null,
              importance: null,
              dueDate: null,
            },
            dateFilterPreset: 'all',
          },
          tasks.map((task: Task) => task.id)
        );
      }, [onNavigateToFullDayNotes, tasks]);
      return <div data-testid="spreadsheet-view" />;
    },
  };
});

vi.mock('./components/views/FullDayNotesView', () => ({
  FullDayNotesView: ({ tasks, onAddTask }: FullDayNotesViewMockProps) => (
    <div>
      <div data-testid="notes-count">{tasks.length}</div>
      <button
        type="button"
        onClick={() =>
          onAddTask?.('New Task', 'personal', tasks[tasks.length - 1]?.id)
        }
      >
        Create Inline Task
      </button>
      <ul>
        {tasks.map((task: Task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  ),
}));

describe('AppContent task notes inline creation', () => {
  beforeEach(() => {
    mockTasks = [createMockTask()];
    addTask.mockReset();
    addTask.mockImplementation(async (title: string, type: Task['type']) => {
      const newTask = createMockTask({
        id: `task-${mockTasks.length + 1}`,
        title,
        type,
      });
      mockTasks = [...mockTasks, newTask];
      return newTask;
    });
  });

  it('shows newly created inline task immediately with no filters', async () => {
    render(<AppContent />);

    await screen.findByTestId('notes-count');
    expect(screen.getByTestId('notes-count')).toHaveTextContent('1');

    fireEvent.click(
      screen.getByRole('button', { name: /create inline task/i })
    );

    await waitFor(() => {
      expect(screen.getByTestId('notes-count')).toHaveTextContent('2');
    });
    expect(screen.getByText('New Task')).toBeInTheDocument();
  });
});
