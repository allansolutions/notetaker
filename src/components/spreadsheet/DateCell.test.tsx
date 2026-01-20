import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { DateCell } from './DateCell';

describe('DateCell', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    value: undefined,
    onChange: mockOnChange,
  };

  describe('rendering', () => {
    it('renders calendar icon when no date is set', () => {
      render(<DateCell {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('renders formatted date when value is set', () => {
      const date = new Date(2024, 0, 15).getTime(); // Jan 15, 2024
      render(<DateCell {...defaultProps} value={date} />);
      // Check for either "Jan 15" or "15 Jan" depending on locale
      const button = screen.getByRole('button');
      expect(button.textContent).toMatch(/15.*Jan|Jan.*15/i);
    });
  });

  describe('modal interaction', () => {
    it('opens DatePickerModal when button is clicked', () => {
      render(<DateCell {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opens modal when date text is clicked', () => {
      const date = new Date(2024, 0, 15).getTime();
      render(<DateCell {...defaultProps} value={date} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes modal when date is selected', () => {
      render(<DateCell {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click on a day button
      const dayButtons = screen.getAllByRole('button');
      const dayButton = dayButtons.find((btn) => btn.textContent === '15');
      if (dayButton) {
        fireEvent.click(dayButton);
      }

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onChange when date is selected', () => {
      render(<DateCell {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));

      // Click on a day button
      const dayButtons = screen.getAllByRole('button');
      const dayButton = dayButtons.find((btn) => btn.textContent === '15');
      if (dayButton) {
        fireEvent.click(dayButton);
      }

      expect(mockOnChange).toHaveBeenCalled();
      const calledArg = mockOnChange.mock.calls[0][0];
      expect(typeof calledArg).toBe('number');
    });

    it('closes modal when Clear is clicked', () => {
      const date = new Date(2024, 0, 15).getTime();
      render(<DateCell {...defaultProps} value={date} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Clear'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onChange with undefined when Clear is clicked', () => {
      const date = new Date(2024, 0, 15).getTime();
      render(<DateCell {...defaultProps} value={date} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('Clear'));

      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('closes modal when Cancel is clicked', () => {
      render(<DateCell {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
