import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectCell } from './SelectCell';
import { TitleCell } from './TitleCell';
import { TypeCell } from './TypeCell';
import { StatusCell } from './StatusCell';
import { ImportanceCell } from './ImportanceCell';
import { TaskTable } from './TaskTable';
import { ColumnFilter, FilterValue } from './ColumnFilter';
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

  // Shared helper to get task row titles
  const getRowTitles = () => {
    const rows = screen.queryAllByTestId(/^task-row-/);
    return rows.map((row) => {
      const titleButton = row.querySelector('button');
      return titleButton?.textContent || '';
    });
  };

  it('renders table headers', () => {
    render(<TaskTable {...defaultProps} />);

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Importance')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
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

  it('renders add task button', () => {
    render(<TaskTable {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Add task' })
    ).toBeInTheDocument();
  });

  it('opens add task modal when button is clicked', () => {
    render(<TaskTable {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: 'Add task' });
    fireEvent.click(addButton);

    // Modal should open
    expect(screen.getByText('Add Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Importance')).toBeInTheDocument();
  });

  it('calls onAddTask when submitting via modal', () => {
    const onAddTask = vi.fn();
    render(<TaskTable {...defaultProps} onAddTask={onAddTask} />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('Task'), {
      target: { value: 'New Task' },
    });
    fireEvent.change(screen.getByLabelText('Importance'), {
      target: { value: 'mid' },
    });
    // Select estimate
    fireEvent.click(screen.getByRole('button', { name: '15m' }));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(onAddTask).toHaveBeenCalledWith({
      title: 'New Task',
      type: 'admin',
      status: 'todo',
      importance: 'mid',
      estimate: 15,
      dueDate: undefined,
    });
  });

  it('closes modal after submitting', () => {
    render(<TaskTable {...defaultProps} />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByText('Add Task')).toBeInTheDocument();

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('Task'), {
      target: { value: 'New Task' },
    });
    fireEvent.change(screen.getByLabelText('Importance'), {
      target: { value: 'mid' },
    });
    // Select estimate
    fireEvent.click(screen.getByRole('button', { name: '15m' }));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    // Modal should be closed
    expect(screen.queryByText('Add Task')).not.toBeInTheDocument();
  });

  it('closes modal when clicking Cancel', () => {
    render(<TaskTable {...defaultProps} />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByText('Add Task')).toBeInTheDocument();

    // Click Cancel
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Modal should be closed
    expect(screen.queryByText('Add Task')).not.toBeInTheDocument();
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

      const headers = [
        'Type',
        'Task',
        'Status',
        'Importance',
        'Estimate',
        'Date',
      ];
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

  describe('filtering', () => {
    const getFilterButton = (container: HTMLElement, columnIndex: number) => {
      const thead = container.querySelector('thead');
      const filterButtons = thead?.querySelectorAll(
        '[data-testid="filter-button"]'
      );
      return filterButtons?.[columnIndex] as HTMLButtonElement | undefined;
    };

    it('renders filter buttons in column headers', () => {
      const { container } = render(<TaskTable {...defaultProps} />);

      const filterButtons = container.querySelectorAll(
        '[data-testid="filter-button"]'
      );
      expect(filterButtons).toHaveLength(5); // Type, Task, Status, Importance, Date (Estimate has no filter)
    });

    it('opens filter popup when filter button is clicked', () => {
      const { container } = render(<TaskTable {...defaultProps} />);

      const filterButton = getFilterButton(container, 0)!; // Type column
      fireEvent.click(filterButton);

      expect(screen.getByText('Filter')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('filters by type using multiselect', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Admin Task', type: 'admin' }),
        createMockTask({
          id: 'task-2',
          title: 'Personal Task',
          type: 'personal',
        }),
        createMockTask({
          id: 'task-3',
          title: 'Fitness Task',
          type: 'fitness',
        }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      // Open type filter
      const filterButton = getFilterButton(container, 0)!;
      fireEvent.click(filterButton);

      // Select only 'admin'
      const adminCheckbox = screen.getByRole('checkbox', { name: 'Admin' });
      fireEvent.click(adminCheckbox);

      // Should only show admin task
      const titles = getRowTitles();
      expect(titles).toEqual(['Admin Task']);
    });

    it('filters by multiple types', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Admin Task', type: 'admin' }),
        createMockTask({
          id: 'task-2',
          title: 'Personal Task',
          type: 'personal',
        }),
        createMockTask({
          id: 'task-3',
          title: 'Fitness Task',
          type: 'fitness',
        }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      // Open type filter
      const filterButton = getFilterButton(container, 0)!;
      fireEvent.click(filterButton);

      // Select 'admin' and 'personal'
      fireEvent.click(screen.getByRole('checkbox', { name: 'Admin' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Personal' }));

      // Should show admin and personal tasks
      const titles = getRowTitles();
      expect(titles).toEqual(['Admin Task', 'Personal Task']);
    });

    it('filters by status', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Todo Task', status: 'todo' }),
        createMockTask({
          id: 'task-2',
          title: 'Done Task',
          status: 'done',
        }),
        createMockTask({
          id: 'task-3',
          title: 'In Progress Task',
          status: 'in-progress',
        }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      // Open status filter (index 2)
      const filterButton = getFilterButton(container, 2)!;
      fireEvent.click(filterButton);

      // Select only 'done'
      fireEvent.click(screen.getByRole('checkbox', { name: 'Done' }));

      // Should only show done task
      const titles = getRowTitles();
      expect(titles).toEqual(['Done Task']);
    });

    it('filters by importance', () => {
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

      // Open importance filter (index 3)
      const filterButton = getFilterButton(container, 3)!;
      fireEvent.click(filterButton);

      // Select only 'high'
      fireEvent.click(screen.getByRole('checkbox', { name: 'High' }));

      const titles = getRowTitles();
      expect(titles).toEqual(['High Task']);
    });

    it('filters by task title text search', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Buy groceries' }),
        createMockTask({ id: 'task-2', title: 'Call mom' }),
        createMockTask({ id: 'task-3', title: 'Buy flowers' }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      // Open task filter (index 1)
      const filterButton = getFilterButton(container, 1)!;
      fireEvent.click(filterButton);

      // Type search text using the enhanced title filter
      // With selectedTaskIds as null (default), search text filters tasks directly
      const searchInput = screen.getByPlaceholderText('Search titles...');
      fireEvent.change(searchInput, { target: { value: 'Buy' } });

      const titles = getRowTitles();
      expect(titles).toEqual(['Buy groceries', 'Buy flowers']);
    });

    it('filters by task title with wildcard pattern', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Buy groceries' }),
        createMockTask({ id: 'task-2', title: 'Call mom' }),
        createMockTask({ id: 'task-3', title: 'Buy flowers' }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      // Open task filter
      const filterButton = getFilterButton(container, 1)!;
      fireEvent.click(filterButton);

      // Type wildcard pattern in enhanced title filter
      // With selectedTaskIds as null (default), search text filters tasks directly
      const searchInput = screen.getByPlaceholderText('Search titles...');
      fireEvent.change(searchInput, { target: { value: 'Buy*' } });

      const titles = getRowTitles();
      expect(titles).toEqual(['Buy groceries', 'Buy flowers']);
    });

    it('filters by date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 86400000);

      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today Task',
          dueDate: today.getTime(),
        }),
        createMockTask({
          id: 'task-2',
          title: 'Tomorrow Task',
          dueDate: tomorrow.getTime(),
        }),
        createMockTask({
          id: 'task-3',
          title: 'No Date Task',
          dueDate: undefined,
        }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      // Open date filter (index 4)
      const filterButton = getFilterButton(container, 4)!;
      fireEvent.click(filterButton);

      // Set date filter - Radix popover renders in a portal, so query from document
      const dateInput = document.querySelector(
        'input[type="date"]'
      ) as HTMLInputElement;
      const todayStr = today.toISOString().split('T')[0];
      fireEvent.change(dateInput, { target: { value: todayStr } });

      const titles = getRowTitles();
      expect(titles).toEqual(['Today Task']);
    });

    it('combines multiple filters', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'High Admin',
          type: 'admin',
          importance: 'high',
        }),
        createMockTask({
          id: 'task-2',
          title: 'Low Admin',
          type: 'admin',
          importance: 'low',
        }),
        createMockTask({
          id: 'task-3',
          title: 'High Personal',
          type: 'personal',
          importance: 'high',
        }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} />
      );

      // Apply type filter
      const typeFilter = getFilterButton(container, 0)!;
      fireEvent.click(typeFilter);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Admin' }));

      // Close dropdown by clicking elsewhere
      fireEvent.mouseDown(document.body);

      // Apply importance filter
      const importanceFilter = getFilterButton(container, 3)!;
      fireEvent.click(importanceFilter);
      fireEvent.click(screen.getByRole('checkbox', { name: 'High' }));

      // Should only show high admin task
      const titles = getRowTitles();
      expect(titles).toEqual(['High Admin']);
    });
  });

  describe('dateFilterPreset', () => {
    // Helper to create dates relative to a fixed "now"
    const fixedNow = new Date(2024, 5, 19, 14, 0); // Wednesday, June 19, 2024

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows all tasks when preset is "all"', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today',
          dueDate: fixedNow.getTime(),
        }),
        createMockTask({
          id: 'task-2',
          title: 'Tomorrow',
          dueDate: fixedNow.getTime() + 86400000,
        }),
        createMockTask({ id: 'task-3', title: 'No Date', dueDate: undefined }),
      ];

      render(
        <TaskTable {...defaultProps} tasks={tasks} dateFilterPreset="all" />
      );

      const titles = getRowTitles();
      expect(titles).toHaveLength(3);
    });

    it('shows only tasks due today when preset is "today"', () => {
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

      render(
        <TaskTable {...defaultProps} tasks={tasks} dateFilterPreset="today" />
      );

      const titles = getRowTitles();
      expect(titles).toEqual(['Today Task']);
    });

    it('shows only tasks due tomorrow when preset is "tomorrow"', () => {
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
          title: 'Next Week Task',
          dueDate: fixedNow.getTime() + 7 * 86400000,
        }),
      ];

      render(
        <TaskTable
          {...defaultProps}
          tasks={tasks}
          dateFilterPreset="tomorrow"
        />
      );

      const titles = getRowTitles();
      expect(titles).toEqual(['Tomorrow Task']);
    });

    it('shows tasks due this week when preset is "this-week"', () => {
      // fixedNow is Wednesday June 19, 2024
      // Week is Monday June 17 - Sunday June 23
      const monday = new Date(2024, 5, 17).getTime();
      const sunday = new Date(2024, 5, 23).getTime();
      const nextWeek = new Date(2024, 5, 24).getTime();

      const tasks = [
        createMockTask({ id: 'task-1', title: 'Monday Task', dueDate: monday }),
        createMockTask({ id: 'task-2', title: 'Sunday Task', dueDate: sunday }),
        createMockTask({
          id: 'task-3',
          title: 'Next Week Task',
          dueDate: nextWeek,
        }),
        createMockTask({
          id: 'task-4',
          title: 'No Date Task',
          dueDate: undefined,
        }),
      ];

      render(
        <TaskTable
          {...defaultProps}
          tasks={tasks}
          dateFilterPreset="this-week"
        />
      );

      const titles = getRowTitles();
      expect(titles).toEqual(['Monday Task', 'Sunday Task']);
    });

    it('hides tasks without dueDate when preset is not "all"', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'With Date',
          dueDate: fixedNow.getTime(),
        }),
        createMockTask({ id: 'task-2', title: 'No Date', dueDate: undefined }),
      ];

      render(
        <TaskTable {...defaultProps} tasks={tasks} dateFilterPreset="today" />
      );

      const titles = getRowTitles();
      expect(titles).toEqual(['With Date']);
    });

    it('still applies column filters alongside preset', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today Admin',
          dueDate: fixedNow.getTime(),
          type: 'admin',
        }),
        createMockTask({
          id: 'task-2',
          title: 'Today Personal',
          dueDate: fixedNow.getTime(),
          type: 'personal',
        }),
        createMockTask({
          id: 'task-3',
          title: 'Tomorrow Admin',
          dueDate: fixedNow.getTime() + 86400000,
          type: 'admin',
        }),
      ];

      const { container } = render(
        <TaskTable {...defaultProps} tasks={tasks} dateFilterPreset="today" />
      );

      // Apply type filter for admin
      const filterButtons = container.querySelectorAll(
        '[data-testid="filter-button"]'
      );
      fireEvent.click(filterButtons[0]); // Type filter
      fireEvent.click(screen.getByRole('checkbox', { name: 'Admin' }));

      const titles = getRowTitles();
      expect(titles).toEqual(['Today Admin']);
    });

    it('defaults to "all" when no preset is provided', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Today',
          dueDate: fixedNow.getTime(),
        }),
        createMockTask({ id: 'task-2', title: 'No Date', dueDate: undefined }),
      ];

      render(<TaskTable {...defaultProps} tasks={tasks} />);

      const titles = getRowTitles();
      expect(titles).toHaveLength(2);
    });
  });

  describe('onVisibleTasksChange callback', () => {
    it('calls onVisibleTasksChange with all tasks when no filters applied', () => {
      const onVisibleTasksChange = vi.fn();
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task A' }),
        createMockTask({ id: 'task-2', title: 'Task B' }),
      ];

      render(
        <TaskTable
          {...defaultProps}
          tasks={tasks}
          onVisibleTasksChange={onVisibleTasksChange}
        />
      );

      expect(onVisibleTasksChange).toHaveBeenCalled();
      const lastCall =
        onVisibleTasksChange.mock.calls[
          onVisibleTasksChange.mock.calls.length - 1
        ];
      expect(lastCall[0]).toHaveLength(2);
      expect(lastCall[0].map((t: Task) => t.title)).toEqual([
        'Task A',
        'Task B',
      ]);
    });

    it('calls onVisibleTasksChange with filtered tasks when filters applied', () => {
      const onVisibleTasksChange = vi.fn();
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Admin Task', type: 'admin' }),
        createMockTask({
          id: 'task-2',
          title: 'Personal Task',
          type: 'personal',
        }),
      ];

      const { container } = render(
        <TaskTable
          {...defaultProps}
          tasks={tasks}
          onVisibleTasksChange={onVisibleTasksChange}
        />
      );

      // Apply type filter for admin
      const filterButtons = container.querySelectorAll(
        '[data-testid="filter-button"]'
      );
      fireEvent.click(filterButtons[0]); // Type filter
      fireEvent.click(screen.getByRole('checkbox', { name: 'Admin' }));

      // Get the most recent call
      const lastCall =
        onVisibleTasksChange.mock.calls[
          onVisibleTasksChange.mock.calls.length - 1
        ];
      expect(lastCall[0]).toHaveLength(1);
      expect(lastCall[0][0].title).toBe('Admin Task');
    });

    it('calls onVisibleTasksChange with sorted tasks when sorting applied', () => {
      const onVisibleTasksChange = vi.fn();
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Charlie' }),
        createMockTask({ id: 'task-2', title: 'Alpha' }),
        createMockTask({ id: 'task-3', title: 'Bravo' }),
      ];

      const { container } = render(
        <TaskTable
          {...defaultProps}
          tasks={tasks}
          onVisibleTasksChange={onVisibleTasksChange}
        />
      );

      // Click Task header to sort ascending
      const thead = container.querySelector('thead');
      const buttons = thead?.querySelectorAll('button') || [];
      let taskHeader: HTMLButtonElement | null = null;
      for (const btn of buttons) {
        if (btn.textContent?.includes('Task')) {
          taskHeader = btn as HTMLButtonElement;
          break;
        }
      }
      fireEvent.click(taskHeader!);

      // Get the most recent call
      const lastCall =
        onVisibleTasksChange.mock.calls[
          onVisibleTasksChange.mock.calls.length - 1
        ];
      expect(lastCall[0].map((t: Task) => t.title)).toEqual([
        'Alpha',
        'Bravo',
        'Charlie',
      ]);
    });
  });

  describe('date-based row styling', () => {
    it('applies no date styling to tasks without due date', () => {
      const tasks = [createMockTask({ id: 'task-1', dueDate: undefined })];
      render(<TaskTable {...defaultProps} tasks={tasks} />);

      const row = screen.getByTestId('task-row-task-1');
      expect(row).not.toHaveClass('bg-overdue');
      expect(row).not.toHaveClass('bg-today');
    });

    it('applies bg-overdue to tasks with due date in the past', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);

      const tasks = [
        createMockTask({ id: 'task-1', dueDate: yesterday.getTime() }),
      ];
      render(<TaskTable {...defaultProps} tasks={tasks} />);

      const row = screen.getByTestId('task-row-task-1');
      expect(row).toHaveClass('bg-overdue');
    });

    it('applies bg-today to tasks with due date today', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const tasks = [
        createMockTask({ id: 'task-1', dueDate: today.getTime() }),
      ];
      render(<TaskTable {...defaultProps} tasks={tasks} />);

      const row = screen.getByTestId('task-row-task-1');
      expect(row).toHaveClass('bg-today');
    });

    it('applies no date styling to tasks with due date in the future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);

      const tasks = [
        createMockTask({ id: 'task-1', dueDate: tomorrow.getTime() }),
      ];
      render(<TaskTable {...defaultProps} tasks={tasks} />);

      const row = screen.getByTestId('task-row-task-1');
      expect(row).not.toHaveClass('bg-overdue');
      expect(row).not.toHaveClass('bg-today');
    });
  });

  describe('controlled filter state', () => {
    it('uses controlled filters when provided', () => {
      const onFiltersChange = vi.fn();
      const filters = {
        type: { type: 'multiselect' as const, selected: new Set(['admin']) },
        title: null,
        status: null,
        importance: null,
        dueDate: null,
      };
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Admin Task', type: 'admin' }),
        createMockTask({
          id: 'task-2',
          title: 'Personal Task',
          type: 'personal',
        }),
      ];

      render(
        <TaskTable
          {...defaultProps}
          tasks={tasks}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      );

      // Only admin task should be visible
      const titles = getRowTitles();
      expect(titles).toEqual(['Admin Task']);
    });

    it('calls onFiltersChange when filter is updated in controlled mode', () => {
      const onFiltersChange = vi.fn();
      const filters = {
        type: null,
        title: null,
        status: null,
        importance: null,
        dueDate: null,
      };
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Admin Task', type: 'admin' }),
      ];

      const { container } = render(
        <TaskTable
          {...defaultProps}
          tasks={tasks}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      );

      // Open type filter
      const filterButtons = container.querySelectorAll(
        '[data-testid="filter-button"]'
      );
      fireEvent.click(filterButtons[0]);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Admin' }));

      expect(onFiltersChange).toHaveBeenCalled();
    });
  });
});

describe('ColumnFilter', () => {
  it('renders filter button', () => {
    const onChange = vi.fn();
    render(
      <ColumnFilter
        filterType="multiselect"
        options={[{ value: 'a', label: 'A' }]}
        filterValue={null}
        onFilterChange={onChange}
      />
    );

    expect(screen.getByTestId('filter-button')).toBeInTheDocument();
  });

  it('opens popup when clicked', () => {
    const onChange = vi.fn();
    render(
      <ColumnFilter
        filterType="multiselect"
        options={[{ value: 'a', label: 'A' }]}
        filterValue={null}
        onFilterChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('filter-button'));
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('calls onChange when checkbox is clicked in multiselect', () => {
    const onChange = vi.fn();
    render(
      <ColumnFilter
        filterType="multiselect"
        options={[{ value: 'a', label: 'Option A' }]}
        filterValue={null}
        onFilterChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('filter-button'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Option A' }));

    expect(onChange).toHaveBeenCalledWith({
      type: 'multiselect',
      selected: new Set(['a']),
    });
  });

  it('calls onChange when text is entered in text filter', () => {
    const onChange = vi.fn();
    render(
      <ColumnFilter
        filterType="text"
        filterValue={null}
        onFilterChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('filter-button'));
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(onChange).toHaveBeenCalledWith({ type: 'text', value: 'test' });
  });

  it('calls onChange when date is selected in date filter', () => {
    const onChange = vi.fn();
    render(
      <ColumnFilter
        filterType="date"
        filterValue={null}
        onFilterChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('filter-button'));
    // Radix popover renders in a portal, so query from document
    const input = document.querySelector(
      'input[type="date"]'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2024-01-15' } });

    expect(onChange).toHaveBeenCalled();
    const call = onChange.mock.calls[0][0] as FilterValue;
    expect(call.type).toBe('date');
    expect(
      (call as { type: 'date'; value: number | null }).value
    ).not.toBeNull();
  });

  it('shows active state when filter has value', () => {
    render(
      <ColumnFilter
        filterType="multiselect"
        options={[{ value: 'a', label: 'A' }]}
        filterValue={{ type: 'multiselect', selected: new Set(['a']) }}
        onFilterChange={() => {}}
      />
    );

    const button = screen.getByTestId('filter-button');
    // shadcn uses text-foreground for active state
    expect(button.className).toContain('text-foreground');
  });

  it('closes popup when pressing Escape', () => {
    render(
      <ColumnFilter
        filterType="text"
        filterValue={null}
        onFilterChange={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('filter-button'));
    expect(screen.getByText('Filter')).toBeInTheDocument();

    // Radix popover closes on Escape key
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByText('Filter')).not.toBeInTheDocument();
  });

  it('calls onFilterChange with null when clear button is clicked', () => {
    const onChange = vi.fn();
    render(
      <ColumnFilter
        filterType="multiselect"
        options={[{ value: 'a', label: 'A' }]}
        filterValue={{ type: 'multiselect', selected: new Set(['a']) }}
        onFilterChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('filter-button'));
    fireEvent.click(screen.getByTitle('Clear filter'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('handles keydown events in filter container', () => {
    const onChange = vi.fn();
    render(
      <ColumnFilter
        filterType="multiselect"
        options={[{ value: 'a', label: 'A' }]}
        filterValue={null}
        onFilterChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('filter-button'));
    // Press Escape inside the filter container
    const container = screen.getByRole('presentation');
    fireEvent.keyDown(container, { key: 'Escape' });

    // The popup should close
    expect(screen.queryByText('Filter')).not.toBeInTheDocument();
  });
});
