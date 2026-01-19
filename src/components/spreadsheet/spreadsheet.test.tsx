import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectCell } from './SelectCell';
import { TitleCell } from './TitleCell';
import { TypeCell } from './TypeCell';
import { StatusCell } from './StatusCell';
import { ImportanceCell } from './ImportanceCell';
import { TaskTable } from './TaskTable';
import { Task, TaskType, TASK_TYPE_COLORS } from '../../types';

describe('SelectCell', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ];

  it('renders with correct value selected', () => {
    render(<SelectCell value="b" onChange={() => {}} options={options} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('b');
  });

  it('renders all options', () => {
    render(<SelectCell value="a" onChange={() => {}} options={options} />);
    const optionElements = screen.getAllByRole('option');
    expect(optionElements).toHaveLength(3);
    expect(optionElements[0]).toHaveTextContent('Option A');
    expect(optionElements[1]).toHaveTextContent('Option B');
    expect(optionElements[2]).toHaveTextContent('Option C');
  });

  it('calls onChange with new value when selection changes', () => {
    const onChange = vi.fn();
    render(<SelectCell value="a" onChange={onChange} options={options} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'c' } });

    expect(onChange).toHaveBeenCalledWith('c');
  });
});

describe('TitleCell', () => {
  it('renders the title', () => {
    render(<TitleCell value="My Task" onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('My Task');
  });

  it('renders "Untitled" when value is empty', () => {
    render(<TitleCell value="" onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('Untitled');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<TitleCell value="Task" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('TypeCell', () => {
  it('renders with correct value', () => {
    render(<TypeCell value="personal" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('personal');
  });

  it('renders all task type options', () => {
    render(<TypeCell value="admin" onChange={() => {}} />);
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Personal' })
    ).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<TypeCell value="admin" onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'fitness' },
    });
    expect(onChange).toHaveBeenCalledWith('fitness');
  });

  it('applies correct color classes for each task type', () => {
    const taskTypes: TaskType[] = [
      'admin',
      'operations',
      'business-dev',
      'jardin-casa',
      'jardin-finca',
      'personal',
      'fitness',
    ];

    taskTypes.forEach((type) => {
      const { unmount } = render(<TypeCell value={type} onChange={() => {}} />);
      const select = screen.getByRole('combobox');
      const colors = TASK_TYPE_COLORS[type];

      expect(select.className).toContain(colors.bg.split(' ')[0]);
      expect(select.className).toContain(colors.text.split(' ')[0]);
      unmount();
    });
  });
});

describe('StatusCell', () => {
  it('renders with correct value', () => {
    render(<StatusCell value="in-progress" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('in-progress');
  });

  it('renders all status options', () => {
    render(<StatusCell value="todo" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'To-do' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'In progress' })
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Done' })).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<StatusCell value="todo" onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'done' },
    });
    expect(onChange).toHaveBeenCalledWith('done');
  });
});

describe('ImportanceCell', () => {
  it('renders with correct value', () => {
    render(<ImportanceCell value="high" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('high');
  });

  it('renders all importance options', () => {
    render(<ImportanceCell value="mid" onChange={() => {}} />);
    expect(screen.getByRole('option', { name: 'High' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mid' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Low' })).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<ImportanceCell value="mid" onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'low' },
    });
    expect(onChange).toHaveBeenCalledWith('low');
  });
});

describe('TaskTable', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: `task-${Date.now()}`,
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

  const defaultProps = {
    tasks: [] as Task[],
    onUpdateTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onReorder: vi.fn(),
    onSelectTask: vi.fn(),
    onAddTask: vi.fn(),
  };

  it('renders table headers', () => {
    render(<TaskTable {...defaultProps} />);

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Importance')).toBeInTheDocument();
  });

  it('renders task rows', () => {
    const tasks = [
      createMockTask({ id: 'task-1', title: 'First Task' }),
      createMockTask({ id: 'task-2', title: 'Second Task' }),
    ];

    render(<TaskTable {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('First Task')).toBeInTheDocument();
    expect(screen.getByText('Second Task')).toBeInTheDocument();
  });

  it('renders add task input', () => {
    render(<TaskTable {...defaultProps} />);

    expect(
      screen.getByPlaceholderText('Add a new task...')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('calls onAddTask when adding a task via button', () => {
    const onAddTask = vi.fn();
    render(<TaskTable {...defaultProps} onAddTask={onAddTask} />);

    const input = screen.getByPlaceholderText('Add a new task...');
    fireEvent.change(input, { target: { value: 'New Task' } });

    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addButton);

    expect(onAddTask).toHaveBeenCalledWith('New Task');
  });

  it('calls onAddTask when pressing Enter', () => {
    const onAddTask = vi.fn();
    render(<TaskTable {...defaultProps} onAddTask={onAddTask} />);

    const input = screen.getByPlaceholderText('Add a new task...');
    fireEvent.change(input, { target: { value: 'New Task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onAddTask).toHaveBeenCalledWith('New Task');
  });

  it('does not call onAddTask when input is empty', () => {
    const onAddTask = vi.fn();
    render(<TaskTable {...defaultProps} onAddTask={onAddTask} />);

    const addButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(addButton);

    expect(onAddTask).not.toHaveBeenCalled();
  });

  it('clears input after adding task', () => {
    render(<TaskTable {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      'Add a new task...'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input.value).toBe('');
  });

  it('calls onSelectTask when task title is clicked', () => {
    const onSelectTask = vi.fn();
    const tasks = [createMockTask({ id: 'task-1', title: 'Click Me' })];

    render(
      <TaskTable {...defaultProps} tasks={tasks} onSelectTask={onSelectTask} />
    );

    fireEvent.click(screen.getByText('Click Me'));
    expect(onSelectTask).toHaveBeenCalledWith('task-1');
  });

  it('calls onUpdateTask when type is changed', () => {
    const onUpdateTask = vi.fn();
    const tasks = [createMockTask({ id: 'task-1', type: 'admin' })];

    render(
      <TaskTable {...defaultProps} tasks={tasks} onUpdateTask={onUpdateTask} />
    );

    const typeSelects = screen.getAllByRole('combobox');
    const typeSelect = typeSelects[0]; // First select is type

    fireEvent.change(typeSelect, { target: { value: 'personal' } });
    expect(onUpdateTask).toHaveBeenCalledWith('task-1', { type: 'personal' });
  });

  it('calls onDeleteTask when delete button is clicked', () => {
    const onDeleteTask = vi.fn();
    const tasks = [createMockTask({ id: 'task-1' })];

    render(
      <TaskTable {...defaultProps} tasks={tasks} onDeleteTask={onDeleteTask} />
    );

    const deleteButton = screen.getByTitle('Delete task');
    fireEvent.click(deleteButton);

    expect(onDeleteTask).toHaveBeenCalledWith('task-1');
  });

  it('renders task row with correct test id', () => {
    const tasks = [createMockTask({ id: 'task-123' })];
    render(<TaskTable {...defaultProps} tasks={tasks} />);

    expect(screen.getByTestId('task-row-task-123')).toBeInTheDocument();
  });
});
