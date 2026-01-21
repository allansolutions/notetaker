import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
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
    it('renders empty state with no tasks', () => {
      render(<TaskNotesEditor {...defaultProps} />);
      // No tasks means no content rendered
      expect(document.querySelector('.w-full')).toBeInTheDocument();
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

  describe('task creation from last block', () => {
    it('shows type modal when typing $ prefix and pressing Enter in last block', () => {
      const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      // Find the last block (which is also the only block)
      const blockInput = document.querySelector('.block-input');
      blockInput!.textContent = '$ New task';
      fireEvent.keyDown(blockInput!, { key: 'Enter' });

      expect(screen.getByText('Select Task Type')).toBeInTheDocument();
    });

    it('does not show type modal for regular text in last block', () => {
      const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      const blockInput = document.querySelector('.block-input');
      blockInput!.textContent = 'Regular text';
      fireEvent.keyDown(blockInput!, { key: 'Enter' });

      expect(screen.queryByText('Select Task Type')).not.toBeInTheDocument();
    });

    it('does not show type modal for empty $ prefix', () => {
      const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      const blockInput = document.querySelector('.block-input');
      blockInput!.textContent = '$  ';
      fireEvent.keyDown(blockInput!, { key: 'Enter' });

      expect(screen.queryByText('Select Task Type')).not.toBeInTheDocument();
    });

    it('does not trigger task creation from non-last block', () => {
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: '' },
        { id: 'b2', type: 'paragraph', content: '' },
      ];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      // Find the first block (not the last)
      const blockInputs = document.querySelectorAll('.block-input');
      const firstBlockInput = blockInputs[0];
      firstBlockInput.textContent = '$ Task from first block';
      fireEvent.keyDown(firstBlockInput, { key: 'Enter' });

      // Should NOT show type modal
      expect(screen.queryByText('Select Task Type')).not.toBeInTheDocument();
    });

    it('calls onAddTask when type is selected and creates first block', async () => {
      const onAddTask = vi.fn().mockResolvedValue({ id: 'new-task' });
      const onUpdateTask = vi.fn();
      const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
        />
      );

      const blockInput = document.querySelector('.block-input');
      blockInput!.textContent = '$ Buy groceries';
      fireEvent.keyDown(blockInput!, { key: 'Enter' });

      // Select a type
      fireEvent.click(screen.getByText('Personal'));

      // Should insert after task-1
      expect(onAddTask).toHaveBeenCalledWith(
        'Buy groceries',
        'personal',
        'task-1'
      );

      // Should also create a first block for the new task (after async completes)
      await waitFor(() => {
        expect(onUpdateTask).toHaveBeenCalledWith('new-task', {
          blocks: expect.arrayContaining([
            expect.objectContaining({ type: 'paragraph', content: '' }),
          ]),
        });
      });
    });

    it('clears last block content after task creation', async () => {
      const onAddTask = vi.fn().mockResolvedValue({ id: 'new-task' });
      const onUpdateTask = vi.fn();
      const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
        />
      );

      const blockInput = document.querySelector('.block-input');
      blockInput!.textContent = '$ New Task';
      fireEvent.keyDown(blockInput!, { key: 'Enter' });

      // The block should be cleared
      expect(onUpdateTask).toHaveBeenCalledWith('task-1', {
        blocks: [{ id: 'b1', type: 'paragraph', content: '' }],
      });
    });

    it('closes type modal on cancel', () => {
      const blocks: Block[] = [{ id: 'b1', type: 'paragraph', content: '' }];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      const blockInput = document.querySelector('.block-input');
      blockInput!.textContent = '$ New task';
      fireEvent.keyDown(blockInput!, { key: 'Enter' });

      expect(screen.getByText('Select Task Type')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByText('Select Task Type')).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('moves focus up on ArrowUp in header', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Task One',
          blocks: [{ id: 'b1', type: 'paragraph', content: 'Block 1' }],
        }),
        createMockTask({ id: 'task-2', title: 'Task Two' }),
      ];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      const header2 = screen.getByTestId('task-header-task-2');
      fireEvent.focus(header2);
      fireEvent.keyDown(header2, { key: 'ArrowUp' });

      // Should have moved focus up (to Block 1 content)
      expect(screen.getByText('Block 1')).toBeInTheDocument();
    });

    it('moves focus down on ArrowDown in header', () => {
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'First block' },
      ];
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task One', blocks }),
      ];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      const header = screen.getByTestId('task-header-task-1');
      fireEvent.focus(header);
      fireEvent.keyDown(header, { key: 'ArrowDown' });

      // First block should exist
      expect(screen.getByText('First block')).toBeInTheDocument();
    });
  });

  describe('onFocusedTaskChange callback', () => {
    it('calls onFocusedTaskChange with task id when focusing a block', () => {
      const onFocusedTaskChange = vi.fn();
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'Block content' },
      ];
      const tasks = [createMockTask({ id: 'task-1', blocks })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onFocusedTaskChange={onFocusedTaskChange}
        />
      );

      fireEvent.focus(screen.getByText('Block content'));

      expect(onFocusedTaskChange).toHaveBeenCalledWith('task-1');
    });

    it('calls onFocusedTaskChange with task id when focusing a header', () => {
      const onFocusedTaskChange = vi.fn();
      const tasks = [createMockTask({ id: 'task-1', title: 'My Task' })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onFocusedTaskChange={onFocusedTaskChange}
        />
      );

      const header = screen.getByTestId('task-header-task-1');
      fireEvent.focus(header);

      expect(onFocusedTaskChange).toHaveBeenCalledWith('task-1');
    });

    it('calls onFocusedTaskChange with new task id when switching tasks', () => {
      const onFocusedTaskChange = vi.fn();
      const blocks1: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'Task 1 content' },
      ];
      const blocks2: Block[] = [
        { id: 'b2', type: 'paragraph', content: 'Task 2 content' },
      ];
      const tasks = [
        createMockTask({ id: 'task-1', blocks: blocks1 }),
        createMockTask({ id: 'task-2', blocks: blocks2 }),
      ];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onFocusedTaskChange={onFocusedTaskChange}
        />
      );

      fireEvent.focus(screen.getByText('Task 1 content'));
      expect(onFocusedTaskChange).toHaveBeenLastCalledWith('task-1');

      fireEvent.focus(screen.getByText('Task 2 content'));
      expect(onFocusedTaskChange).toHaveBeenLastCalledWith('task-2');
    });

    it('calls onFocusedTaskChange with null initially', () => {
      const onFocusedTaskChange = vi.fn();
      const tasks = [createMockTask({ id: 'task-1' })];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onFocusedTaskChange={onFocusedTaskChange}
        />
      );

      // Should be called with null on mount (no focus)
      expect(onFocusedTaskChange).toHaveBeenCalledWith(null);
    });
  });

  describe('time tracking', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows time display only for currently tracking task', () => {
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'Block content' },
      ];
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Task One',
          blocks,
          estimate: 30,
        }),
      ];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      // Time display should NOT be visible initially (no tracking)
      expect(
        screen.queryByTestId('time-display-task-1')
      ).not.toBeInTheDocument();

      // Focus on the block to start tracking
      fireEvent.focus(screen.getByText('Block content'));

      // Now time display should be visible
      const timeDisplay = screen.getByTestId('time-display-task-1');
      expect(timeDisplay).toBeInTheDocument();
      expect(timeDisplay).toHaveTextContent('0m / 30m');
    });

    it('does not show time display for task without estimate', () => {
      const blocks: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'Block content' },
      ];
      const tasks = [
        createMockTask({ id: 'task-1', title: 'Task One', blocks }), // No estimate
      ];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      // Focus on the block
      fireEvent.focus(screen.getByText('Block content'));

      // Should NOT show time display (no estimate)
      expect(
        screen.queryByTestId('time-display-task-1')
      ).not.toBeInTheDocument();
    });

    it('moves time display when switching between tasks', () => {
      const blocks1: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'Task 1 block' },
      ];
      const blocks2: Block[] = [
        { id: 'b2', type: 'paragraph', content: 'Task 2 block' },
      ];
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Task One',
          blocks: blocks1,
          estimate: 30,
        }),
        createMockTask({
          id: 'task-2',
          title: 'Task Two',
          blocks: blocks2,
          estimate: 60,
        }),
      ];
      render(<TaskNotesEditor {...defaultProps} tasks={tasks} />);

      // Focus on task 1's block
      fireEvent.focus(screen.getByText('Task 1 block'));

      // Only task 1 should show time display
      expect(screen.getByTestId('time-display-task-1')).toBeInTheDocument();
      expect(
        screen.queryByTestId('time-display-task-2')
      ).not.toBeInTheDocument();

      // Switch to task 2's block
      fireEvent.focus(screen.getByText('Task 2 block'));

      // Now only task 2 should show time display
      expect(
        screen.queryByTestId('time-display-task-1')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('time-display-task-2')).toBeInTheDocument();
    });

    it('calls onAddSession when switching tasks after minimum duration', async () => {
      const onAddSession = vi.fn();
      const blocks1: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'Task 1 block' },
      ];
      const blocks2: Block[] = [
        { id: 'b2', type: 'paragraph', content: 'Task 2 block' },
      ];
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Task One',
          blocks: blocks1,
          estimate: 30,
        }),
        createMockTask({
          id: 'task-2',
          title: 'Task Two',
          blocks: blocks2,
          estimate: 30,
        }),
      ];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onAddSession={onAddSession}
        />
      );

      // Focus on task 1's block
      fireEvent.focus(screen.getByText('Task 1 block'));

      // Advance time by more than 1 minute
      await act(async () => {
        vi.advanceTimersByTime(70000); // 70 seconds
      });

      // Switch to task 2's block
      fireEvent.focus(screen.getByText('Task 2 block'));

      // Should have called onAddSession for task 1
      expect(onAddSession).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        })
      );
    });

    it('does not call onAddSession for short sessions', async () => {
      const onAddSession = vi.fn();
      const blocks1: Block[] = [
        { id: 'b1', type: 'paragraph', content: 'Task 1 block' },
      ];
      const blocks2: Block[] = [
        { id: 'b2', type: 'paragraph', content: 'Task 2 block' },
      ];
      const tasks = [
        createMockTask({
          id: 'task-1',
          title: 'Task One',
          blocks: blocks1,
          estimate: 30,
        }),
        createMockTask({
          id: 'task-2',
          title: 'Task Two',
          blocks: blocks2,
          estimate: 30,
        }),
      ];
      render(
        <TaskNotesEditor
          {...defaultProps}
          tasks={tasks}
          onAddSession={onAddSession}
        />
      );

      // Focus on task 1's block
      fireEvent.focus(screen.getByText('Task 1 block'));

      // Advance time by less than 1 minute
      await act(async () => {
        vi.advanceTimersByTime(30000); // 30 seconds
      });

      // Switch to task 2's block
      fireEvent.focus(screen.getByText('Task 2 block'));

      // Should NOT have called onAddSession (session too short)
      expect(onAddSession).not.toHaveBeenCalled();
    });
  });
});
