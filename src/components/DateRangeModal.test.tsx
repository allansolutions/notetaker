import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateRangeModal } from './DateRangeModal';

describe('DateRangeModal', () => {
  it('disables apply until both dates selected', () => {
    render(
      <DateRangeModal value={null} onChange={vi.fn()} onClose={vi.fn()} />
    );

    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).toBeDisabled();
  });

  it('allows selecting start and end dates', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <DateRangeModal value={null} onChange={onChange} onClose={onClose} />
    );

    const startButtons = screen.getAllByRole('button', { name: '10' });
    const endButtons = screen.getAllByRole('button', { name: '12' });
    expect(startButtons.length).toBeGreaterThanOrEqual(2);
    expect(endButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(startButtons[0]);
    fireEvent.click(endButtons[1]);

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.any(Number),
        end: expect.any(Number),
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('sets start and end when selecting end date first', () => {
    const onChange = vi.fn();
    render(
      <DateRangeModal value={null} onChange={onChange} onClose={vi.fn()} />
    );

    const endButtons = screen.getAllByRole('button', { name: '5' });
    expect(endButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(endButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        start: expect.any(Number),
        end: expect.any(Number),
      })
    );
  });

  it('disables end dates before the start date', () => {
    render(
      <DateRangeModal value={null} onChange={vi.fn()} onClose={vi.fn()} />
    );

    const startButtons = screen.getAllByRole('button', { name: '20' });
    const endButtons = screen.getAllByRole('button', { name: '5' });
    expect(startButtons.length).toBeGreaterThanOrEqual(2);
    expect(endButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(startButtons[0]);
    expect(endButtons[1]).toBeDisabled();
  });

  it('clears the range when clicking clear', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <DateRangeModal value={null} onChange={onChange} onClose={onClose} />
    );

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalled();
  });

  it('navigates months for start and end calendars', () => {
    render(
      <DateRangeModal
        value={{
          start: new Date(2025, 0, 10, 12, 0, 0).getTime(),
          end: new Date(2025, 11, 20, 12, 0, 0).getTime(),
        }}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('January 2025')).toBeInTheDocument();
    expect(screen.getByText('December 2025')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /previous month for start/i })
    );
    expect(screen.getByText('December 2024')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /next month for end/i })
    );
    expect(screen.getByText('January 2026')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <DateRangeModal value={null} onChange={vi.fn()} onClose={onClose} />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
