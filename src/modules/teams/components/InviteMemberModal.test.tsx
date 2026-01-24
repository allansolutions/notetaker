import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteMemberModal } from './InviteMemberModal';

const mockInviteMember = vi.fn();
const mockActiveTeam = {
  id: 'team-1',
  name: 'Test Team',
  createdAt: Date.now(),
};

vi.mock('../context/TeamContext', () => ({
  useTeam: () => ({
    inviteMember: mockInviteMember,
    activeTeam: mockActiveTeam,
  }),
}));

// Mock clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('InviteMemberModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it('renders modal with team name', () => {
    render(<InviteMemberModal onClose={mockOnClose} />);
    expect(screen.getByText('Invite to Test Team')).toBeInTheDocument();
  });

  it('renders email input', () => {
    render(<InviteMemberModal onClose={mockOnClose} />);
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('calls onClose when backdrop clicked', async () => {
    const user = userEvent.setup();
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.click(screen.getByLabelText('Close modal'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    render(<InviteMemberModal onClose={mockOnClose} />);

    // Find close button in header (the X button)
    const closeButtons = screen.getAllByRole('button');
    const headerCloseButton = closeButtons.find(
      (btn) => btn.querySelector('svg') !== null
    );
    if (headerCloseButton) {
      await user.click(headerCloseButton);
    }

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape pressed', () => {
    render(<InviteMemberModal onClose={mockOnClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel clicked', async () => {
    const user = userEvent.setup();
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables Create Invite button when email is empty', () => {
    render(<InviteMemberModal onClose={mockOnClose} />);

    expect(screen.getByText('Create Invite')).toBeDisabled();
  });

  it('enables Create Invite button when email is entered', async () => {
    const user = userEvent.setup();
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');

    expect(screen.getByText('Create Invite')).toBeEnabled();
  });

  it('calls inviteMember when Create Invite clicked', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockResolvedValueOnce({
      id: 'invite-1',
      token: 'abc123',
    });
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows invite link after successful invite', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockResolvedValueOnce({
      id: 'invite-1',
      token: 'abc123',
    });
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(screen.getByText(/Invite link created/)).toBeInTheDocument();
    });
  });

  it('shows error when invite fails', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockResolvedValueOnce(null);
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(screen.getByText('Failed to create invite')).toBeInTheDocument();
    });
  });

  it('shows error when invite throws', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockRejectedValueOnce(new Error('Network error'));
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows generic error when non-Error thrown', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockRejectedValueOnce('string error');
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(screen.getByText('Failed to create invite')).toBeInTheDocument();
    });
  });

  it('submits on Enter key', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockResolvedValueOnce({
      id: 'invite-1',
      token: 'abc123',
    });
    render(<InviteMemberModal onClose={mockOnClose} />);

    const input = screen.getByLabelText('Email Address');
    await user.type(input, 'test@example.com{enter}');

    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows copy button after invite created', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockResolvedValueOnce({
      id: 'invite-1',
      token: 'abc123',
    });
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(screen.getByTitle('Copy link')).toBeInTheDocument();
    });
  });

  it('copies link and shows Copied state', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockResolvedValueOnce({
      id: 'invite-1',
      token: 'abc123',
    });
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(screen.getByTitle('Copy link')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Copy link'));

    await waitFor(() => {
      expect(screen.getByTitle('Copied!')).toBeInTheDocument();
    });
  });

  it('handles clipboard API failure with fallback', async () => {
    const user = userEvent.setup();
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard not available'));
    mockInviteMember.mockResolvedValueOnce({
      id: 'invite-1',
      token: 'abc123',
    });

    // Mock execCommand for fallback
    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(screen.getByTitle('Copy link')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Copy link'));

    await waitFor(() => {
      expect(screen.getByTitle('Copied!')).toBeInTheDocument();
    });
  });

  it('shows Done button after invite created', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockResolvedValueOnce({
      id: 'invite-1',
      token: 'abc123',
    });
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  it('closes modal when Done clicked', async () => {
    const user = userEvent.setup();
    mockInviteMember.mockResolvedValueOnce({
      id: 'invite-1',
      token: 'abc123',
    });
    render(<InviteMemberModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText('Email Address'), 'test@example.com');
    await user.click(screen.getByText('Create Invite'));

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Done'));

    expect(mockOnClose).toHaveBeenCalled();
  });
});
