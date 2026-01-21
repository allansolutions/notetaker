import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpreadsheetView } from './SpreadsheetView';
import { TaskDetailView } from './TaskDetailView';
import { FullDayNotesView } from './FullDayNotesView';
import { ArchiveView } from './ArchiveView';
import { Task, Block, TASK_TYPE_COLORS, TaskType } from '../../types';

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Date.now()}-${Math.random()}`,
  type: 'admin',
  title: 'Test Task',
  status: 'todo',
  importance: 'mid',
  blocks: [],
  startTime: 360,
  duration: 60,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('SpreadsheetView', () => {
  const defaultProps = {
    tasks: [] as Task[],
    onUpdateTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onReorder: vi.fn(),
    onSelectTask: vi.fn(),
    onAddTask: vi.fn(),
    onNavigateToFullDayNotes: vi.fn(),
    onNavigateToArchive: vi.fn(),
  };

  it('renders DateFilterTabs with All selected by default', () => {
    render(<SpreadsheetView {...defaultProps} />);
    const allTab = screen.getByRole('tab', { name: /all/i });
    expect(allTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders all filter tabs', () => {
    render(<SpreadsheetView {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tomorrow/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /this week/i })).toBeInTheDocument();
  });

  it('renders Task Notes button', () => {
    render(<SpreadsheetView {...defaultProps} />);
    expect(screen.getByText('Task Notes')).toBeInTheDocument();
  });

  it('renders Archive button', () => {
    render(<SpreadsheetView {...defaultProps} />);
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('calls onNavigateToArchive when Archive button is clicked', () => {
    const onNavigateToArchive = vi.fn();
    render(
      <SpreadsheetView
        {...defaultProps}
        onNavigateToArchive={onNavigateToArchive}
      />
    );

    fireEvent.click(screen.getByText('Archive'));
    expect(onNavigateToArchive).toHaveBeenCalled();
  });

  it('calls onNavigateToFullDayNotes with filter state when button is clicked', () => {
    const onNavigateToFullDayNotes = vi.fn();
    render(
      <SpreadsheetView
        {...defaultProps}
        onNavigateToFullDayNotes={onNavigateToFullDayNotes}
      />
    );

    fireEvent.click(screen.getByText('Task Notes'));
    expect(onNavigateToFullDayNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.any(Object),
        dateFilterPreset: 'all',
      }),
      expect.any(Array)
    );
  });

  it('applies initial filters when provided', () => {
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Admin Task', type: 'admin' }),
      createMockTask({
        id: 'task-2',
        title: 'Personal Task',
        type: 'personal',
      }),
    ];
    const initialFilters = {
      filters: {
        type: { type: 'multiselect' as const, selected: new Set(['admin']) },
        title: null,
        status: null,
        importance: null,
        dueDate: null,
      },
      dateFilterPreset: 'all' as const,
    };

    render(
      <SpreadsheetView
        {...defaultProps}
        tasks={tasks}
        initialFilters={initialFilters}
      />
    );

    // Only admin task should be visible
    expect(screen.getByText('Admin Task')).toBeInTheDocument();
    expect(screen.queryByText('Personal Task')).not.toBeInTheDocument();
  });

  it('renders TaskTable with tasks', () => {
    const tasks = [createMockTask({ title: 'My Task' })];
    render(<SpreadsheetView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('My Task')).toBeInTheDocument();
  });

  describe('date filter tab interactions', () => {
    const fixedNow = new Date(2024, 5, 19, 14, 0); // Wednesday, June 19, 2024

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows task counts for each filter tab', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today Task',
          dueDate: fixedNow.getTime(),
        }),
        createMockTask({
          id: 'task-2',
          title: 'Tomorrow Task',
          dueDate: fixedNow.getTime() + 86400000,
        }),
        createMockTask({
          id: 'task-3',
          title: 'No Date Task',
          dueDate: undefined,
        }),
      ];

      render(<SpreadsheetView {...defaultProps} tasks={tasks} />);

      // All tab should show (3)
      const allTab = screen.getByRole('tab', { name: /all/i });
      expect(allTab).toHaveTextContent('(3)');
      // Today tab should show (1)
      const todayTab = screen.getByRole('tab', { name: /today/i });
      expect(todayTab).toHaveTextContent('(1)');
      // Tomorrow tab should show (1)
      const tomorrowTab = screen.getByRole('tab', { name: /tomorrow/i });
      expect(tomorrowTab).toHaveTextContent('(1)');
    });

    it('filters tasks when clicking Today tab', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today Task',
          dueDate: fixedNow.getTime(),
        }),
        createMockTask({
          id: 'task-2',
          title: 'Tomorrow Task',
          dueDate: fixedNow.getTime() + 86400000,
        }),
      ];

      render(<SpreadsheetView {...defaultProps} tasks={tasks} />);

      // Click Today tab
      fireEvent.click(screen.getByRole('tab', { name: /today/i }));

      // Should only show today's task
      expect(screen.getByText('Today Task')).toBeInTheDocument();
      expect(screen.queryByText('Tomorrow Task')).not.toBeInTheDocument();
    });

    it('filters tasks when clicking Tomorrow tab', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today Task',
          dueDate: fixedNow.getTime(),
        }),
        createMockTask({
          id: 'task-2',
          title: 'Tomorrow Task',
          dueDate: fixedNow.getTime() + 86400000,
        }),
      ];

      render(<SpreadsheetView {...defaultProps} tasks={tasks} />);

      // Click Tomorrow tab
      fireEvent.click(screen.getByRole('tab', { name: /tomorrow/i }));

      // Should only show tomorrow's task
      expect(screen.queryByText('Today Task')).not.toBeInTheDocument();
      expect(screen.getByText('Tomorrow Task')).toBeInTheDocument();
    });

    it('shows all tasks when clicking All tab after filtering', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today Task',
          dueDate: fixedNow.getTime(),
        }),
        createMockTask({
          id: 'task-2',
          title: 'Tomorrow Task',
          dueDate: fixedNow.getTime() + 86400000,
        }),
      ];

      render(<SpreadsheetView {...defaultProps} tasks={tasks} />);

      // Filter by Today
      fireEvent.click(screen.getByRole('tab', { name: /today/i }));
      expect(screen.queryByText('Tomorrow Task')).not.toBeInTheDocument();

      // Click All tab
      fireEvent.click(screen.getByRole('tab', { name: /all/i }));

      // Should show all tasks
      expect(screen.getByText('Today Task')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow Task')).toBeInTheDocument();
    });
  });
});

describe('TaskDetailView', () => {
  const createProps = (taskOverrides: Partial<Task> = {}) => ({
    task: createMockTask({ estimate: 60, ...taskOverrides }),
    onUpdateTask: vi.fn(),
    onAddSession: vi.fn(),
    onUpdateSession: vi.fn(),
    onDeleteSession: vi.fn(),
    onBack: vi.fn(),
  });

  it('renders task title in input', () => {
    const props = createProps({ title: 'My Task Title' });
    render(<TaskDetailView {...props} />);

    expect(screen.getByDisplayValue('My Task Title')).toBeInTheDocument();
  });

  it('renders back button', () => {
    const props = createProps();
    render(<TaskDetailView {...props} />);

    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    const props = { ...createProps(), onBack };
    render(<TaskDetailView {...props} />);

    fireEvent.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('updates title on blur', () => {
    const onUpdateTask = vi.fn();
    const task = createMockTask({
      id: 'task-1',
      title: 'Original',
      estimate: 60,
    });
    render(
      <TaskDetailView
        task={task}
        onUpdateTask={onUpdateTask}
        onAddSession={vi.fn()}
        onUpdateSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onBack={() => {}}
      />
    );

    const input = screen.getByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated Title' } });
    fireEvent.blur(input);

    expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
      title: 'Updated Title',
    });
  });

  it('does not update title on blur if unchanged', () => {
    const onUpdateTask = vi.fn();
    const task = createMockTask({ title: 'Original', estimate: 60 });
    render(
      <TaskDetailView
        task={task}
        onUpdateTask={onUpdateTask}
        onAddSession={vi.fn()}
        onUpdateSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onBack={() => {}}
      />
    );

    const input = screen.getByDisplayValue('Original');
    fireEvent.blur(input);

    expect(onUpdateTask).not.toHaveBeenCalled();
  });

  it('blurs input on Enter key', () => {
    const props = createProps({ title: 'Test' });
    render(<TaskDetailView {...props} />);

    const input = screen.getByDisplayValue('Test') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(document.activeElement).not.toBe(input);
  });

  it('renders Editor component', () => {
    const props = createProps();
    render(<TaskDetailView {...props} />);

    // Editor should render a block-input
    expect(screen.getByRole('textbox', { name: '' })).toBeInTheDocument();
  });

  it('opens sessions modal when clicking time display', () => {
    const props = createProps({ estimate: 60 });
    render(<TaskDetailView {...props} />);

    // Find and click the time display button (shows "0m / 1h")
    const timeDisplay = screen.getByRole('button', { name: /0m \/ 1h/i });
    fireEvent.click(timeDisplay);

    // Modal should appear with "Time Sessions" title
    expect(screen.getByText('Time Sessions')).toBeInTheDocument();
  });
});

describe('FullDayNotesView', () => {
  const defaultProps = {
    tasks: [] as Task[],
    onSelectTask: vi.fn(),
    onBack: vi.fn(),
    onUpdateTask: vi.fn(),
    onAddTask: vi.fn().mockResolvedValue(null),
  };

  it('renders header with "Task Notes"', () => {
    render(<FullDayNotesView {...defaultProps} />);
    expect(screen.getByText('Task Notes')).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<FullDayNotesView {...defaultProps} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<FullDayNotesView {...defaultProps} onBack={onBack} />);

    fireEvent.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows empty state when no tasks and no onAddTask', () => {
    render(
      <FullDayNotesView tasks={[]} onSelectTask={vi.fn()} onBack={vi.fn()} />
    );
    expect(
      screen.getByText('No tasks match the current filters.')
    ).toBeInTheDocument();
  });

  it('renders TaskNotesEditor when onAddTask is provided even with no tasks', () => {
    render(<FullDayNotesView {...defaultProps} />);
    // Should show the editor container
    expect(document.querySelector('.w-full')).toBeInTheDocument();
  });

  it('renders task titles', () => {
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Task One' }),
      createMockTask({ id: 'task-2', title: 'Task Two' }),
    ];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
  });

  it('renders "Untitled" for tasks without title', () => {
    const tasks = [createMockTask({ id: 'task-1', title: '' })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('shows edit icon on task titles', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'My Task' })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    const editButton = screen.getByLabelText('Edit My Task');
    expect(editButton).toBeInTheDocument();
  });

  it('calls onSelectTask when edit icon is clicked', () => {
    const onSelectTask = vi.fn();
    const tasks = [createMockTask({ id: 'task-1', title: 'Click Me' })];
    render(
      <FullDayNotesView
        {...defaultProps}
        tasks={tasks}
        onSelectTask={onSelectTask}
      />
    );

    fireEvent.click(screen.getByLabelText('Edit Click Me'));
    expect(onSelectTask).toHaveBeenCalledWith('task-1');
  });

  it('renders task blocks', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'paragraph', content: 'Paragraph content' },
      { id: 'b2', type: 'bullet', content: 'Bullet item' },
    ];
    const tasks = [createMockTask({ id: 'task-1', blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('Paragraph content')).toBeInTheDocument();
    expect(screen.getByText('Bullet item')).toBeInTheDocument();
  });

  it('renders bullet prefix for bullet blocks', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'bullet', content: 'Bullet' }];
    const tasks = [createMockTask({ id: 'task-1', blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('•')).toBeInTheDocument();
  });

  it('renders numbered prefix for numbered blocks', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'numbered', content: 'First' },
      { id: 'b2', type: 'numbered', content: 'Second' },
    ];
    const tasks = [createMockTask({ id: 'task-1', blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
  });

  it('renders todo blocks with checkbox', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'todo', content: 'Todo item' }];
    const tasks = [createMockTask({ id: 'task-1', blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    // BlockInput renders todo with aria-label
    expect(screen.getByLabelText('Mark as complete')).toBeInTheDocument();
  });

  it('renders divider blocks', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'divider', content: '' }];
    const tasks = [createMockTask({ id: 'task-1', blocks })];
    const { container } = render(
      <FullDayNotesView {...defaultProps} tasks={tasks} />
    );

    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('applies task type background colors to task headers', () => {
    const taskTypes: TaskType[] = [
      'admin',
      'operations',
      'business-dev',
      'personal',
    ];

    taskTypes.forEach((type) => {
      const tasks = [
        createMockTask({ id: `task-${type}`, type, title: `${type} Task` }),
      ];
      const { unmount } = render(
        <FullDayNotesView {...defaultProps} tasks={tasks} />
      );

      const header = screen.getByTestId(`task-header-task-${type}`);
      const colors = TASK_TYPE_COLORS[type];

      expect(header.className).toContain(colors.bg.split(' ')[0]);
      expect(header.className).toContain(colors.text.split(' ')[0]);
      unmount();
    });
  });

  it('renders task headers with text-title class', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'Large Title Task' })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    const header = screen.getByTestId('task-header-task-1');
    expect(header.className).toContain('text-title');
  });

  it('shows type modal when typing $ prefix in last block and pressing Enter', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
    const tasks = [createMockTask({ id: 'task-1', blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    // For contentEditable, we need to set textContent directly
    const blockInput = document.querySelector('.block-input');
    blockInput!.textContent = '$ Test task';
    fireEvent.keyDown(blockInput!, { key: 'Enter' });

    expect(screen.getByText('Select Task Type')).toBeInTheDocument();
  });

  it('does not show type modal when typing without $ prefix in last block', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
    const tasks = [createMockTask({ id: 'task-1', blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    const blockInput = document.querySelector('.block-input');
    blockInput!.textContent = 'Test task';
    fireEvent.keyDown(blockInput!, { key: 'Enter' });

    expect(screen.queryByText('Select Task Type')).not.toBeInTheDocument();
  });

  it('calls onAddTask when type is selected from modal', async () => {
    const onAddTask = vi.fn().mockResolvedValue({ id: 'new-task' });
    const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
    const tasks = [createMockTask({ id: 'task-1', blocks })];
    render(
      <FullDayNotesView {...defaultProps} tasks={tasks} onAddTask={onAddTask} />
    );

    const blockInput = document.querySelector('.block-input');
    blockInput!.textContent = '$ Buy groceries';
    fireEvent.keyDown(blockInput!, { key: 'Enter' });

    // Click a type option
    fireEvent.click(screen.getByText('Personal'));

    // Insert after task-1 (the task we typed in)
    expect(onAddTask).toHaveBeenCalledWith(
      'Buy groceries',
      'personal',
      'task-1'
    );
  });

  it('closes type modal on Escape', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
    const tasks = [createMockTask({ id: 'task-1', blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    const blockInput = document.querySelector('.block-input');
    blockInput!.textContent = '$ Test task';
    fireEvent.keyDown(blockInput!, { key: 'Enter' });

    expect(screen.getByText('Select Task Type')).toBeInTheDocument();

    // Press Escape to close
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Select Task Type')).not.toBeInTheDocument();
  });

  it('renders blocks for all tasks', () => {
    const tasks = [
      createMockTask({
        id: 'task-1',
        title: 'Task One',
        blocks: [{ id: 'b1', type: 'paragraph', content: 'Block One' }],
      }),
      createMockTask({
        id: 'task-2',
        title: 'Task Two',
        blocks: [{ id: 'b2', type: 'paragraph', content: 'Block Two' }],
      }),
    ];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    // Should have blocks from both tasks
    expect(screen.getByText('Block One')).toBeInTheDocument();
    expect(screen.getByText('Block Two')).toBeInTheDocument();
  });
});

describe('ArchiveView', () => {
  const defaultProps = {
    tasks: [] as Task[],
    onUpdateTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onReorder: vi.fn(),
    onSelectTask: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders header with "Archive" title', () => {
    render(<ArchiveView {...defaultProps} />);
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<ArchiveView {...defaultProps} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<ArchiveView {...defaultProps} onBack={onBack} />);

    fireEvent.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows empty state when no archived tasks', () => {
    render(<ArchiveView {...defaultProps} />);
    expect(screen.getByText('No archived tasks.')).toBeInTheDocument();
  });

  it('renders tasks when provided', () => {
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Done Task', status: 'done' }),
    ];
    render(<ArchiveView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('Done Task')).toBeInTheDocument();
  });

  it('renders DateFilterTabs with All selected by default', () => {
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Done Task', status: 'done' }),
    ];
    render(<ArchiveView {...defaultProps} tasks={tasks} />);

    const allTab = screen.getByRole('tab', { name: /all/i });
    expect(allTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders all date filter tabs', () => {
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Done Task', status: 'done' }),
    ];
    render(<ArchiveView {...defaultProps} tasks={tasks} />);

    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tomorrow/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /this week/i })).toBeInTheDocument();
  });

  describe('date filter interactions', () => {
    const fixedNow = new Date(2024, 5, 19, 14, 0);

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('filters tasks when clicking Today tab', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today Done',
          status: 'done',
          dueDate: fixedNow.getTime(),
        }),
        createMockTask({
          id: 'task-2',
          title: 'Tomorrow Done',
          status: 'done',
          dueDate: fixedNow.getTime() + 86400000,
        }),
      ];

      render(<ArchiveView {...defaultProps} tasks={tasks} />);

      fireEvent.click(screen.getByRole('tab', { name: /today/i }));

      expect(screen.getByText('Today Done')).toBeInTheDocument();
      expect(screen.queryByText('Tomorrow Done')).not.toBeInTheDocument();
    });

    it('shows task counts for each filter tab', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today Done',
          status: 'done',
          dueDate: fixedNow.getTime(),
        }),
        createMockTask({
          id: 'task-2',
          title: 'No Date Done',
          status: 'done',
          dueDate: undefined,
        }),
      ];

      render(<ArchiveView {...defaultProps} tasks={tasks} />);

      const allTab = screen.getByRole('tab', { name: /all/i });
      expect(allTab).toHaveTextContent('(2)');
      const todayTab = screen.getByRole('tab', { name: /today/i });
      expect(todayTab).toHaveTextContent('(1)');
    });
  });

  it('calls onUpdateTask when task status is changed', () => {
    const onUpdateTask = vi.fn();
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Done Task', status: 'done' }),
    ];

    render(
      <ArchiveView
        {...defaultProps}
        tasks={tasks}
        onUpdateTask={onUpdateTask}
      />
    );

    // Change status - the StatusCell uses a native <select>
    const statusSelect = screen.getByDisplayValue('Done');
    fireEvent.change(statusSelect, { target: { value: 'todo' } });

    expect(onUpdateTask).toHaveBeenCalledWith('task-1', { status: 'todo' });
  });

  it('calls onSelectTask when task is clicked', () => {
    const onSelectTask = vi.fn();
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Click Me', status: 'done' }),
    ];

    render(
      <ArchiveView
        {...defaultProps}
        tasks={tasks}
        onSelectTask={onSelectTask}
      />
    );

    fireEvent.click(screen.getByText('Click Me'));

    expect(onSelectTask).toHaveBeenCalledWith('task-1');
  });
});
