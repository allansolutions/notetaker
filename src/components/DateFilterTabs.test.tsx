import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateFilterTabs } from './DateFilterTabs';
import { DateFilterPreset } from '../types';

describe('DateFilterTabs', () => {
  const defaultProps = {
    activePreset: 'all' as DateFilterPreset,
    onPresetChange: vi.fn(),
  };

  it('renders all preset tabs', () => {
    render(<DateFilterTabs {...defaultProps} />);

    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tomorrow/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /this week/i })).toBeInTheDocument();
  });

  it('marks active preset with aria-selected', () => {
    render(<DateFilterTabs {...defaultProps} activePreset="today" />);

    expect(screen.getByRole('tab', { name: /all/i })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByRole('tab', { name: /today/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('calls onPresetChange when clicking a tab', () => {
    const onPresetChange = vi.fn();
    render(
      <DateFilterTabs {...defaultProps} onPresetChange={onPresetChange} />
    );

    fireEvent.click(screen.getByRole('tab', { name: /tomorrow/i }));

    expect(onPresetChange).toHaveBeenCalledWith('tomorrow');
  });

  it('applies active styling to selected tab', () => {
    render(<DateFilterTabs {...defaultProps} activePreset="this-week" />);

    const activeTab = screen.getByRole('tab', { name: /this week/i });
    expect(activeTab).toHaveClass('bg-primary/10');
    expect(activeTab).toHaveClass('text-primary');
    expect(activeTab).toHaveClass('font-medium');
  });

  it('applies inactive styling to unselected tabs', () => {
    render(<DateFilterTabs {...defaultProps} activePreset="all" />);

    const inactiveTab = screen.getByRole('tab', { name: /today/i });
    expect(inactiveTab).toHaveClass('text-muted');
    expect(inactiveTab).not.toHaveClass('bg-primary/10');
  });

  it('renders with tablist role for accessibility', () => {
    render(<DateFilterTabs {...defaultProps} />);

    expect(
      screen.getByRole('tablist', { name: /filter tasks by date/i })
    ).toBeInTheDocument();
  });

  describe('with counts', () => {
    const counts: Record<DateFilterPreset, number> = {
      all: 10,
      today: 3,
      tomorrow: 2,
      'this-week': 7,
    };

    it('displays counts next to tab labels', () => {
      render(<DateFilterTabs {...defaultProps} counts={counts} />);

      expect(screen.getByText('(10)')).toBeInTheDocument();
      expect(screen.getByText('(3)')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
      expect(screen.getByText('(7)')).toBeInTheDocument();
    });

    it('displays count of 0', () => {
      const zeroCount: Record<DateFilterPreset, number> = {
        all: 0,
        today: 0,
        tomorrow: 0,
        'this-week': 0,
      };
      render(<DateFilterTabs {...defaultProps} counts={zeroCount} />);

      const zeros = screen.getAllByText('(0)');
      expect(zeros).toHaveLength(4);
    });

    it('does not display counts when counts prop is undefined', () => {
      render(<DateFilterTabs {...defaultProps} />);

      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  it('handles clicking already active tab', () => {
    const onPresetChange = vi.fn();
    render(
      <DateFilterTabs
        {...defaultProps}
        activePreset="today"
        onPresetChange={onPresetChange}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /today/i }));

    expect(onPresetChange).toHaveBeenCalledWith('today');
  });
});
