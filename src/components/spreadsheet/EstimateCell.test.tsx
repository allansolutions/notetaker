import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { EstimateCell } from './EstimateCell';

describe('EstimateCell', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup any lingering popovers
    document.body.innerHTML = '';
  });

  describe('rendering', () => {
    it('renders clock icon when no estimate', () => {
      render(<EstimateCell value={undefined} onChange={mockOnChange} />);
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('renders formatted estimate when value exists', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('formats hours correctly', () => {
      render(<EstimateCell value={120} onChange={mockOnChange} />);
      expect(screen.getByText('2h')).toBeInTheDocument();
    });

    it('formats hours and minutes correctly', () => {
      render(<EstimateCell value={90} onChange={mockOnChange} />);
      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });
  });

  describe('popover behavior', () => {
    it('opens popover on click', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      // Check that preset buttons are visible in popover
      const buttons15m = screen.getAllByText('15m');
      expect(buttons15m.length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText('Custom')).toBeInTheDocument();
    });

    it('closes popover on outside click', async () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByPlaceholderText('Custom')).toBeInTheDocument();

      // Simulate outside click
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Custom')).not.toBeInTheDocument();
      });
    });

    it('closes popover on escape key', async () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByPlaceholderText('Custom')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Custom')).not.toBeInTheDocument();
      });
    });
  });

  describe('preset selection', () => {
    it('calls onChange with preset value when clicked', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      // Find the 1h preset button (not the main cell button)
      const presetButtons = screen.getAllByRole('button', { name: '1h' });
      const presetButton = presetButtons.find((btn) =>
        btn.classList.contains('text-xs')
      );
      fireEvent.click(presetButton!);
      expect(mockOnChange).toHaveBeenCalledWith(60);
    });

    it('highlights current value preset', () => {
      render(<EstimateCell value={60} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      // Find the 1h preset button in the popover (it has text-xs class)
      const buttons = screen.getAllByRole('button', { name: '1h' });
      const presetButton = buttons.find((btn) =>
        btn.classList.contains('text-xs')
      );
      expect(presetButton).toHaveClass('bg-primary');
    });

    it('closes popover after preset selection', async () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      // Find the 2h preset button
      const presetButtons = screen.getAllByRole('button', { name: '2h' });
      const presetButton = presetButtons.find((btn) =>
        btn.classList.contains('text-xs')
      );
      fireEvent.click(presetButton!);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Custom')).not.toBeInTheDocument();
      });
    });
  });

  describe('custom value input', () => {
    it('renders custom input field', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByPlaceholderText('Custom')).toBeInTheDocument();
    });

    it('calls onChange with custom value on Enter', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      const input = screen.getByPlaceholderText('Custom');
      fireEvent.change(input, { target: { value: '45' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnChange).toHaveBeenCalledWith(45);
    });

    it('does not call onChange for invalid custom value', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      const input = screen.getByPlaceholderText('Custom');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not call onChange for zero or negative value', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      const input = screen.getByPlaceholderText('Custom');
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('clear functionality', () => {
    it('shows clear button when value exists', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('does not show clear button when no value', () => {
      render(<EstimateCell value={undefined} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });

    it('calls onChange with undefined when clear clicked', () => {
      render(<EstimateCell value={30} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Clear'));
      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });
  });
});
