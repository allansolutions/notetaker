import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { EstimateCell } from './EstimateCell';

describe('EstimateCell', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders clock icon when no estimate and no time spent', () => {
      render(<EstimateCell value={undefined} onChange={mockOnChange} />);
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('renders clock icon when no estimate even with time spent', () => {
      const sessions = [
        { id: '1', startTime: Date.now() - 30 * 60000, endTime: Date.now() },
      ];
      render(
        <EstimateCell
          value={undefined}
          sessions={sessions}
          onChange={mockOnChange}
        />
      );
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('renders time spent and estimate when estimate exists', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      expect(screen.getByText('0m /')).toBeInTheDocument();
      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('formats hours correctly', () => {
      render(<EstimateCell value={120} onChange={mockOnChange} />);
      expect(screen.getByText('0m /')).toBeInTheDocument();
      expect(screen.getByText('2h')).toBeInTheDocument();
    });

    it('formats hours and minutes correctly', () => {
      render(<EstimateCell value={90} onChange={mockOnChange} />);
      expect(screen.getByText('0m /')).toBeInTheDocument();
      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });

    it('shows time spent and estimate when sessions exist', () => {
      const sessions = [
        { id: '1', startTime: Date.now() - 30 * 60000, endTime: Date.now() },
      ];
      render(
        <EstimateCell value={60} sessions={sessions} onChange={mockOnChange} />
      );
      expect(screen.getByText('30m /')).toBeInTheDocument();
      expect(screen.getByText('1h')).toBeInTheDocument();
    });

    it('shows red text when over estimate', () => {
      const sessions = [
        { id: '1', startTime: Date.now() - 90 * 60000, endTime: Date.now() },
      ];
      render(
        <EstimateCell value={60} sessions={sessions} onChange={mockOnChange} />
      );
      const timeSpent = screen.getByText('1h 30m /');
      expect(timeSpent).toHaveClass('text-red-500');
    });
  });

  describe('editing', () => {
    it('shows input when estimate button is clicked', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('shows input when clock icon is clicked', () => {
      render(<EstimateCell value={undefined} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('pre-fills input with formatted time value', () => {
      render(<EstimateCell value={90} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('1h 30m'));
      expect(screen.getByRole('textbox')).toHaveValue('1h 30m');
    });

    it('calls onChange with new value on Enter', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '60' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnChange).toHaveBeenCalledWith(60);
    });

    it('calls onChange with new value on blur', async () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '45' } });
      fireEvent.blur(input);
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(45);
      });
    });

    it('cancels editing on Escape', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '60' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(mockOnChange).not.toHaveBeenCalled();
      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('only allows valid time characters', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'abc2h 30mxyz' } });
      expect(input).toHaveValue('2h 30m');
    });

    it('parses hours input (2h = 120 minutes)', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '2h' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnChange).toHaveBeenCalledWith(120);
    });

    it('parses minutes with m suffix (45m = 45 minutes)', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '45m' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnChange).toHaveBeenCalledWith(45);
    });

    it('parses hours and minutes (2h 30m = 150 minutes)', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '2h 30m' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnChange).toHaveBeenCalledWith(150);
    });

    it('parses plain number as minutes (45 = 45 minutes)', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '45' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnChange).toHaveBeenCalledWith(45);
    });

    it('clears estimate when input is empty', async () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(undefined);
      });
    });

    it('does not call onChange for zero value', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByText('30m'));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});
