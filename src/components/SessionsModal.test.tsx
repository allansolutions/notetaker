import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { SessionsModal } from './SessionsModal';
import { TimeSession } from '../types';

describe('SessionsModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdateSession = vi.fn();
  const mockOnDeleteSession = vi.fn();
  const mockOnAddSession = vi.fn();
  const mockOnUpdateEstimate = vi.fn();

  beforeEach(() => {
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
    onAddSession: mockOnAddSession,
    onUpdateEstimate: mockOnUpdateEstimate,
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

    it('renders total time and estimate separately', () => {
      const sessions = [createSession('s1', 0, 3600000)]; // 1 hour
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120}
        />
      );
      expect(screen.getByText('Total')).toBeInTheDocument();
      // Session shows 1h 0m and that is also the total
      const durationElements = screen.getAllByText('1h 0m');
      expect(durationElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Estimate')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '120m' })).toBeInTheDocument();
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
          estimateMinutes={120} // Use 120 to avoid collision with 30m preset
        />
      );
      const totalElements = screen.getAllByText('1h 0m');
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it('shows Active badge for session without endTime', () => {
      const sessions = [createSession('s1', Date.now())]; // No endTime
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows duration for completed session', () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120} // Use 120 to avoid 30m preset collision
        />
      );
      // Session duration button with title "Click to edit"
      const durationButton = screen.getByTitle('Click to edit');
      expect(durationButton).toHaveTextContent('30m');
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
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120} // Avoid collision with 30m preset
        />
      );
      // Session duration button has "Click to edit" title
      const durationButton = screen.getByTitle('Click to edit');
      expect(durationButton).toBeInTheDocument();
      expect(durationButton).toHaveTextContent('30m');
    });

    it('clicking duration shows edit input', () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120}
        />
      );
      const durationButton = screen.getByTitle('Click to edit');
      fireEvent.click(durationButton);
      // Session duration input is the one with value 30
      const inputs = screen.getAllByRole('spinbutton');
      const durationInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '30'
      );
      expect(durationInput).toBeInTheDocument();
    });

    it('edit input has current duration value', () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120}
        />
      );
      const durationButton = screen.getByTitle('Click to edit');
      fireEvent.click(durationButton);
      const inputs = screen.getAllByRole('spinbutton');
      const durationInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '30'
      );
      expect(durationInput).toHaveValue(30);
    });

    it('pressing Enter saves edited duration', async () => {
      const startTime = 0;
      const sessions = [createSession('s1', startTime, 1800000)]; // 30 minutes
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120}
        />
      );

      const durationButton = screen.getByTitle('Click to edit');
      fireEvent.click(durationButton);

      const inputs = screen.getAllByRole('spinbutton');
      const durationInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '30'
      );
      fireEvent.change(durationInput!, { target: { value: '45' } });
      fireEvent.keyDown(durationInput!, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnUpdateSession).toHaveBeenCalledWith('s1', {
          endTime: startTime + 45 * 60000,
        });
      });
    });

    it('pressing Escape cancels edit', async () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120}
        />
      );

      const durationButton = screen.getByTitle('Click to edit');
      fireEvent.click(durationButton);

      const inputs = screen.getAllByRole('spinbutton');
      const durationInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '30'
      );
      fireEvent.change(durationInput!, { target: { value: '999' } });
      fireEvent.keyDown(durationInput!, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnUpdateSession).not.toHaveBeenCalled();
        // Should show duration button again with original value
        expect(screen.getByTitle('Click to edit')).toHaveTextContent('30m');
      });
    });

    it('blur saves edited duration', async () => {
      const startTime = 0;
      const sessions = [createSession('s1', startTime, 1800000)]; // 30 minutes
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120}
        />
      );

      const durationButton = screen.getByTitle('Click to edit');
      fireEvent.click(durationButton);

      const inputs = screen.getAllByRole('spinbutton');
      const durationInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '30'
      );
      fireEvent.change(durationInput!, { target: { value: '60' } });
      fireEvent.blur(durationInput!);

      await waitFor(() => {
        expect(mockOnUpdateSession).toHaveBeenCalledWith('s1', {
          endTime: startTime + 60 * 60000,
        });
      });
    });

    it('does not save invalid duration (NaN)', async () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120}
        />
      );

      const durationButton = screen.getByTitle('Click to edit');
      fireEvent.click(durationButton);

      const inputs = screen.getAllByRole('spinbutton');
      const durationInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '30'
      );
      fireEvent.change(durationInput!, { target: { value: 'abc' } });
      fireEvent.keyDown(durationInput!, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnUpdateSession).not.toHaveBeenCalled();
      });
    });

    it('does not save negative duration', async () => {
      const sessions = [createSession('s1', 0, 1800000)]; // 30 minutes
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120}
        />
      );

      const durationButton = screen.getByTitle('Click to edit');
      fireEvent.click(durationButton);

      const inputs = screen.getAllByRole('spinbutton');
      const durationInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '30'
      );
      fireEvent.change(durationInput!, { target: { value: '-10' } });
      fireEvent.keyDown(durationInput!, { key: 'Enter' });

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
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120} // Avoid collision
        />
      );
      // Duration button should show 45m
      const durationButton = screen.getByTitle('Click to edit');
      expect(durationButton).toHaveTextContent('45m');
    });

    it('formats hours and minutes', () => {
      const sessions = [createSession('s1', 0, 5400000)]; // 1h 30m
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120} // Avoid collision
        />
      );
      // Session duration and total both show 1h 30m
      const elements = screen.getAllByText('1h 30m');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('formats 0 minutes total when no completed sessions', () => {
      const sessions = [createSession('s1', Date.now())]; // Active only
      render(
        <SessionsModal
          {...defaultProps}
          sessions={sessions}
          estimateMinutes={120} // Use 120 to avoid 0m collision
        />
      );
      expect(screen.getByText('0m')).toBeInTheDocument();
    });
  });

  describe('estimate editing', () => {
    it('shows estimate preset buttons', () => {
      render(<SessionsModal {...defaultProps} estimateMinutes={45} />); // Use non-preset value
      expect(screen.getByRole('button', { name: '15m' })).toBeInTheDocument();
      // The 30m button exists as a preset
      const preset30mButtons = screen.getAllByRole('button', { name: '30m' });
      expect(preset30mButtons.length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: '1h' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2h' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4h' })).toBeInTheDocument();
    });

    it('highlights current estimate preset', () => {
      render(<SessionsModal {...defaultProps} estimateMinutes={60} />);
      const oneHourButton = screen.getByRole('button', { name: '1h' });
      expect(oneHourButton).toHaveClass('bg-primary');
    });

    it('calls onUpdateEstimate when preset clicked', () => {
      render(<SessionsModal {...defaultProps} estimateMinutes={45} />); // Use non-preset value
      fireEvent.click(screen.getByRole('button', { name: '2h' }));
      expect(mockOnUpdateEstimate).toHaveBeenCalledWith(120);
    });

    it('shows editable estimate value', () => {
      render(<SessionsModal {...defaultProps} estimateMinutes={45} />);
      // The estimate value button has title "Click to edit estimate"
      expect(screen.getByTitle('Click to edit estimate')).toHaveTextContent(
        '45m'
      );
    });

    it('clicking estimate value opens edit input', () => {
      render(<SessionsModal {...defaultProps} estimateMinutes={45} />);
      const estimateButton = screen.getByTitle('Click to edit estimate');
      fireEvent.click(estimateButton);
      // Should show input with value 45
      const inputs = screen.getAllByRole('spinbutton');
      const estimateInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '45'
      );
      expect(estimateInput).toBeInTheDocument();
    });

    it('pressing Enter saves edited estimate', async () => {
      render(<SessionsModal {...defaultProps} estimateMinutes={45} />);
      const estimateButton = screen.getByTitle('Click to edit estimate');
      fireEvent.click(estimateButton);

      const inputs = screen.getAllByRole('spinbutton');
      const estimateInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '45'
      );
      fireEvent.change(estimateInput!, { target: { value: '90' } });
      fireEvent.keyDown(estimateInput!, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnUpdateEstimate).toHaveBeenCalledWith(90);
      });
    });

    it('pressing Escape cancels estimate edit', async () => {
      render(<SessionsModal {...defaultProps} estimateMinutes={45} />);
      const estimateButton = screen.getByTitle('Click to edit estimate');
      fireEvent.click(estimateButton);

      const inputs = screen.getAllByRole('spinbutton');
      const estimateInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '45'
      );
      fireEvent.change(estimateInput!, { target: { value: '999' } });
      fireEvent.keyDown(estimateInput!, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnUpdateEstimate).not.toHaveBeenCalled();
        expect(screen.getByTitle('Click to edit estimate')).toHaveTextContent(
          '45m'
        );
      });
    });

    it('does not save invalid estimate', async () => {
      render(<SessionsModal {...defaultProps} estimateMinutes={45} />);
      const estimateButton = screen.getByTitle('Click to edit estimate');
      fireEvent.click(estimateButton);

      const inputs = screen.getAllByRole('spinbutton');
      const estimateInput = inputs.find(
        (input) => (input as HTMLInputElement).value === '45'
      );
      fireEvent.change(estimateInput!, { target: { value: '0' } });
      fireEvent.keyDown(estimateInput!, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnUpdateEstimate).not.toHaveBeenCalled();
      });
    });
  });

  describe('manual time entry', () => {
    it('shows Add entry button', () => {
      render(<SessionsModal {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: /add entry/i })
      ).toBeInTheDocument();
    });

    it('clicking Add entry button shows input form', () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));
      expect(screen.getByPlaceholderText('e.g., 30m')).toBeInTheDocument();
      expect(screen.getByText('Manual entry')).toBeInTheDocument();
    });

    it('hides empty state message when adding entry', () => {
      render(<SessionsModal {...defaultProps} sessions={[]} />);
      expect(screen.getByText('No sessions recorded yet')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));
      expect(
        screen.queryByText('No sessions recorded yet')
      ).not.toBeInTheDocument();
    });

    it('pressing Enter saves manual entry with plain number', async () => {
      const beforeTime = Date.now();
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: '30' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnAddSession).toHaveBeenCalledTimes(1);
        const session = mockOnAddSession.mock.calls[0][0];
        expect(session.id).toMatch(/^session-/);
        expect(session.endTime).toBeGreaterThanOrEqual(beforeTime);
        expect(session.endTime - session.startTime).toBe(30 * 60000);
      });
    });

    it('accepts JIRA-style format with minutes suffix', async () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: '45m' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnAddSession).toHaveBeenCalledTimes(1);
        const session = mockOnAddSession.mock.calls[0][0];
        expect(session.endTime - session.startTime).toBe(45 * 60000);
      });
    });

    it('accepts JIRA-style format with hours', async () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: '2h' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnAddSession).toHaveBeenCalledTimes(1);
        const session = mockOnAddSession.mock.calls[0][0];
        expect(session.endTime - session.startTime).toBe(120 * 60000);
      });
    });

    it('accepts JIRA-style format with hours and minutes', async () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: '1h 30m' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnAddSession).toHaveBeenCalledTimes(1);
        const session = mockOnAddSession.mock.calls[0][0];
        expect(session.endTime - session.startTime).toBe(90 * 60000);
      });
    });

    it('blur saves manual entry', async () => {
      const beforeTime = Date.now();
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: '45' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockOnAddSession).toHaveBeenCalledTimes(1);
        const session = mockOnAddSession.mock.calls[0][0];
        expect(session.endTime).toBeGreaterThanOrEqual(beforeTime);
        expect(session.endTime - session.startTime).toBe(45 * 60000);
      });
    });

    it('pressing Escape cancels manual entry', async () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: '30' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(mockOnAddSession).not.toHaveBeenCalled();
        expect(
          screen.queryByPlaceholderText('e.g., 30m')
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /add entry/i })
        ).toBeInTheDocument();
      });
    });

    it('shows error for invalid entry and keeps form open', async () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnAddSession).not.toHaveBeenCalled();
        expect(
          screen.getByText('Invalid format (e.g., 30, 1h, 1h 30m)')
        ).toBeInTheDocument();
        // Form should still be open
        expect(screen.getByPlaceholderText('e.g., 30m')).toBeInTheDocument();
      });
    });

    it('clears error when user types again', async () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(
          screen.getByText('Invalid format (e.g., 30, 1h, 1h 30m)')
        ).toBeInTheDocument();
      });

      fireEvent.change(input, { target: { value: '30' } });

      await waitFor(() => {
        expect(
          screen.queryByText('Invalid format (e.g., 30, 1h, 1h 30m)')
        ).not.toBeInTheDocument();
      });
    });

    it('shows error for zero duration entry', async () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnAddSession).not.toHaveBeenCalled();
        expect(
          screen.getByText('Invalid format (e.g., 30, 1h, 1h 30m)')
        ).toBeInTheDocument();
      });
    });

    it('shows error for negative duration entry', async () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.change(input, { target: { value: '-10' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnAddSession).not.toHaveBeenCalled();
        expect(
          screen.getByText('Invalid format (e.g., 30, 1h, 1h 30m)')
        ).toBeInTheDocument();
      });
    });

    it('closes form without error when empty and blur', async () => {
      render(<SessionsModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /add entry/i }));

      const input = screen.getByPlaceholderText('e.g., 30m');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockOnAddSession).not.toHaveBeenCalled();
        expect(
          screen.queryByText('Invalid format (e.g., 30, 1h, 1h 30m)')
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /add entry/i })
        ).toBeInTheDocument();
      });
    });

    it('shows Add entry button alongside existing sessions', () => {
      const sessions = [createSession('s1', Date.now() - 3600000, Date.now())];
      render(<SessionsModal {...defaultProps} sessions={sessions} />);
      expect(
        screen.getByRole('button', { name: /add entry/i })
      ).toBeInTheDocument();
    });
  });
});
