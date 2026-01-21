import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateFilterTitle } from './DateFilterTitle';

describe('DateFilterTitle', () => {
  beforeEach(() => {
    // Mock date to Wednesday, 21 January 2025
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 21, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when preset is "all"', () => {
    const { container } = render(<DateFilterTitle preset="all" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows today\'s date when preset is "today"', () => {
    render(<DateFilterTitle preset="today" />);
    expect(screen.getByText('Tuesday 21 January 2025')).toBeInTheDocument();
  });

  it('shows tomorrow\'s date when preset is "tomorrow"', () => {
    render(<DateFilterTitle preset="tomorrow" />);
    expect(screen.getByText('Wednesday 22 January 2025')).toBeInTheDocument();
  });

  it('shows week range when preset is "this-week"', () => {
    render(<DateFilterTitle preset="this-week" />);
    // Week of Jan 21, 2025 is Monday Jan 20 to Sunday Jan 26
    expect(
      screen.getByText('Monday 20 January 2025 – Sunday 26 January 2025')
    ).toBeInTheDocument();
  });

  it('shows specific date when preset is "specific-date" with date provided', () => {
    const specificDate = new Date(2025, 2, 15).getTime(); // March 15, 2025
    render(
      <DateFilterTitle preset="specific-date" specificDate={specificDate} />
    );
    expect(screen.getByText('Saturday 15 March 2025')).toBeInTheDocument();
  });

  it('shows "Today" prefix when specific-date matches today', () => {
    const specificDate = new Date(2025, 0, 21).getTime(); // Jan 21, 2025 (same as mocked today)
    render(
      <DateFilterTitle preset="specific-date" specificDate={specificDate} />
    );
    expect(
      screen.getByText('Today – Tuesday 21 January 2025')
    ).toBeInTheDocument();
  });

  it('shows "Yesterday" prefix when specific-date matches yesterday', () => {
    const specificDate = new Date(2025, 0, 20).getTime(); // Jan 20, 2025 (yesterday)
    render(
      <DateFilterTitle preset="specific-date" specificDate={specificDate} />
    );
    expect(
      screen.getByText('Yesterday – Monday 20 January 2025')
    ).toBeInTheDocument();
  });

  it('shows "Tomorrow" prefix when specific-date matches tomorrow', () => {
    const specificDate = new Date(2025, 0, 22).getTime(); // Jan 22, 2025 (tomorrow)
    render(
      <DateFilterTitle preset="specific-date" specificDate={specificDate} />
    );
    expect(
      screen.getByText('Tomorrow – Wednesday 22 January 2025')
    ).toBeInTheDocument();
  });

  it('returns null when preset is "specific-date" but no date provided', () => {
    const { container } = render(
      <DateFilterTitle preset="specific-date" specificDate={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows date range when preset is "date-range" with range provided', () => {
    const dateRange = {
      start: new Date(2025, 1, 1).getTime(), // Feb 1, 2025
      end: new Date(2025, 1, 14).getTime(), // Feb 14, 2025
    };
    render(<DateFilterTitle preset="date-range" dateRange={dateRange} />);
    expect(
      screen.getByText('Saturday 1 February 2025 – Friday 14 February 2025')
    ).toBeInTheDocument();
  });

  it('returns null when preset is "date-range" but no range provided', () => {
    const { container } = render(
      <DateFilterTitle preset="date-range" dateRange={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders with correct styling', () => {
    render(<DateFilterTitle preset="today" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-primary');
  });

  it('wraps content in a centered container', () => {
    render(<DateFilterTitle preset="today" />);
    const container = screen.getByRole('heading', { level: 2 }).parentElement;
    expect(container).toHaveClass('text-center');
  });
});
