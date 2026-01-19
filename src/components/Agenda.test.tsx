import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Agenda, snapToGrid, SNAP_GRID_SIZE } from './Agenda';
import { Task } from '../types';

const createTask = (
  id: string,
  title: string,
  scheduled?: boolean,
  startTime?: number,
  duration?: number
): Task => ({
  id,
  type: 'admin',
  title,
  status: 'todo',
  importance: 'mid',
  blocks: [],
  scheduled,
  startTime,
  duration,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

describe('Agenda', () => {
  const defaultProps = {
    tasks: [] as Task[],
    onUpdateTask: vi.fn(),
  };

  it('renders hour markers from 6:00 AM to 10:00 PM', () => {
    render(<Agenda {...defaultProps} />);

    expect(screen.getByText('6:00 AM')).toBeInTheDocument();
    expect(screen.getByText('12:00 PM')).toBeInTheDocument();
    expect(screen.getByText('10:00 PM')).toBeInTheDocument();
  });

  it('does not render tasks that are not scheduled', () => {
    const tasks = [
      createTask('1', 'Unscheduled task', false),
      createTask('2', 'Another task'),
    ];
    render(<Agenda {...defaultProps} tasks={tasks} />);

    expect(screen.queryByTestId('agenda-block-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenda-block-2')).not.toBeInTheDocument();
  });

  it('renders scheduled tasks', () => {
    const tasks = [createTask('1', 'Scheduled task', true, 540, 60)]; // 9:00 AM
    render(<Agenda {...defaultProps} tasks={tasks} />);

    expect(screen.getByTestId('agenda-block-1')).toBeInTheDocument();
    expect(screen.getByText('Scheduled task')).toBeInTheDocument();
  });

  it('positions task based on startTime', () => {
    const tasks = [createTask('1', 'Morning task', true, 480, 60)]; // 8:00 AM (2 hours after agenda start)
    render(<Agenda {...defaultProps} tasks={tasks} />);

    const block = screen.getByTestId('agenda-block-1');
    // 2 hours * 48px per hour = 96px
    expect(block.style.top).toBe('96px');
  });

  it('sizes task based on duration', () => {
    const tasks = [createTask('1', 'Long task', true, 540, 120)]; // 2 hours
    render(<Agenda {...defaultProps} tasks={tasks} />);

    const block = screen.getByTestId('agenda-block-1');
    // 2 hours * 48px per hour = 96px
    expect(block.style.height).toBe('96px');
  });

  it('shows "Untitled" for tasks with empty title', () => {
    const tasks = [createTask('1', '', true, 540, 60)];
    render(<Agenda {...defaultProps} tasks={tasks} />);

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('has a resize handle on each task', () => {
    const tasks = [createTask('1', 'Task', true, 540, 60)];
    render(<Agenda {...defaultProps} tasks={tasks} />);

    expect(screen.getByTestId('agenda-block-resize-1')).toBeInTheDocument();
  });

  it('does not render task when startTime is undefined', () => {
    const tasks = [createTask('1', 'Task', true)]; // no startTime
    render(<Agenda {...defaultProps} tasks={tasks} />);

    expect(screen.queryByTestId('agenda-block-1')).not.toBeInTheDocument();
  });
});

describe('snapToGrid modifier', () => {
  it('has correct grid size for 15-minute intervals', () => {
    // 15 minutes / 60 * 48px per hour = 12 pixels
    expect(SNAP_GRID_SIZE).toBe(12);
  });

  it('snaps transform to nearest grid position', () => {
    const args = {
      transform: { x: 0, y: 25, scaleX: 1, scaleY: 1 },
      activatorEvent: null,
      active: null,
      activeNodeRect: null,
      containerNodeRect: null,
      draggingNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      windowRect: null,
    };

    const result = snapToGrid(args as Parameters<typeof snapToGrid>[0]);

    // 25px should snap to 24px (2 grid units * 12px)
    expect(result.y).toBe(24);
    expect(result.x).toBe(0);
  });

  it('snaps down when closer to lower grid line', () => {
    const args = {
      transform: { x: 0, y: 5, scaleX: 1, scaleY: 1 },
      activatorEvent: null,
      active: null,
      activeNodeRect: null,
      containerNodeRect: null,
      draggingNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      windowRect: null,
    };

    const result = snapToGrid(args as Parameters<typeof snapToGrid>[0]);

    // 5px should snap to 0px (closest grid line)
    expect(result.y).toBe(0);
  });

  it('snaps up when closer to upper grid line', () => {
    const args = {
      transform: { x: 0, y: 7, scaleX: 1, scaleY: 1 },
      activatorEvent: null,
      active: null,
      activeNodeRect: null,
      containerNodeRect: null,
      draggingNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      windowRect: null,
    };

    const result = snapToGrid(args as Parameters<typeof snapToGrid>[0]);

    // 7px should snap to 12px (1 grid unit * 12px)
    expect(result.y).toBe(12);
  });

  it('handles negative transforms', () => {
    const args = {
      transform: { x: 0, y: -25, scaleX: 1, scaleY: 1 },
      activatorEvent: null,
      active: null,
      activeNodeRect: null,
      containerNodeRect: null,
      draggingNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      windowRect: null,
    };

    const result = snapToGrid(args as Parameters<typeof snapToGrid>[0]);

    // -25px should snap to -24px
    expect(result.y).toBe(-24);
  });

  it('preserves scale values', () => {
    const args = {
      transform: { x: 5, y: 10, scaleX: 1.5, scaleY: 2 },
      activatorEvent: null,
      active: null,
      activeNodeRect: null,
      containerNodeRect: null,
      draggingNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      windowRect: null,
    };

    const result = snapToGrid(args as Parameters<typeof snapToGrid>[0]);

    expect(result.scaleX).toBe(1.5);
    expect(result.scaleY).toBe(2);
  });
});

describe('AgendaBlock resize', () => {
  const defaultProps = {
    tasks: [] as Task[],
    onUpdateTask: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('changes duration with keyboard arrow keys', () => {
    const tasks = [createTask('1', 'Task', true, 540, 60)];
    const onUpdateTask = vi.fn();
    render(
      <Agenda {...defaultProps} tasks={tasks} onUpdateTask={onUpdateTask} />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Press ArrowDown to increase duration
    fireEvent.keyDown(resizeHandle, { key: 'ArrowDown' });

    expect(onUpdateTask).toHaveBeenCalledWith('1', { duration: 75 }); // 60 + 15 minutes
  });

  it('decreases duration with ArrowUp key', () => {
    const tasks = [createTask('1', 'Task', true, 540, 60)];
    const onUpdateTask = vi.fn();
    render(
      <Agenda {...defaultProps} tasks={tasks} onUpdateTask={onUpdateTask} />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Press ArrowUp to decrease duration
    fireEvent.keyDown(resizeHandle, { key: 'ArrowUp' });

    expect(onUpdateTask).toHaveBeenCalledWith('1', { duration: 45 }); // 60 - 15 minutes
  });

  it('respects minimum duration when decreasing', () => {
    const tasks = [createTask('1', 'Task', true, 540, 15)]; // Already at minimum
    const onUpdateTask = vi.fn();
    render(
      <Agenda {...defaultProps} tasks={tasks} onUpdateTask={onUpdateTask} />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Try to decrease below minimum
    fireEvent.keyDown(resizeHandle, { key: 'ArrowUp' });

    expect(onUpdateTask).toHaveBeenCalledWith('1', { duration: 15 }); // Should stay at minimum
  });

  it('ignores non-arrow keys', () => {
    const tasks = [createTask('1', 'Task', true, 540, 60)];
    const onUpdateTask = vi.fn();
    render(
      <Agenda {...defaultProps} tasks={tasks} onUpdateTask={onUpdateTask} />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Press a non-arrow key
    fireEvent.keyDown(resizeHandle, { key: 'Enter' });

    expect(onUpdateTask).not.toHaveBeenCalled();
  });

  it('updates duration on mouse drag resize', () => {
    const tasks = [createTask('1', 'Task', true, 540, 60)];
    const onUpdateTask = vi.fn();
    render(
      <Agenda {...defaultProps} tasks={tasks} onUpdateTask={onUpdateTask} />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Start resize
    fireEvent.mouseDown(resizeHandle, { clientY: 100 });

    // Move mouse down by 24 pixels (30 minutes worth at 48px/hour)
    fireEvent.mouseMove(document, { clientY: 124 });

    expect(onUpdateTask).toHaveBeenCalledWith('1', { duration: 90 }); // 60 + 30 minutes (snapped)
  });

  it('stops resize on mouse up', () => {
    const tasks = [createTask('1', 'Task', true, 540, 60)];
    const onUpdateTask = vi.fn();
    render(
      <Agenda {...defaultProps} tasks={tasks} onUpdateTask={onUpdateTask} />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Start resize
    fireEvent.mouseDown(resizeHandle, { clientY: 100 });

    // Move mouse
    fireEvent.mouseMove(document, { clientY: 124 });
    onUpdateTask.mockClear();

    // Release mouse
    fireEvent.mouseUp(document);

    // Moving after mouseUp should not trigger updates
    fireEvent.mouseMove(document, { clientY: 150 });

    expect(onUpdateTask).not.toHaveBeenCalled();
  });
});

describe('CurrentTimeLine', () => {
  const timeLineProps = {
    tasks: [] as Task[],
    onUpdateTask: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders current time line when within agenda hours', () => {
    vi.setSystemTime(new Date('2024-01-15T10:30:00'));
    render(<Agenda {...timeLineProps} />);

    expect(screen.getByTestId('current-time-line')).toBeInTheDocument();
  });

  it('does not render current time line before agenda hours', () => {
    vi.setSystemTime(new Date('2024-01-15T05:00:00'));
    render(<Agenda {...timeLineProps} />);

    expect(screen.queryByTestId('current-time-line')).not.toBeInTheDocument();
  });

  it('does not render current time line after agenda hours', () => {
    vi.setSystemTime(new Date('2024-01-15T23:30:00'));
    render(<Agenda {...timeLineProps} />);

    expect(screen.queryByTestId('current-time-line')).not.toBeInTheDocument();
  });

  it('positions time line correctly', () => {
    // 10:30 AM = 4.5 hours after 6:00 AM agenda start
    vi.setSystemTime(new Date('2024-01-15T10:30:00'));
    render(<Agenda {...timeLineProps} />);

    const timeLine = screen.getByTestId('current-time-line');
    // 4.5 hours * 48px per hour = 216px
    expect(timeLine.style.top).toBe('216px');
  });
});
