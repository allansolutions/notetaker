import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskFinder } from './TaskFinder';
import { Task } from '../types';

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: overrides.id ?? 'task-1',
  type: 'admin',
  title: 'Sample Task',
  status: 'todo',
  importance: 'mid',
  blocks: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('TaskFinder', () => {
  it('does not render when closed', () => {
    render(
      <TaskFinder
        isOpen={false}
        tasks={[]}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    expect(screen.queryByText('Task Finder')).not.toBeInTheDocument();
  });

  it('renders results and focuses input when open', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    expect(screen.getByText('Task Finder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search tasks...')).toHaveFocus();
    expect(screen.getByText('Alpha Task')).toBeInTheDocument();
  });

  it('filters tasks based on query input', () => {
    const tasks = [
      createMockTask({
        id: 'task-1',
        title: 'Alpha Task',
        blocks: [{ id: 'b1', type: 'paragraph', content: 'Buy apples' }],
      }),
      createMockTask({
        id: 'task-2',
        title: 'Bravo Task',
        blocks: [{ id: 'b2', type: 'paragraph', content: 'Call client' }],
      }),
    ];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search tasks...'), {
      target: { value: 'appl' },
    });

    expect(screen.getByText('Alpha Task')).toBeInTheDocument();
    expect(screen.queryByText('Bravo Task')).not.toBeInTheDocument();
  });

  it('shows empty state when no tasks match', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search tasks...'), {
      target: { value: 'missing' },
    });

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('executes selection on Enter', () => {
    const onClose = vi.fn();
    const onSelectTask = vi.fn();
    const tasks = [
      createMockTask({
        id: 'task-1',
        title: 'Alpha Task',
        blocks: [{ id: 'b1', type: 'paragraph', content: 'Buy apples' }],
      }),
    ];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={onClose}
        onSelectTask={onSelectTask}
      />
    );

    fireEvent.keyDown(screen.getByPlaceholderText('Search tasks...'), {
      key: 'Enter',
    });

    expect(onSelectTask).toHaveBeenCalledWith('task-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when pressing Escape', () => {
    const onClose = vi.fn();
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={onClose}
        onSelectTask={vi.fn()}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('moves selection with arrow keys', () => {
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Alpha Task' }),
      createMockTask({ id: 'task-2', title: 'Bravo Task' }),
    ];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search tasks...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('selects item on click and hover', () => {
    const onClose = vi.fn();
    const onSelectTask = vi.fn();
    const tasks = [
      createMockTask({ id: 'task-1', title: 'Alpha Task' }),
      createMockTask({ id: 'task-2', title: 'Bravo Task' }),
    ];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={onClose}
        onSelectTask={onSelectTask}
      />
    );

    const options = screen.getAllByRole('option');
    fireEvent.mouseEnter(options[1]);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(options[1]);
    expect(onSelectTask).toHaveBeenCalledWith('task-2');
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores Enter when no results', () => {
    const onSelectTask = vi.fn();
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={onSelectTask}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search tasks...'), {
      target: { value: 'missing' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Search tasks...'), {
      key: 'Enter',
    });

    expect(onSelectTask).not.toHaveBeenCalled();
  });

  it('keeps selection at zero when results are empty', () => {
    const tasks = [createMockTask({ id: 'task-1', title: 'Alpha Task' })];

    render(
      <TaskFinder
        isOpen
        tasks={tasks}
        onClose={vi.fn()}
        onSelectTask={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search tasks...');
    fireEvent.change(input, { target: { value: 'missing' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });
});
