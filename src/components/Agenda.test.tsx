import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Agenda, snapToGrid, SNAP_GRID_SIZE } from './Agenda';
import { Block, TodoMetadata } from '../types';

const createBlock = (
  id: string,
  type: Block['type'],
  content: string
): Block => ({
  id,
  type,
  content,
});

describe('Agenda', () => {
  const defaultProps = {
    blocks: [] as Block[],
    todoMetadata: {} as Record<string, TodoMetadata>,
    onUpdateTodoMetadata: vi.fn(),
  };

  it('renders agenda header', () => {
    render(<Agenda {...defaultProps} />);
    expect(screen.getByText('Agenda')).toBeInTheDocument();
  });

  it('renders hour markers from 6:00 AM to 10:00 PM', () => {
    render(<Agenda {...defaultProps} />);

    expect(screen.getByText('6:00 AM')).toBeInTheDocument();
    expect(screen.getByText('12:00 PM')).toBeInTheDocument();
    expect(screen.getByText('10:00 PM')).toBeInTheDocument();
  });

  it('does not render blocks that are not scheduled', () => {
    const blocks = [
      createBlock('1', 'todo', 'Unscheduled task'),
      createBlock('2', 'todo', 'Another task'),
    ];
    const todoMetadata = {
      '1': { scheduled: false },
      '2': {},
    };
    render(
      <Agenda {...defaultProps} blocks={blocks} todoMetadata={todoMetadata} />
    );

    expect(screen.queryByTestId('agenda-block-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenda-block-2')).not.toBeInTheDocument();
  });

  it('renders scheduled todo blocks', () => {
    const blocks = [createBlock('1', 'todo', 'Scheduled task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 60 }, // 9:00 AM
    };
    render(
      <Agenda {...defaultProps} blocks={blocks} todoMetadata={todoMetadata} />
    );

    expect(screen.getByTestId('agenda-block-1')).toBeInTheDocument();
    expect(screen.getByText('Scheduled task')).toBeInTheDocument();
  });

  it('renders completed todo blocks when scheduled', () => {
    const blocks = [createBlock('1', 'todo-checked', 'Completed task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 600, duration: 30 }, // 10:00 AM
    };
    render(
      <Agenda {...defaultProps} blocks={blocks} todoMetadata={todoMetadata} />
    );

    expect(screen.getByTestId('agenda-block-1')).toBeInTheDocument();
    expect(screen.getByText('Completed task')).toBeInTheDocument();
  });

  it('positions block based on startTime', () => {
    const blocks = [createBlock('1', 'todo', 'Morning task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 480, duration: 60 }, // 8:00 AM (2 hours after agenda start)
    };
    render(
      <Agenda {...defaultProps} blocks={blocks} todoMetadata={todoMetadata} />
    );

    const block = screen.getByTestId('agenda-block-1');
    // 2 hours * 48px per hour = 96px
    expect(block.style.top).toBe('96px');
  });

  it('sizes block based on duration', () => {
    const blocks = [createBlock('1', 'todo', 'Long task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 120 }, // 2 hours
    };
    render(
      <Agenda {...defaultProps} blocks={blocks} todoMetadata={todoMetadata} />
    );

    const block = screen.getByTestId('agenda-block-1');
    // 2 hours * 48px per hour = 96px
    expect(block.style.height).toBe('96px');
  });

  it('shows "Untitled" for blocks with empty content', () => {
    const blocks = [createBlock('1', 'todo', '')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 60 },
    };
    render(
      <Agenda {...defaultProps} blocks={blocks} todoMetadata={todoMetadata} />
    );

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('has a resize handle on each block', () => {
    const blocks = [createBlock('1', 'todo', 'Task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 60 },
    };
    render(
      <Agenda {...defaultProps} blocks={blocks} todoMetadata={todoMetadata} />
    );

    expect(screen.getByTestId('agenda-block-resize-1')).toBeInTheDocument();
  });

  it('does not render block when startTime is undefined', () => {
    const blocks = [createBlock('1', 'todo', 'Task')];
    const todoMetadata = {
      '1': { scheduled: true }, // no startTime
    };
    render(
      <Agenda {...defaultProps} blocks={blocks} todoMetadata={todoMetadata} />
    );

    expect(screen.queryByTestId('agenda-block-1')).not.toBeInTheDocument();
  });

  it('ignores non-todo block types', () => {
    const blocks = [
      createBlock('1', 'paragraph', 'Some text'),
      createBlock('2', 'h1', 'Heading'),
    ];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 60 },
      '2': { scheduled: true, startTime: 600, duration: 60 },
    };
    render(
      <Agenda {...defaultProps} blocks={blocks} todoMetadata={todoMetadata} />
    );

    expect(screen.queryByTestId('agenda-block-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenda-block-2')).not.toBeInTheDocument();
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
    blocks: [] as Block[],
    todoMetadata: {} as Record<string, TodoMetadata>,
    onUpdateTodoMetadata: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('changes duration with keyboard arrow keys', () => {
    const blocks = [createBlock('1', 'todo', 'Task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 60 },
    };
    const onUpdateTodoMetadata = vi.fn();
    render(
      <Agenda
        {...defaultProps}
        blocks={blocks}
        todoMetadata={todoMetadata}
        onUpdateTodoMetadata={onUpdateTodoMetadata}
      />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Press ArrowDown to increase duration
    fireEvent.keyDown(resizeHandle, { key: 'ArrowDown' });

    expect(onUpdateTodoMetadata).toHaveBeenCalledWith('1', {
      scheduled: true,
      startTime: 540,
      duration: 75, // 60 + 15 minutes
    });
  });

  it('decreases duration with ArrowUp key', () => {
    const blocks = [createBlock('1', 'todo', 'Task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 60 },
    };
    const onUpdateTodoMetadata = vi.fn();
    render(
      <Agenda
        {...defaultProps}
        blocks={blocks}
        todoMetadata={todoMetadata}
        onUpdateTodoMetadata={onUpdateTodoMetadata}
      />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Press ArrowUp to decrease duration
    fireEvent.keyDown(resizeHandle, { key: 'ArrowUp' });

    expect(onUpdateTodoMetadata).toHaveBeenCalledWith('1', {
      scheduled: true,
      startTime: 540,
      duration: 45, // 60 - 15 minutes
    });
  });

  it('respects minimum duration when decreasing', () => {
    const blocks = [createBlock('1', 'todo', 'Task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 15 }, // Already at minimum
    };
    const onUpdateTodoMetadata = vi.fn();
    render(
      <Agenda
        {...defaultProps}
        blocks={blocks}
        todoMetadata={todoMetadata}
        onUpdateTodoMetadata={onUpdateTodoMetadata}
      />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Try to decrease below minimum
    fireEvent.keyDown(resizeHandle, { key: 'ArrowUp' });

    expect(onUpdateTodoMetadata).toHaveBeenCalledWith('1', {
      scheduled: true,
      startTime: 540,
      duration: 15, // Should stay at minimum
    });
  });

  it('ignores non-arrow keys', () => {
    const blocks = [createBlock('1', 'todo', 'Task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 60 },
    };
    const onUpdateTodoMetadata = vi.fn();
    render(
      <Agenda
        {...defaultProps}
        blocks={blocks}
        todoMetadata={todoMetadata}
        onUpdateTodoMetadata={onUpdateTodoMetadata}
      />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Press a non-arrow key
    fireEvent.keyDown(resizeHandle, { key: 'Enter' });

    expect(onUpdateTodoMetadata).not.toHaveBeenCalled();
  });

  it('updates duration on mouse drag resize', () => {
    const blocks = [createBlock('1', 'todo', 'Task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 60 },
    };
    const onUpdateTodoMetadata = vi.fn();
    render(
      <Agenda
        {...defaultProps}
        blocks={blocks}
        todoMetadata={todoMetadata}
        onUpdateTodoMetadata={onUpdateTodoMetadata}
      />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Start resize
    fireEvent.mouseDown(resizeHandle, { clientY: 100 });

    // Move mouse down by 24 pixels (30 minutes worth at 48px/hour)
    fireEvent.mouseMove(document, { clientY: 124 });

    expect(onUpdateTodoMetadata).toHaveBeenCalledWith('1', {
      scheduled: true,
      startTime: 540,
      duration: 90, // 60 + 30 minutes (snapped)
    });
  });

  it('stops resize on mouse up', () => {
    const blocks = [createBlock('1', 'todo', 'Task')];
    const todoMetadata = {
      '1': { scheduled: true, startTime: 540, duration: 60 },
    };
    const onUpdateTodoMetadata = vi.fn();
    render(
      <Agenda
        {...defaultProps}
        blocks={blocks}
        todoMetadata={todoMetadata}
        onUpdateTodoMetadata={onUpdateTodoMetadata}
      />
    );

    const resizeHandle = screen.getByTestId('agenda-block-resize-1');

    // Start resize
    fireEvent.mouseDown(resizeHandle, { clientY: 100 });

    // Move mouse
    fireEvent.mouseMove(document, { clientY: 124 });
    onUpdateTodoMetadata.mockClear();

    // Release mouse
    fireEvent.mouseUp(document);

    // Moving after mouseUp should not trigger updates
    fireEvent.mouseMove(document, { clientY: 150 });

    expect(onUpdateTodoMetadata).not.toHaveBeenCalled();
  });
});

describe('CurrentTimeLine', () => {
  const timeLineProps = {
    blocks: [] as Block[],
    todoMetadata: {} as Record<string, TodoMetadata>,
    onUpdateTodoMetadata: vi.fn(),
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
