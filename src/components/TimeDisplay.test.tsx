import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TimeDisplay } from './TimeDisplay';

describe('TimeDisplay', () => {
  const defaultProps = {
    elapsedMs: 0,
    totalCompletedMs: 0,
    estimateMinutes: 60,
    isActive: false,
  };

  it('displays formatted time and estimate', () => {
    render(<TimeDisplay {...defaultProps} totalCompletedMs={1800000} />); // 30 minutes
    expect(screen.getByRole('button')).toHaveTextContent('30m / 1h (50%)');
  });

  it('displays percentage of estimated time', () => {
    render(<TimeDisplay {...defaultProps} totalCompletedMs={900000} />); // 15 minutes of 60 = 25%
    expect(screen.getByRole('button')).toHaveTextContent('(25%)');
  });

  it('rounds percentage to nearest integer', () => {
    render(<TimeDisplay {...defaultProps} totalCompletedMs={600000} />); // 10 minutes of 60 = 16.67%
    expect(screen.getByRole('button')).toHaveTextContent('(17%)');
  });

  it('shows 0% when no time logged', () => {
    render(<TimeDisplay {...defaultProps} />);
    expect(screen.getByRole('button')).toHaveTextContent('(0%)');
  });

  it('shows percentage over 100% when over estimate', () => {
    render(<TimeDisplay {...defaultProps} totalCompletedMs={4500000} />); // 75 minutes of 60 = 125%
    expect(screen.getByRole('button')).toHaveTextContent('(125%)');
  });

  it('combines elapsed and completed time for total', () => {
    render(
      <TimeDisplay
        {...defaultProps}
        elapsedMs={900000}
        totalCompletedMs={900000}
      />
    ); // 15m elapsed + 15m completed = 30m
    expect(screen.getByRole('button')).toHaveTextContent('30m / 1h (50%)');
  });

  it('applies red text when over estimate', () => {
    render(<TimeDisplay {...defaultProps} totalCompletedMs={3900000} />); // 65 minutes > 60
    expect(screen.getByRole('button').querySelector('span')).toHaveClass(
      'text-red-500'
    );
  });

  it('applies muted text when under estimate', () => {
    render(<TimeDisplay {...defaultProps} totalCompletedMs={1800000} />); // 30 minutes < 60
    expect(screen.getByRole('button').querySelector('span')).toHaveClass(
      'text-muted'
    );
  });

  it('shows active indicator when timer is running', () => {
    render(<TimeDisplay {...defaultProps} isActive={true} />);
    expect(screen.getByTitle('Timer active')).toBeInTheDocument();
  });

  it('hides active indicator when timer is not running', () => {
    render(<TimeDisplay {...defaultProps} isActive={false} />);
    expect(screen.queryByTitle('Timer active')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<TimeDisplay {...defaultProps} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('formats hours and minutes correctly', () => {
    render(
      <TimeDisplay
        {...defaultProps}
        totalCompletedMs={8100000}
        estimateMinutes={180}
      />
    ); // 2h 15m / 3h
    expect(screen.getByRole('button')).toHaveTextContent('2h 15m / 3h (75%)');
  });

  it('formats hours without minutes when exact', () => {
    render(
      <TimeDisplay
        {...defaultProps}
        totalCompletedMs={7200000}
        estimateMinutes={120}
      />
    ); // 2h / 2h
    expect(screen.getByRole('button')).toHaveTextContent('2h / 2h (100%)');
  });

  it('hides percentage when estimateMinutes is 0', () => {
    render(
      <TimeDisplay
        {...defaultProps}
        totalCompletedMs={1800000}
        estimateMinutes={0}
      />
    ); // 30m / 0m - no percentage
    expect(screen.getByRole('button')).toHaveTextContent('30m / 0m');
    expect(screen.getByRole('button')).not.toHaveTextContent('%');
  });
});
