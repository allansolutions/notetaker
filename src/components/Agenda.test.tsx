import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Agenda } from './Agenda';
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
