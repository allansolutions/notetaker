import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarEventBlock } from './CalendarEventBlock';
import type { CalendarEvent } from '../types';

describe('CalendarEventBlock', () => {
  const baseEvent: CalendarEvent = {
    id: 'event-1',
    summary: 'Team Meeting',
    startTime: 600, // 10:00 AM
    duration: 60,
    isAllDay: false,
  };

  const hourHeight = 48;

  it('renders event summary', () => {
    render(<CalendarEventBlock event={baseEvent} hourHeight={hourHeight} />);

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('positions block correctly based on start time', () => {
    render(<CalendarEventBlock event={baseEvent} hourHeight={hourHeight} />);

    const block = screen.getByTestId('calendar-event-block');
    // Start at 10:00 (600 min) - Agenda starts at 6:00 (360 min) = 240 min offset
    // 240 min / 60 * 48 = 192 pixels
    expect(block).toHaveStyle({ top: '192px' });
  });

  it('sets height based on duration', () => {
    render(<CalendarEventBlock event={baseEvent} hourHeight={hourHeight} />);

    const block = screen.getByTestId('calendar-event-block');
    // 60 min / 60 * 48 - 2 = 46 pixels (2px gap for adjacent events)
    expect(block).toHaveStyle({ height: '46px' });
  });

  it('enforces minimum height for short events', () => {
    const shortEvent = { ...baseEvent, duration: 5 };
    render(<CalendarEventBlock event={shortEvent} hourHeight={hourHeight} />);

    const block = screen.getByTestId('calendar-event-block');
    // Min duration is 15 min, so height should be 15/60 * 48 - 2 = 10 pixels (2px gap)
    expect(block).toHaveStyle({ height: '10px' });
  });

  it('renders description when provided and block is tall enough', () => {
    const eventWithDesc = {
      ...baseEvent,
      description: 'Weekly sync meeting',
      duration: 60, // 48px, which is > 30
    };
    render(
      <CalendarEventBlock event={eventWithDesc} hourHeight={hourHeight} />
    );

    expect(screen.getByText('Weekly sync meeting')).toBeInTheDocument();
  });

  it('hides description when block is too short', () => {
    const eventWithDesc = {
      ...baseEvent,
      description: 'Weekly sync meeting',
      duration: 30, // 24px, which is < 30
    };
    render(
      <CalendarEventBlock event={eventWithDesc} hourHeight={hourHeight} />
    );

    expect(screen.queryByText('Weekly sync meeting')).not.toBeInTheDocument();
  });

  it('opens link when clicked if htmlLink is provided', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

    const eventWithLink = {
      ...baseEvent,
      htmlLink: 'https://calendar.google.com/event/123',
    };
    render(
      <CalendarEventBlock event={eventWithLink} hourHeight={hourHeight} />
    );

    const block = screen.getByTestId('calendar-event-block');
    await user.click(block);

    expect(mockOpen).toHaveBeenCalledWith(
      'https://calendar.google.com/event/123',
      '_blank',
      'noopener,noreferrer'
    );

    mockOpen.mockRestore();
  });

  it('does not open link when no htmlLink provided', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<CalendarEventBlock event={baseEvent} hourHeight={hourHeight} />);

    const block = screen.getByTestId('calendar-event-block');
    await user.click(block);

    expect(mockOpen).not.toHaveBeenCalled();

    mockOpen.mockRestore();
  });

  it('opens link on Enter key press', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

    const eventWithLink = {
      ...baseEvent,
      htmlLink: 'https://calendar.google.com/event/123',
    };
    render(
      <CalendarEventBlock event={eventWithLink} hourHeight={hourHeight} />
    );

    const block = screen.getByTestId('calendar-event-block');
    block.focus();
    await user.keyboard('{Enter}');

    expect(mockOpen).toHaveBeenCalledWith(
      'https://calendar.google.com/event/123',
      '_blank',
      'noopener,noreferrer'
    );

    mockOpen.mockRestore();
  });

  it('opens link on Space key press', async () => {
    const user = userEvent.setup();
    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => null);

    const eventWithLink = {
      ...baseEvent,
      htmlLink: 'https://calendar.google.com/event/123',
    };
    render(
      <CalendarEventBlock event={eventWithLink} hourHeight={hourHeight} />
    );

    const block = screen.getByTestId('calendar-event-block');
    block.focus();
    await user.keyboard(' ');

    expect(mockOpen).toHaveBeenCalledWith(
      'https://calendar.google.com/event/123',
      '_blank',
      'noopener,noreferrer'
    );

    mockOpen.mockRestore();
  });

  it('has correct z-index for layering behind tasks', () => {
    render(<CalendarEventBlock event={baseEvent} hourHeight={hourHeight} />);

    const block = screen.getByTestId('calendar-event-block');
    expect(block).toHaveStyle({ zIndex: '0' });
  });

  it('has button role when htmlLink is provided', () => {
    const eventWithLink = {
      ...baseEvent,
      htmlLink: 'https://calendar.google.com/event/123',
    };
    render(
      <CalendarEventBlock event={eventWithLink} hourHeight={hourHeight} />
    );

    const block = screen.getByTestId('calendar-event-block');
    expect(block).toHaveAttribute('role', 'button');
    expect(block).toHaveAttribute('tabIndex', '0');
  });

  it('does not have button role when no htmlLink', () => {
    render(<CalendarEventBlock event={baseEvent} hourHeight={hourHeight} />);

    const block = screen.getByTestId('calendar-event-block');
    expect(block).not.toHaveAttribute('role');
    expect(block).not.toHaveAttribute('tabIndex');
  });
});
