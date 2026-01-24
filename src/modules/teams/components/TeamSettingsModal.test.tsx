import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamSettingsModal } from './TeamSettingsModal';

const mockUpdateTeam = vi.fn();
const mockDeleteTeam = vi.fn();
const mockRemoveMember = vi.fn();

const mockActiveTeam = {
  id: 'team-1',
  name: 'Test Team',
  createdAt: Date.now(),
};
const mockMembers = [
  {
    id: 'member-1',
    teamId: 'team-1',
    userId: 'user-1',
    role: 'admin' as const,
    user: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: null,
    },
  },
  {
    id: 'member-2',
    teamId: 'team-1',
    userId: 'user-2',
    role: 'member' as const,
    user: {
      id: 'user-2',
      name: null,
      email: 'jane@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
  },
];

vi.mock('../context/TeamContext', () => ({
  useTeam: () => ({
    activeTeam: mockActiveTeam,
    members: mockMembers,
    updateTeam: mockUpdateTeam,
    deleteTeam: mockDeleteTeam,
    removeMember: mockRemoveMember,
    userRole: 'admin',
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'john@example.com' },
  }),
}));

vi.mock('./InviteMemberModal', () => ({
  InviteMemberModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="invite-modal">
      <button onClick={onClose}>Close Invite</button>
    </div>
  ),
}));

describe('TeamSettingsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Team Settings title', () => {
    render(<TeamSettingsModal onClose={mockOnClose} />);
    expect(screen.getByText('Team Settings')).toBeInTheDocument();
  });

  it('shows team name in input', () => {
    render(<TeamSettingsModal onClose={mockOnClose} />);
    expect(screen.getByLabelText('Team Name')).toHaveValue('Test Team');
  });

  it('calls onClose when backdrop clicked', async () => {
    const user = userEvent.setup();
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByLabelText('Close modal'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Close button clicked', async () => {
    const user = userEvent.setup();
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByText('Close'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape pressed', () => {
    render(<TeamSettingsModal onClose={mockOnClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables Save when name unchanged', () => {
    render(<TeamSettingsModal onClose={mockOnClose} />);

    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('enables Save when name changed', async () => {
    const user = userEvent.setup();
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.clear(screen.getByLabelText('Team Name'));
    await user.type(screen.getByLabelText('Team Name'), 'New Name');

    expect(screen.getByText('Save')).toBeEnabled();
  });

  it('calls updateTeam when Save clicked', async () => {
    const user = userEvent.setup();
    mockUpdateTeam.mockResolvedValueOnce(undefined);
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.clear(screen.getByLabelText('Team Name'));
    await user.type(screen.getByLabelText('Team Name'), 'New Name');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', 'New Name');
    });
  });

  it('calls updateTeam on Enter key', async () => {
    const user = userEvent.setup();
    mockUpdateTeam.mockResolvedValueOnce(undefined);
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.clear(screen.getByLabelText('Team Name'));
    await user.type(screen.getByLabelText('Team Name'), 'New Name{enter}');

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', 'New Name');
    });
  });

  it('shows error when updateTeam fails', async () => {
    const user = userEvent.setup();
    mockUpdateTeam.mockRejectedValueOnce(new Error('Update failed'));
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.clear(screen.getByLabelText('Team Name'));
    await user.type(screen.getByLabelText('Team Name'), 'New Name');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('lists members', () => {
    render(<TeamSettingsModal onClose={mockOnClose} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows member roles', () => {
    render(<TeamSettingsModal onClose={mockOnClose} />);

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('member')).toBeInTheDocument();
  });

  it('shows remove button for non-current user members', () => {
    render(<TeamSettingsModal onClose={mockOnClose} />);

    // Should have remove button for user-2 but not user-1 (current user)
    const removeButtons = screen.getAllByTitle('Remove member');
    expect(removeButtons).toHaveLength(1);
  });

  it('calls removeMember when remove button clicked', async () => {
    const user = userEvent.setup();
    mockRemoveMember.mockResolvedValueOnce(undefined);
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByTitle('Remove member'));

    await waitFor(() => {
      expect(mockRemoveMember).toHaveBeenCalledWith('user-2');
    });
  });

  it('shows error when removeMember fails', async () => {
    const user = userEvent.setup();
    mockRemoveMember.mockRejectedValueOnce(new Error('Remove failed'));
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByTitle('Remove member'));

    await waitFor(() => {
      expect(screen.getByText('Remove failed')).toBeInTheDocument();
    });
  });

  it('opens invite modal when Invite clicked', async () => {
    const user = userEvent.setup();
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByText('+ Invite'));

    expect(screen.getByTestId('invite-modal')).toBeInTheDocument();
  });

  it('shows Delete Team button', () => {
    render(<TeamSettingsModal onClose={mockOnClose} />);

    expect(screen.getByText('Delete Team')).toBeInTheDocument();
  });

  it('shows delete confirmation when Delete Team clicked', async () => {
    const user = userEvent.setup();
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByText('Delete Team'));

    expect(
      screen.getByText(/Are you sure you want to delete this team/)
    ).toBeInTheDocument();
  });

  it('hides confirmation when Cancel clicked', async () => {
    const user = userEvent.setup();
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByText('Delete Team'));
    await user.click(screen.getByText('Cancel'));

    expect(
      screen.queryByText(/Are you sure you want to delete this team/)
    ).not.toBeInTheDocument();
  });

  it('calls deleteTeam when confirmed', async () => {
    const user = userEvent.setup();
    mockDeleteTeam.mockResolvedValueOnce(undefined);
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByText('Delete Team'));
    await user.click(screen.getByText('Yes, Delete Team'));

    await waitFor(() => {
      expect(mockDeleteTeam).toHaveBeenCalledWith('team-1');
    });
  });

  it('closes modal after successful delete', async () => {
    const user = userEvent.setup();
    mockDeleteTeam.mockResolvedValueOnce(undefined);
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByText('Delete Team'));
    await user.click(screen.getByText('Yes, Delete Team'));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error when deleteTeam fails', async () => {
    const user = userEvent.setup();
    mockDeleteTeam.mockRejectedValueOnce(new Error('Delete failed'));
    render(<TeamSettingsModal onClose={mockOnClose} />);

    await user.click(screen.getByText('Delete Team'));
    await user.click(screen.getByText('Yes, Delete Team'));

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });

  it('shows avatar when available', () => {
    const { container } = render(<TeamSettingsModal onClose={mockOnClose} />);

    const avatar = container.querySelector(
      'img[src="https://example.com/avatar.jpg"]'
    );
    expect(avatar).toBeInTheDocument();
  });

  it('shows initial when no avatar', () => {
    render(<TeamSettingsModal onClose={mockOnClose} />);

    // John Doe has no avatar, should show 'J'
    expect(screen.getByText('J')).toBeInTheDocument();
  });
});
