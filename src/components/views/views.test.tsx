import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpreadsheetView } from './SpreadsheetView';
import { TaskDetailView } from './TaskDetailView';
import { FullDayNotesView } from './FullDayNotesView';
import { Task, Block } from '../../types';

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
  };

  it('renders header with title', () => {
    render(<SpreadsheetView {...defaultProps} />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('renders Full Day Notes button', () => {
    render(<SpreadsheetView {...defaultProps} />);
    expect(screen.getByText('Full Day Notes')).toBeInTheDocument();
  });

  it('calls onNavigateToFullDayNotes when button is clicked', () => {
    const onNavigateToFullDayNotes = vi.fn();
    render(
      <SpreadsheetView
        {...defaultProps}
        onNavigateToFullDayNotes={onNavigateToFullDayNotes}
      />
    );

    fireEvent.click(screen.getByText('Full Day Notes'));
    expect(onNavigateToFullDayNotes).toHaveBeenCalled();
  });

  it('renders TaskTable with tasks', () => {
    const tasks = [createMockTask({ title: 'My Task' })];
    render(<SpreadsheetView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('My Task')).toBeInTheDocument();
  });
});

describe('TaskDetailView', () => {
  const createProps = (taskOverrides: Partial<Task> = {}) => ({
    task: createMockTask({ estimate: 60, ...taskOverrides }),
    onUpdateTask: vi.fn(),
    onSetEstimate: vi.fn(),
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
        onSetEstimate={vi.fn()}
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
        onSetEstimate={vi.fn()}
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
});

describe('FullDayNotesView', () => {
  const defaultProps = {
    tasks: [] as Task[],
    onSelectTask: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders header', () => {
    render(<FullDayNotesView {...defaultProps} />);
    expect(screen.getByText('Full Day Notes')).toBeInTheDocument();
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

  it('shows empty state when no tasks', () => {
    render(<FullDayNotesView {...defaultProps} />);
    expect(screen.getByText('No tasks yet.')).toBeInTheDocument();
  });

  it('renders task titles', () => {
    const tasks = [
      createMockTask({ title: 'Task One' }),
      createMockTask({ title: 'Task Two' }),
    ];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
  });

  it('renders "Untitled" for tasks without title', () => {
    const tasks = [createMockTask({ title: '' })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('calls onSelectTask when task title is clicked', () => {
    const onSelectTask = vi.fn();
    const tasks = [createMockTask({ id: 'task-1', title: 'Click Me' })];
    render(
      <FullDayNotesView
        {...defaultProps}
        tasks={tasks}
        onSelectTask={onSelectTask}
      />
    );

    fireEvent.click(screen.getByText('Click Me'));
    expect(onSelectTask).toHaveBeenCalledWith('task-1');
  });

  it('renders task blocks', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'paragraph', content: 'Paragraph content' },
      { id: 'b2', type: 'bullet', content: 'Bullet item' },
    ];
    const tasks = [createMockTask({ blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('Paragraph content')).toBeInTheDocument();
    expect(screen.getByText('Bullet item')).toBeInTheDocument();
  });

  it('renders bullet prefix for bullet blocks', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'bullet', content: 'Bullet' }];
    const tasks = [createMockTask({ blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('•')).toBeInTheDocument();
  });

  it('renders numbered prefix for numbered blocks', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'numbered', content: 'First' },
      { id: 'b2', type: 'numbered', content: 'Second' },
    ];
    const tasks = [createMockTask({ blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
  });

  it('renders todo checkbox for todo blocks', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'todo', content: 'Todo item' },
      { id: 'b2', type: 'todo-checked', content: 'Done item' },
    ];
    const tasks = [createMockTask({ blocks })];
    render(<FullDayNotesView {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('☐')).toBeInTheDocument();
    expect(screen.getByText('☑')).toBeInTheDocument();
  });

  it('renders divider blocks', () => {
    const blocks: Block[] = [{ id: 'b1', type: 'divider', content: '' }];
    const tasks = [createMockTask({ blocks })];
    const { container } = render(
      <FullDayNotesView {...defaultProps} tasks={tasks} />
    );

    expect(container.querySelector('hr')).toBeInTheDocument();
  });
});
