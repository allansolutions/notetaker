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

  describe('sorting', () => {
    const getRowTitles = () => {
      const rows = screen.getAllByTestId(/^task-row-/);
      return rows.map((row) => {
        const titleButton = row.querySelector('button');
        return titleButton?.textContent || '';
      });
    };

    const getHeaderButton = (container: HTMLElement, headerText: string) => {
      const thead = container.querySelector('thead');
      const button = thead?.querySelector(`button`) as HTMLButtonElement | null;
      const buttons = thead?.querySelectorAll('button') || [];
      for (const btn of buttons) {
        if (btn.textContent?.includes(headerText)) {
          return btn as HTMLButtonElement;
        }
      }
      return button;
    };

    it('renders sortable headers with sort icons', () => {
      const { container } = render(<TaskTable {...defaultProps} />);

      const headers = ['Type', 'Task', 'Status', 'Importance', 'Date'];
      headers.forEach((header) => {
        const headerButton = getHeaderButton(container, header);
        expect(headerButton).toBeInTheDocument();
        expect(headerButton?.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('sorts by type column alphabetically', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task A', type: 'personal' }),
        createMockTask({ id: 'task-2', title: 'Task B', type: 'admin' }),
        createMockTask({ id: 'task-3', title: 'Task C', type: 'fitness' }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      // Click Type header to sort ascending
      const typeHeader = getHeaderButton(container, 'Type')!;
      fireEvent.click(typeHeader);

      let titles = getRowTitles();
      // admin < fitness < personal (alphabetical)
      expect(titles).toEqual(['Task B', 'Task C', 'Task A']);

      // Click again to sort descending
      fireEvent.click(typeHeader);
      titles = getRowTitles();
      expect(titles).toEqual(['Task A', 'Task C', 'Task B']);
    });

    it('sorts by task column alphabetically', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Charlie' }),
        createMockTask({ id: 'task-2', title: 'Alpha' }),
        createMockTask({ id: 'task-3', title: 'Bravo' }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      const taskHeader = getHeaderButton(container, 'Task')!;
      fireEvent.click(taskHeader);

      let titles = getRowTitles();
      expect(titles).toEqual(['Alpha', 'Bravo', 'Charlie']);

      fireEvent.click(taskHeader);
      titles = getRowTitles();
      expect(titles).toEqual(['Charlie', 'Bravo', 'Alpha']);
    });

    it('sorts by status column with custom order (todo < in-progress < done)', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Done Task', status: 'done' }),
        createMockTask({ id: 'task-2', title: 'Todo Task', status: 'todo' }),
        createMockTask({
          id: 'task-3',
          title: 'In Progress Task',
          status: 'in-progress',
        }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      const statusHeader = getHeaderButton(container, 'Status')!;
      fireEvent.click(statusHeader);

      let titles = getRowTitles();
      // Ascending: todo (0) < in-progress (1) < done (2)
      expect(titles).toEqual(['Todo Task', 'In Progress Task', 'Done Task']);

      fireEvent.click(statusHeader);
      titles = getRowTitles();
      // Descending
      expect(titles).toEqual(['Done Task', 'In Progress Task', 'Todo Task']);
    });

    it('sorts by importance column with custom order (low < mid < high)', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'High Task',
          importance: 'high',
        }),
        createMockTask({ id: 'task-2', title: 'Low Task', importance: 'low' }),
        createMockTask({ id: 'task-3', title: 'Mid Task', importance: 'mid' }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      const importanceHeader = getHeaderButton(container, 'Importance')!;
      fireEvent.click(importanceHeader);

      let titles = getRowTitles();
      // Ascending: low (0) < mid (1) < high (2)
      expect(titles).toEqual(['Low Task', 'Mid Task', 'High Task']);

      fireEvent.click(importanceHeader);
      titles = getRowTitles();
      // Descending
      expect(titles).toEqual(['High Task', 'Mid Task', 'Low Task']);
    });

    it('sorts by date column chronologically', () => {
      const now = Date.now();
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Future Task',
          dueDate: now + 86400000,
        }), // tomorrow
        createMockTask({
          id: 'task-2',
          title: 'Past Task',
          dueDate: now - 86400000,
        }), // yesterday
        createMockTask({ id: 'task-3', title: 'Today Task', dueDate: now }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      const dateHeader = getHeaderButton(container, 'Date')!;
      fireEvent.click(dateHeader);

      let titles = getRowTitles();
      // First click: sorts by date (newest/largest first due to how TanStack handles custom sort)
      expect(titles).toEqual(['Future Task', 'Today Task', 'Past Task']);

      fireEvent.click(dateHeader);
      titles = getRowTitles();
      // Second click: reverses sort order (oldest first)
      expect(titles).toEqual(['Past Task', 'Today Task', 'Future Task']);
    });

    it('handles undefined dates in sorting', () => {
      const now = Date.now();
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'No Date Task',
          dueDate: undefined,
        }),
        createMockTask({ id: 'task-2', title: 'Has Date Task', dueDate: now }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      const dateHeader = getHeaderButton(container, 'Date')!;

      // First click - undefined dates (Infinity) sort to end when ascending
      fireEvent.click(dateHeader);
      let titles = getRowTitles();
      expect(titles).toEqual(['No Date Task', 'Has Date Task']);

      // Second click - reverses sort order
      fireEvent.click(dateHeader);
      titles = getRowTitles();
      expect(titles).toEqual(['Has Date Task', 'No Date Task']);
    });

    it('clears sort when clicking header three times', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Charlie' }),
        createMockTask({ id: 'task-2', title: 'Alpha' }),
        createMockTask({ id: 'task-3', title: 'Bravo' }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      const taskHeader = getHeaderButton(container, 'Task')!;

      // Original order
      let titles = getRowTitles();
      expect(titles).toEqual(['Charlie', 'Alpha', 'Bravo']);

      // Click once: ascending
      fireEvent.click(taskHeader);
      titles = getRowTitles();
      expect(titles).toEqual(['Alpha', 'Bravo', 'Charlie']);

      // Click twice: descending
      fireEvent.click(taskHeader);
      titles = getRowTitles();
      expect(titles).toEqual(['Charlie', 'Bravo', 'Alpha']);

      // Click three times: back to original (no sort)
      fireEvent.click(taskHeader);
      titles = getRowTitles();
      expect(titles).toEqual(['Charlie', 'Alpha', 'Bravo']);
    });
  });
});
