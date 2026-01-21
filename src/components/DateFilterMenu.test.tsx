import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DateFilterMenu } from './DateFilterMenu';

describe('DateFilterMenu', () => {
  beforeEach(() => {
    // Mock date to Wednesday, 21 January 2025
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 21, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  Object.defineProperty(window.navigator, 'language', {
    value: 'en-GB',
    configurable: true,
  });

  const defaultProps = {
    activePreset: 'all' as const,
    selectedDate: null,
    selectedRange: null,
    onPresetChange: vi.fn(),
    onDateChange: vi.fn(),
    onRangeChange: vi.fn(),
    counts: {
      all: 3,
      today: 1,
      tomorrow: 2,
      'this-week': 4,
    },
  };

  it('renders the date filter trigger', () => {
    render(<DateFilterMenu {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /date: all/i })
    ).toBeInTheDocument();
  });

  it('shows preset options with counts', () => {
    render(<DateFilterMenu {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));

    const allButtons = screen.getAllByRole('button', { name: /all/i });
    const allButton = allButtons.find((button) =>
      button.textContent?.startsWith('All')
    );
    expect(allButton).toBeDefined();
    expect(allButton).toHaveTextContent('3');
    const todayButton = screen.getByRole('button', { name: /today/i });
    expect(todayButton).toHaveTextContent('1');
  });

  it('calls onPresetChange when selecting a preset', () => {
    const onPresetChange = vi.fn();
    render(
      <DateFilterMenu {...defaultProps} onPresetChange={onPresetChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));
    fireEvent.click(screen.getByRole('button', { name: /tomorrow/i }));

    expect(onPresetChange).toHaveBeenCalledWith('tomorrow');
  });

  it('shows specific date label when active', () => {
    render(
      <DateFilterMenu
        {...defaultProps}
        activePreset="specific-date"
        selectedDate={new Date(2025, 0, 10, 12, 0, 0).getTime()}
      />
    );

    expect(
      screen.getByRole('button', { name: /date: 10 jan 2025/i })
    ).toBeInTheDocument();
  });

  it('shows "Today" label when specific-date matches today', () => {
    render(
      <DateFilterMenu
        {...defaultProps}
        activePreset="specific-date"
        selectedDate={new Date(2025, 0, 21, 12, 0, 0).getTime()} // Same as mocked today
      />
    );

    expect(
      screen.getByRole('button', { name: /date: today/i })
    ).toBeInTheDocument();
  });

  it('shows "Yesterday" label when specific-date matches yesterday', () => {
    render(
      <DateFilterMenu
        {...defaultProps}
        activePreset="specific-date"
        selectedDate={new Date(2025, 0, 20, 12, 0, 0).getTime()} // Yesterday
      />
    );

    expect(
      screen.getByRole('button', { name: /date: yesterday/i })
    ).toBeInTheDocument();
  });

  it('shows "Tomorrow" label when specific-date matches tomorrow', () => {
    render(
      <DateFilterMenu
        {...defaultProps}
        activePreset="specific-date"
        selectedDate={new Date(2025, 0, 22, 12, 0, 0).getTime()} // Tomorrow
      />
    );

    expect(
      screen.getByRole('button', { name: /date: tomorrow/i })
    ).toBeInTheDocument();
  });

  it('shows range label when active', () => {
    render(
      <DateFilterMenu
        {...defaultProps}
        activePreset="date-range"
        selectedRange={{
          start: new Date(2025, 0, 10, 12, 0, 0).getTime(),
          end: new Date(2025, 0, 15, 12, 0, 0).getTime(),
        }}
      />
    );

    expect(
      screen.getByRole('button', { name: /date: 10 jan -> 15 jan 2025/i })
    ).toBeInTheDocument();
  });

  it('falls back to All label when date is missing', () => {
    render(
      <DateFilterMenu
        {...defaultProps}
        activePreset="specific-date"
        selectedDate={null}
      />
    );

    expect(
      screen.getByRole('button', { name: /date: all/i })
    ).toBeInTheDocument();
  });

  it('opens the date picker from the menu', () => {
    render(<DateFilterMenu {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose date/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens the range picker from the menu', () => {
    render(<DateFilterMenu {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose range/i }));

    expect(screen.getByText(/choose date range/i)).toBeInTheDocument();
  });

  it('clears filters from the menu', () => {
    const onPresetChange = vi.fn();
    const onDateChange = vi.fn();
    const onRangeChange = vi.fn();
    render(
      <DateFilterMenu
        {...defaultProps}
        onPresetChange={onPresetChange}
        onDateChange={onDateChange}
        onRangeChange={onRangeChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(onPresetChange).toHaveBeenCalledWith('all');
    expect(onDateChange).toHaveBeenCalledWith(null);
    expect(onRangeChange).toHaveBeenCalledWith(null);
  });

  it('calls onDateChange when selecting a date in the picker', () => {
    const onDateChange = vi.fn();
    render(<DateFilterMenu {...defaultProps} onDateChange={onDateChange} />);

    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose date/i }));

    // Click a day button to select a date and trigger onChange
    const dayButton = screen.getByRole('button', { name: /^15$/i });
    fireEvent.click(dayButton);

    expect(onDateChange).toHaveBeenCalled();
  });

  it('clears the date when clicking clear in date picker', () => {
    const onDateChange = vi.fn();
    render(<DateFilterMenu {...defaultProps} onDateChange={onDateChange} />);

    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose date/i }));

    // Click Clear button in DatePickerModal to trigger onChange with null
    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(onDateChange).toHaveBeenCalledWith(null);
  });

  it('closes the date picker modal on cancel', () => {
    render(<DateFilterMenu {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose date/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onRangeChange when applying a range', () => {
    const onRangeChange = vi.fn();
    render(<DateFilterMenu {...defaultProps} onRangeChange={onRangeChange} />);

    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose range/i }));

    // Select start and end dates, then click Apply
    const dayButtons = screen.getAllByRole('button', { name: /^10$/i });
    fireEvent.click(dayButtons[0]); // Start date
    const endDayButtons = screen.getAllByRole('button', { name: /^20$/i });
    fireEvent.click(endDayButtons[endDayButtons.length - 1]); // End date

    const applyButton = screen.getByRole('button', { name: /apply/i });
    fireEvent.click(applyButton);

    expect(onRangeChange).toHaveBeenCalled();
  });

  it('closes the range picker modal on cancel', () => {
    render(<DateFilterMenu {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /date: all/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose range/i }));

    expect(screen.getByText(/choose date range/i)).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByText(/choose date range/i)).not.toBeInTheDocument();
  });
});
