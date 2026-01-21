import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardSelect } from './KeyboardSelect';

describe('KeyboardSelect', () => {
  const mockOnChange = vi.fn();
  const mockOnAdvance = vi.fn();

  const defaultOptions = [
    { value: 'option1', label: 'Option One' },
    { value: 'option2', label: 'Option Two' },
    { value: 'option3', label: 'Option Three' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    value: '' as const,
    onChange: mockOnChange,
    onAdvance: mockOnAdvance,
    options: defaultOptions,
    placeholder: 'Select an option...',
  };

  describe('rendering', () => {
    it('renders with placeholder when no value', () => {
      render(<KeyboardSelect {...defaultProps} />);
      expect(screen.getByText('Select an option...')).toBeInTheDocument();
    });

    it('renders selected value when provided', () => {
      render(<KeyboardSelect {...defaultProps} value="option2" />);
      expect(screen.getByText('Option Two')).toBeInTheDocument();
    });

    it('renders as a combobox', () => {
      render(<KeyboardSelect {...defaultProps} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('dropdown behavior', () => {
    it('opens dropdown when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<KeyboardSelect {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(await screen.findByRole('listbox')).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Option One' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Option Two' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Option Three' })
      ).toBeInTheDocument();
    });

    it('closes dropdown when Escape is pressed', async () => {
      const user = userEvent.setup();
      render(<KeyboardSelect {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      await screen.findByRole('listbox');

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('closes dropdown and does not call onAdvance when Escape is pressed', async () => {
      const user = userEvent.setup();
      render(<KeyboardSelect {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      await screen.findByRole('listbox');

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
      expect(mockOnAdvance).not.toHaveBeenCalled();
    });
  });

  describe('selection', () => {
    it('calls onChange with selected value', async () => {
      const user = userEvent.setup();
      render(<KeyboardSelect {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const option = await screen.findByRole('option', { name: 'Option Two' });
      await user.click(option);

      expect(mockOnChange).toHaveBeenCalledWith('option2');
    });

    it('calls onAdvance after selection', async () => {
      const user = userEvent.setup();
      render(<KeyboardSelect {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const option = await screen.findByRole('option', { name: 'Option Two' });
      await user.click(option);

      await waitFor(() => {
        expect(mockOnAdvance).toHaveBeenCalled();
      });
    });

    it('closes dropdown after selection', async () => {
      const user = userEvent.setup();
      render(<KeyboardSelect {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const option = await screen.findByRole('option', { name: 'Option Two' });
      await user.click(option);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('displays selected value after selection', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<KeyboardSelect {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const option = await screen.findByRole('option', { name: 'Option Two' });
      await user.click(option);

      // Rerender with the new value (simulating controlled component update)
      rerender(<KeyboardSelect {...defaultProps} value="option2" />);

      expect(screen.getByText('Option Two')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('can navigate options with arrow keys', async () => {
      const user = userEvent.setup();
      render(<KeyboardSelect {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      await screen.findByRole('listbox');

      // Arrow down to navigate
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // Should have selected an option
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('selects option with Enter key', async () => {
      const user = userEvent.setup();
      render(<KeyboardSelect {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      await screen.findByRole('listbox');

      // Navigate to first option and select
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(mockOnChange).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockOnAdvance).toHaveBeenCalled();
      });
    });
  });

  describe('autoOpen behavior', () => {
    it('auto-opens when autoOpen is true', async () => {
      render(<KeyboardSelect {...defaultProps} autoOpen />);

      // Wait for the dropdown to auto-open
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBeInTheDocument();
      });
    });

    it('does not auto-open when autoOpen is false', () => {
      render(<KeyboardSelect {...defaultProps} autoOpen={false} />);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('supports aria-labelledby', () => {
      render(
        <div>
          <span id="my-label">My Label</span>
          <KeyboardSelect {...defaultProps} aria-labelledby="my-label" />
        </div>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-labelledby', 'my-label');
    });

    it('supports custom id', () => {
      render(<KeyboardSelect {...defaultProps} id="my-select" />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('id', 'my-select');
    });
  });
});
