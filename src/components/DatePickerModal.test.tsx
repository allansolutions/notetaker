import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { DatePickerModal } from './DatePickerModal';

describe('DatePickerModal', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    value: undefined,
    onChange: mockOnChange,
    onClose: mockOnClose,
  };

  describe('rendering', () => {
    it('renders modal with current month/year', () => {
      render(<DatePickerModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      const today = new Date();
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      expect(
        screen.getByText(
          `${monthNames[today.getMonth()]} ${today.getFullYear()}`
        )
      ).toBeInTheDocument();
    });

    it('renders day headers', () => {
      render(<DatePickerModal {...defaultProps} />);
      expect(screen.getByText('Su')).toBeInTheDocument();
      expect(screen.getByText('Mo')).toBeInTheDocument();
      expect(screen.getByText('Tu')).toBeInTheDocument();
      expect(screen.getByText('We')).toBeInTheDocument();
      expect(screen.getByText('Th')).toBeInTheDocument();
      expect(screen.getByText('Fr')).toBeInTheDocument();
      expect(screen.getByText('Sa')).toBeInTheDocument();
    });

    it('renders day buttons for the month', () => {
      render(<DatePickerModal {...defaultProps} />);
      // Every month has at least 28 days
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '15' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '28' })).toBeInTheDocument();
    });

    it('renders Clear and Cancel buttons', () => {
      render(<DatePickerModal {...defaultProps} />);
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows selected date month when value is provided', () => {
      const date = new Date(2024, 5, 15).getTime(); // June 15, 2024
      render(<DatePickerModal {...defaultProps} value={date} />);
      expect(screen.getByText('June 2024')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates to previous month', () => {
      const date = new Date(2024, 5, 15).getTime(); // June 2024
      render(<DatePickerModal {...defaultProps} value={date} />);

      fireEvent.click(screen.getByLabelText('Previous month'));
      expect(screen.getByText('May 2024')).toBeInTheDocument();
    });

    it('navigates to next month', () => {
      const date = new Date(2024, 5, 15).getTime(); // June 2024
      render(<DatePickerModal {...defaultProps} value={date} />);

      fireEvent.click(screen.getByLabelText('Next month'));
      expect(screen.getByText('July 2024')).toBeInTheDocument();
    });

    it('navigates from January to December of previous year', () => {
      const date = new Date(2024, 0, 15).getTime(); // January 2024
      render(<DatePickerModal {...defaultProps} value={date} />);

      fireEvent.click(screen.getByLabelText('Previous month'));
      expect(screen.getByText('December 2023')).toBeInTheDocument();
    });

    it('navigates from December to January of next year', () => {
      const date = new Date(2024, 11, 15).getTime(); // December 2024
      render(<DatePickerModal {...defaultProps} value={date} />);

      fireEvent.click(screen.getByLabelText('Next month'));
      expect(screen.getByText('January 2025')).toBeInTheDocument();
    });
  });

  describe('date selection', () => {
    it('calls onChange with selected date and closes', () => {
      const startDate = new Date(2024, 5, 1).getTime(); // June 2024
      render(<DatePickerModal {...defaultProps} value={startDate} />);

      fireEvent.click(screen.getByRole('button', { name: '15' }));

      expect(mockOnChange).toHaveBeenCalled();
      const selectedDate = new Date(mockOnChange.mock.calls[0][0]);
      expect(selectedDate.getFullYear()).toBe(2024);
      expect(selectedDate.getMonth()).toBe(5); // June
      expect(selectedDate.getDate()).toBe(15);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('clear functionality', () => {
    it('calls onChange with undefined and closes when Clear is clicked', () => {
      const date = new Date(2024, 5, 15).getTime();
      render(<DatePickerModal {...defaultProps} value={date} />);

      fireEvent.click(screen.getByText('Clear'));

      expect(mockOnChange).toHaveBeenCalledWith(undefined);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('close functionality', () => {
    it('calls onClose when Cancel is clicked', () => {
      render(<DatePickerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      render(<DatePickerModal {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Close modal'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
      render(<DatePickerModal {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('today highlighting', () => {
    it('highlights today with different style', () => {
      render(<DatePickerModal {...defaultProps} />);
      const today = new Date();
      const todayButton = screen.getByRole('button', {
        name: String(today.getDate()),
      });
      expect(todayButton.className).toContain('bg-blue-100');
    });
  });

  describe('selected date highlighting', () => {
    it('highlights selected date with different style', () => {
      const date = new Date(2024, 5, 15).getTime();
      render(<DatePickerModal {...defaultProps} value={date} />);
      const selectedButton = screen.getByRole('button', { name: '15' });
      expect(selectedButton.className).toContain('bg-blue-500');
    });
  });
});
