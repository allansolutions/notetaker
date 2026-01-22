import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { BlockedReasonModal } from './BlockedReasonModal';

describe('BlockedReasonModal', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  describe('rendering', () => {
    it('renders modal with title', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      expect(screen.getByText('Why is this task blocked?')).toBeInTheDocument();
    });

    it('renders textarea for reason input', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      expect(
        screen.getByPlaceholderText('Enter the reason this task is blocked...')
      ).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: 'Set as Blocked' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Cancel' })
      ).toBeInTheDocument();
    });

    it('focuses textarea on mount', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        'Enter the reason this task is blocked...'
      );
      expect(document.activeElement).toBe(textarea);
    });
  });

  describe('validation', () => {
    it('submit button is disabled when reason is empty', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      const submitButton = screen.getByRole('button', {
        name: 'Set as Blocked',
      });
      expect(submitButton).toBeDisabled();
    });

    it('submit button is disabled when reason is whitespace only', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        'Enter the reason this task is blocked...'
      );
      fireEvent.change(textarea, { target: { value: '   ' } });
      const submitButton = screen.getByRole('button', {
        name: 'Set as Blocked',
      });
      expect(submitButton).toBeDisabled();
    });

    it('submit button is enabled when reason has text', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        'Enter the reason this task is blocked...'
      );
      fireEvent.change(textarea, { target: { value: 'Waiting for approval' } });
      const submitButton = screen.getByRole('button', {
        name: 'Set as Blocked',
      });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('submit functionality', () => {
    it('calls onSubmit with trimmed reason when submit button clicked', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        'Enter the reason this task is blocked...'
      );
      fireEvent.change(textarea, {
        target: { value: '  Waiting for approval  ' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Set as Blocked' }));
      expect(mockOnSubmit).toHaveBeenCalledWith('Waiting for approval');
    });

    it('calls onSubmit with Cmd+Enter keyboard shortcut', async () => {
      render(<BlockedReasonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        'Enter the reason this task is blocked...'
      );
      fireEvent.change(textarea, {
        target: { value: 'Blocked by dependency' },
      });
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Blocked by dependency');
      });
    });

    it('does not call onSubmit with Cmd+Enter when reason is empty', async () => {
      render(<BlockedReasonModal {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(
        'Enter the reason this task is blocked...'
      );
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('cancel functionality', () => {
    it('calls onCancel when cancel button clicked', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when backdrop clicked', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      const backdrop = screen.getByRole('button', { name: 'Close modal' });
      fireEvent.click(backdrop);
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when Escape key pressed', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when close button clicked', () => {
      render(<BlockedReasonModal {...defaultProps} />);
      // Close button is the second button with role="button" (after backdrop)
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(
        (btn) =>
          btn.querySelector('svg path[d="M5 5l10 10M15 5L5 15"]') !== null
      );
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
