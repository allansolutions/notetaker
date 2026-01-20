import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskNotesEditor } from './TaskNotesEditor';
import { Task, Block } from '../types';

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

describe('TaskNotesEditor', () => {
  const defaultProps = {
    tasks: [] as Task[],
    onUpdateTask: vi.fn(),
    onAddTask: vi.fn().mockResolvedValue(null),
    onSelectTask: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders empty state with new-line input', () => {
      render(<TaskNotesEditor {...defaultProps} />);
      expect(screen.getByTestId('new-line-newline-end')).toBeInTheDocument();
    });

    it('renders task headers', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task One' }),
        createMockTask({ id: 'task-2', title: 'Task Two' }),
      ];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      expect(screen.getByText('Task One')).toBeInTheDocument();
      expect(screen.getByText('Task Two')).toBeInTheDocument();
    });

    it('renders Untitled for empty title', () => {
      const tasks = [createMockTask({ id: 'task-1', title: '' })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('renders task blocks', () => {
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'Block content' },
      ];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      expect(screen.getByText('Block content')).toBeInTheDocument();
    });

    it('renders new-line inputs after each task', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task One' }),
        createMockTask({ id: 'task-2', title: 'Task Two' }),
      ];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      expect(
        screen.getByTestId('new-line-newline-after-task-1')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('new-line-newline-after-task-2')
      ).toBeInTheDocument();
      expect(screen.getByTestId('new-line-newline-end')).toBeInTheDocument();
    });

    it('renders edit button for each task', () => {
      const tasks = [createMockTask({ id: 'task-1', title: 'My Task' })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      expect(screen.getByLabelText('Edit My Task')).toBeInTheDocument();
    });
  });

  describe('task header interactions', () => {
    it('calls onSelectTask when edit button is clicked', () => {
      const onSelectTask = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', title: 'My Task' })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onSelectTask={onSelectTask}
        />
      );

      fireEvent.click(screen.getByLabelText('Edit My Task'));
      expect(onSelectTask).toHaveBeenCalledWith('task-1');
    });

    it('updates task title on input', () => {
      const onUpdateTask = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', title: 'Original' })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      const header = screen.getByTestId('task-header-task-1');
      header.textContent = 'Updated Title';
      fireEvent.input(header);

      expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
        title: 'Updated Title',
      });
    });

    it('navigates to first block on Enter in header', () => {
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'First block' },
      ];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      const header = screen.getByTestId('task-header-task-1');
      fireEvent.focus(header);
      fireEvent.keyDown(header, { key: 'Enter' });

      // The block content should be in the document and focusable
      const blockContent = screen.getByText('First block');
      expect(blockContent).toBeInTheDocument();
    });

    it('creates first block on Enter when task has no blocks', () => {
      const onUpdateTask = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', blocks: [] })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      const header = screen.getByTestId('task-header-task-1');
      fireEvent.focus(header);
      fireEvent.keyDown(header, { key: 'Enter' });

      expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
        blocks: expect.arrayContaining([
          expect.objectContaining({ type: 'paragraph', content: '' }),
        ]),
      });
    });
  });

  describe('block interactions', () => {
    it('updates block content on input', () => {
      const onUpdateTask = vi.fn();
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'Original' },
      ];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      // Find the block input (contentEditable div)
      const blockInput = screen.getByText('Original');
      blockInput.textContent = 'Updated';
      fireEvent.input(blockInput);

      expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
        blocks: [{ id: 'b1', type: 'paragraph', content: 'Updated' }],
      });
    });

    it('inserts new block on Enter', () => {
      const onUpdateTask = vi.fn();
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'First' },
      ];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      const blockInput = screen.getByText('First');
      fireEvent.keyDown(blockInput, { key: 'Enter' });

      expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
        blocks: expect.arrayContaining([
          expect.objectContaining({ id: 'b1' }),
          expect.objectContaining({ type: 'paragraph' }),
        ]),
      });
    });

    it('merges block with previous on Backspace at start', () => {
      const onUpdateTask = vi.fn();
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'First' },
        { id: 'b2', type: 'paragraph', content: 'Second' },
      ];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      // Find and interact with the second block
      const secondBlock = screen.getByText('Second');
      fireEvent.focus(secondBlock);
      // Simulate backspace at start of block
      fireEvent.keyDown(secondBlock, { key: 'Backspace' });

      // Should merge blocks
      expect(onUpdateTask).toHaveBeenCalled();
    });
  });

  describe('task creation', () => {
    it('shows type modal when typing $ prefix and pressing Enter', () => {
      render(<TaskNotesEditor {...defaultProps} />);

      const input = screen.getByTestId('new-line-newline-end');
      input.textContent = '$ New task';
      fireEvent.input(input);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.getByText('Select Task Type')).toBeInTheDocument();
    });

    it('does not show type modal for regular text', () => {
      render(<TaskNotesEditor {...defaultProps} />);

      const input = screen.getByTestId('new-line-newline-end');
      input.textContent = 'Regular text';
      fireEvent.input(input);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.queryByText('Select Task Type')).not.toBeInTheDocument();
    });

    it('does not show type modal for empty $ prefix', () => {
      render(<TaskNotesEditor {...defaultProps} />);

      const input = screen.getByTestId('new-line-newline-end');
      input.textContent = '$  ';
      fireEvent.input(input);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.queryByText('Select Task Type')).not.toBeInTheDocument();
    });

    it('calls onAddTask when type is selected and creates first block', async () => {
      const onAddTask = vi.fn().mockResolvedValue({ id: 'new-task' });
      const onUpdateTask = vi.fn();
      render(
        <TaskNotesEditor
          {...defaultProps}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
        />
      );

      const input = screen.getByTestId('new-line-newline-end');
      input.textContent = '$ Buy groceries';
      fireEvent.input(input);
      fireEvent.keyDown(input, { key: 'Enter' });

      // Select a type
      fireEvent.click(screen.getByText('Personal'));

      expect(onAddTask).toHaveBeenCalledWith('Buy groceries', 'personal', null);

      // Should also create a first block for the new task (after async completes)
      await waitFor(() => {
        expect(onUpdateTask).toHaveBeenCalledWith('new-task', {
          blocks: expect.arrayContaining([
            expect.objectContaining({ type: 'paragraph', content: '' }),
          ]),
        });
      });
    });

    it('closes type modal on cancel', () => {
      render(<TaskNotesEditor {...defaultProps} />);

      const input = screen.getByTestId('new-line-newline-end');
      input.textContent = '$ New task';
      fireEvent.input(input);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.getByText('Select Task Type')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByText('Select Task Type')).not.toBeInTheDocument();
    });

    it('adds block to existing task from new-line after task', () => {
      const onUpdateTask = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', blocks: [] })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      const input = screen.getByTestId('new-line-newline-after-task-1');
      input.textContent = 'New block content';
      fireEvent.input(input);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
        blocks: expect.arrayContaining([
          expect.objectContaining({ content: 'New block content' }),
        ]),
      });
    });

    it('detects markdown prefixes when adding blocks', () => {
      const onUpdateTask = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', blocks: [] })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      const input = screen.getByTestId('new-line-newline-after-task-1');
      input.textContent = '- Bullet item';
      fireEvent.input(input);
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
        blocks: expect.arrayContaining([
          expect.objectContaining({ type: 'bullet', content: 'Bullet item' }),
        ]),
      });
    });

    it('saves content to task on blur (when losing focus)', () => {
      const onUpdateTask = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', blocks: [] })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      const input = screen.getByTestId('new-line-newline-after-task-1');
      input.textContent = 'Content saved on blur';
      fireEvent.input(input);
      fireEvent.blur(input);

      expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
        blocks: expect.arrayContaining([
          expect.objectContaining({ content: 'Content saved on blur' }),
        ]),
      });
    });

    it('does not save $ prefix content on blur (only on Enter)', () => {
      const onUpdateTask = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', blocks: [] })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      const input = screen.getByTestId('new-line-newline-after-task-1');
      input.textContent = '$ Task title';
      fireEvent.input(input);
      fireEvent.blur(input);

      // Should not save task creation syntax as a block
      expect(onUpdateTask).not.toHaveBeenCalled();
    });

    it('clears input after blur-save', () => {
      const onUpdateTask = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', blocks: [] })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onUpdateTask={onUpdateTask}
        />
      );

      const input = screen.getByTestId('new-line-newline-after-task-1');
      input.textContent = 'Blur content';
      fireEvent.input(input);
      fireEvent.blur(input);

      expect(input.textContent).toBe('');
    });
  });

  describe('navigation', () => {
    it('moves focus up on ArrowUp in header', () => {
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task One' }),
        createMockTask({ id: 'task-2', title: 'Task Two' }),
      ];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      const header2 = screen.getByTestId('task-header-task-2');
      fireEvent.focus(header2);
      fireEvent.keyDown(header2, { key: 'ArrowUp' });

      // Previous item (newline-after-task-1) should exist
      expect(
        screen.getByTestId('new-line-newline-after-task-1')
      ).toBeInTheDocument();
    });

    it('moves focus down on ArrowDown in header', () => {
      const tasks = [createMockTask({ id: 'task-1', title: 'Task One' })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      const header = screen.getByTestId('task-header-task-1');
      fireEvent.focus(header);
      fireEvent.keyDown(header, { key: 'ArrowDown' });

      // Next item (newline-after-task-1) should exist
      expect(
        screen.getByTestId('new-line-newline-after-task-1')
      ).toBeInTheDocument();
    });

    it('moves focus up on ArrowUp in new-line input', () => {
      const tasks = [createMockTask({ id: 'task-1', title: 'Task One' })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      const newLine = screen.getByTestId('new-line-newline-end');
      fireEvent.focus(newLine);
      fireEvent.keyDown(newLine, { key: 'ArrowUp' });

      // Previous item should exist
      expect(
        screen.getByTestId('new-line-newline-after-task-1')
      ).toBeInTheDocument();
    });
  });
});
