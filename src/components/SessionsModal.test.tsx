import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { SessionsModal } from './SessionsModal';
import { TimeSession } from '../types';

describe('SessionsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdateSession = vi.fn();
  const mockOnDeleteSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createSession = (
    id: string,
    startTime: number,
    endTime?: number
  ): TimeSession => ({
    id,
    startTime,
    endTime,
  });

  const defaultProps = {
    sessions: [],
    estimateMinutes: 60,
    onUpdateSession: mockOnUpdateSession,
    onDeleteSession: mockOnDeleteSession,
    onClose: mockOnClose,
  };

  describe('rendering', () => {
    it('renders modal with title', () => {
      render(<SessionsModal {...defaultProps} />);
      expect(screen.getByText('Time Sessions')).toBeInTheDocument();
    });

    it('renders empty state when no sessions', () => {
      render(<SessionsModal {...defaultProps} />);
      expect(screen.getByText('No sessions recorded yet')).toBeInTheDocument();
    });

    it('renders sessions list when sessions exist', () => {
      const sessions = [
        createSession('s1', Date.now() - 3600000, Date.now()),
        createSession('s2', Date.now() - 7200000, Date.now() - 3600000),
      ];
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      expect(
        screen.queryByText('No sessions recorded yet')
      ).not.toBeInTheDocument();
    });

    it('renders total time and estimate', () => {
      const sessions = [createSession('s1', 0, 3600000)]; // 1 hour
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120}
        />
      );
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('1h 0m / 120m estimate')).toBeInTheDocument();
    });

    it('calculates total from multiple sessions', () => {
      const sessions = [
        createSession('s1', 0, 1800000), // 30m
        createSession('s2', 0, 1800000), // 30m
      ];
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={60}
        />
      );
      expect(screen.getByText('1h 0m / 60m estimate')).toBeInTheDocument();
    });

    it('shows Active badge for session without endTime', () => {
      const sessions = [createSession('s1', Date.now())]; // No endTime
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows duration for completed session', () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      expect(screen.getByText('30m')).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    it('calls onClose when close button clicked', () => {
      render(<SessionsModal {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: 'Close modal' });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop clicked', () => {
      render(<SessionsModal {...defaultProps} />);
      // The backdrop is the first button with 'Close modal' aria-label
      const backdrop = screen.getAllByRole('button', {
        name: 'Close modal',
      })[0];
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key pressed', () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('delete functionality', () => {
    it('shows delete button for completed sessions', () => {
      const sessions = [createSession('s1', 0, 1800000)];
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      expect(
        screen.getByRole('button', { name: 'Delete session' })
      ).toBeInTheDocument();
    });

    it('does not show delete button for active sessions', () => {
      const sessions = [createSession('s1', Date.now())]; // No endTime
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      expect(
        screen.queryByRole('button', { name: 'Delete session' })
      ).not.toBeInTheDocument();
    });

    it('calls onDeleteSession when delete button clicked', () => {
      const sessions = [createSession('s1', 0, 1800000)];
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      fireEvent.click(screen.getByRole('button', { name: 'Delete session' }));
      expect(mockOnDeleteSession).toHaveBeenCalledWith('s1');
    });
  });

  describe('edit functionality', () => {
    it('shows editable duration button for completed sessions', () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      // Button text is the duration "30m"
      const durationButton = screen.getByRole('button', { name: '30m' });
      expect(durationButton).toBeInTheDocument();
      expect(durationButton).toHaveAttribute('title', 'Click to edit');
    });

    it('clicking duration shows edit input', () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      const durationButton = screen.getByRole('button', { name: '30m' });
      fireEvent.click(durationButton);
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('edit input has current duration value', () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      const durationButton = screen.getByRole('button', { name: '30m' });
      fireEvent.click(durationButton);
      expect(screen.getByRole('spinbutton')).toHaveValue(30);
    });

    it('pressing Enter saves edited duration', async () => {
      const startTime = 0;
      const sessions = [createSession('s1', startTime, 1800000)]; // 30 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);

      const durationButton = screen.getByRole('button', { name: '30m' });
      fireEvent.click(durationButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '45' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnUpdateSession).toHaveBeenCalledWith('s1', {
          endTime: startTime + 45 * 60000,
        });
      });
    });

    it('pressing Escape cancels edit', async () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);

      const durationButton = screen.getByRole('button', { name: '30m' });
      fireEvent.click(durationButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '999' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnUpdateSession).not.toHaveBeenCalled();
        // Should show duration button again with original value
        expect(screen.getByRole('button', { name: '30m' })).toBeInTheDocument();
      });
    });

    it('blur saves edited duration', async () => {
      const startTime = 0;
      const sessions = [createSession('s1', startTime, 1800000)]; // 30 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);

      const durationButton = screen.getByRole('button', { name: '30m' });
      fireEvent.click(durationButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '60' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockOnUpdateSession).toHaveBeenCalledWith('s1', {
          endTime: startTime + 60 * 60000,
        });
      });
    });

    it('does not save invalid duration (NaN)', async () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);

      const durationButton = screen.getByRole('button', { name: '30m' });
      fireEvent.click(durationButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnUpdateSession).not.toHaveBeenCalled();
      });
    });

    it('does not save negative duration', async () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);

      const durationButton = screen.getByRole('button', { name: '30m' });
      fireEvent.click(durationButton);

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '-10' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnUpdateSession).not.toHaveBeenCalled();
      });
    });

    it('cannot edit active session', () => {
      const sessions = [createSession('s1', Date.now())]; // No endTime
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      // Active sessions show "Active" text with disabled button
      const activeButton = screen.getByText('Active').closest('button');
      expect(activeButton).toBeDisabled();
    });
  });

  describe('duration formatting', () => {
    it('formats minutes only when less than 1 hour', () => {
      const sessions = [createSession('s1', 0, 2700000)]; // 45 minutes
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      expect(screen.getByText('45m')).toBeInTheDocument();
    });

    it('formats hours and minutes', () => {
      const sessions = [createSession('s1', 0, 5400000)]; // 1h 30m
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });

    it('formats 0 minutes total when no completed sessions', () => {
      const sessions = [createSession('s1', Date.now())]; // Active only
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={60}
        />
      );
      expect(screen.getByText('0m / 60m estimate')).toBeInTheDocument();
    });
  });
});
