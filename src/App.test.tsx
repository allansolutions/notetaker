import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import type { Task } from './types';
import type { SpreadsheetFilterState } from './components/views/SpreadsheetView';
import { AppContent } from './App';
import type { WikiPage } from './modules/wiki';
import type { Contact } from './modules/crm';

let mockTasks: Task[] = [];
let mockWikiPages: WikiPage[] = [];
let mockContacts: Contact[] = [];
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

vi.mock('./modules/wiki', () => ({
  WikiProvider: ({ children }: { children: React.ReactNode }) => children,
  WikiListView: () => <div data-testid="wiki-list-view" />,
  WikiPageView: () => <div data-testid="wiki-page-view" />,
  useWiki: () => ({
    pages: mockWikiPages,
    tree: [],
    isLoading: false,
    error: null,
    addPage: vi.fn(),
    updatePage: vi.fn(),
    removePage: vi.fn(),
    getPage: vi.fn(),
    getPageBySlug: vi.fn(),
    getAncestors: vi.fn(),
    movePage: vi.fn(),
    refreshPages: vi.fn(),
  }),
}));

vi.mock('./modules/crm', () => ({
  CrmProvider: ({ children }: { children: React.ReactNode }) => children,
  ContactListView: () => <div data-testid="crm-list-view" />,
  ContactDetailView: () => <div data-testid="crm-detail-view" />,
  useCrm: () => ({
    contacts: mockContacts,
    companies: [],
    isLoading: false,
    error: null,
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
    getContact: vi.fn(),
    refreshContacts: vi.fn(),
    refreshCompanies: vi.fn(),
  }),
}));

vi.mock('./modules/teams/context/TeamContext', () => ({
  TeamProvider: ({ children }: { children: React.ReactNode }) => children,
  useTeam: () => ({
    teams: [],
    activeTeam: null,
    members: [],
    userRole: null,
    isLoading: false,
    error: null,
    setActiveTeam: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
    inviteMember: vi.fn(),
    removeMember: vi.fn(),
    refreshTeams: vi.fn(),
    refreshMembers: vi.fn(),
  }),
}));

vi.mock('./modules/teams/components/TeamSwitcher', () => ({
  TeamSwitcher: () => <div data-testid="team-switcher" />,
}));

type SpreadsheetViewMockProps = {
  tasks: Task[];
  onNavigateToFullDayDetails: (
    filterState: SpreadsheetFilterState,
    visibleTaskIds: string[]
  ) => void;
};

type FullDayDetailsViewMockProps = {
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
      onNavigateToFullDayDetails,
    }: SpreadsheetViewMockProps) => {
      React.useEffect(() => {
        onNavigateToFullDayDetails(
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
      }, [onNavigateToFullDayDetails, tasks]);
      return <div data-testid="spreadsheet-view" />;
    },
  };
});

vi.mock('./components/views/FullDayDetailsView', () => ({
  FullDayDetailsView: ({ tasks, onAddTask }: FullDayDetailsViewMockProps) => (
    <div>
      <div data-testid="details-count">{tasks.length}</div>
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

describe('AppContent task details inline creation', () => {
  beforeEach(() => {
    mockTasks = [createMockTask()];
    mockWikiPages = [];
    mockContacts = [];
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

    await screen.findByTestId('details-count');
    expect(screen.getByTestId('details-count')).toHaveTextContent('1');

    fireEvent.click(
      screen.getByRole('button', { name: /create inline task/i })
    );

    await waitFor(() => {
      expect(screen.getByTestId('details-count')).toHaveTextContent('2');
    });
    expect(screen.getByText('New Task')).toBeInTheDocument();
  });
});

describe('AppContent command palette search', () => {
  beforeEach(() => {
    mockTasks = [
      createMockTask({ id: 'task-new', title: 'New Task', updatedAt: 10 }),
    ];
    mockWikiPages = [
      {
        id: 'page-new',
        title: 'New Page',
        slug: 'new-page',
        parentId: null,
        blocks: [
          { id: 'block-1', type: 'paragraph', content: 'New Page content' },
        ],
        order: 0,
        icon: null,
        type: null,
        category: null,
        createdAt: 1,
        updatedAt: 10,
      },
    ];
    mockContacts = [
      {
        id: 'contact-new',
        firstName: 'New',
        lastName: 'Person',
        email: 'new@example.com',
        createdAt: 1,
        updatedAt: 10,
      },
    ];
  });

  it('prioritizes commands before task, page, or contact matches', async () => {
    render(<AppContent />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    const input = await screen.findByPlaceholderText(
      'Search commands, tasks, pages, contacts...'
    );

    fireEvent.change(input, { target: { value: 'new' } });

    const options = await screen.findAllByRole('option');
    expect(options[0]?.textContent).toContain('Task: New');
  });

  it('shows recent task, page, and contact results with empty query', async () => {
    render(<AppContent />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    const listbox = await screen.findByRole('listbox', { name: 'Results' });
    const palette = within(listbox);

    expect(
      await palette.findByText('New Task', { exact: false })
    ).toBeInTheDocument();
    const pageMatches = await palette.findAllByText('New Page', {
      exact: false,
    });
    expect(pageMatches.length).toBeGreaterThan(0);
    expect(
      await palette.findByText('New Person', { exact: false })
    ).toBeInTheDocument();
  });
});
