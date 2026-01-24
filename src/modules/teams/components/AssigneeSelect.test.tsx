import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssigneeSelect } from './AssigneeSelect';

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
    members: mockMembers,
  }),
}));

describe('AssigneeSelect', () => {
  const mockOnChange = vi.fn();
  const mockOnAdvance = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder when no value', () => {
    render(<AssigneeSelect value="" onChange={mockOnChange} />);
    expect(screen.getByText('Select assignee...')).toBeInTheDocument();
  });

  it('renders selected member name', () => {
    render(<AssigneeSelect value="user-1" onChange={mockOnChange} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders member email when no name', () => {
    render(<AssigneeSelect value="user-2" onChange={mockOnChange} />);
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('opens dropdown and shows members', async () => {
    const user = userEvent.setup();
    render(<AssigneeSelect value="" onChange={mockOnChange} />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  it('calls onChange when member selected', async () => {
    const user = userEvent.setup();
    render(<AssigneeSelect value="" onChange={mockOnChange} />);

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    await user.click(screen.getByText('John Doe'));

    expect(mockOnChange).toHaveBeenCalledWith('user-1');
  });

  it('calls onAdvance after selection', async () => {
    const user = userEvent.setup();
    render(
      <AssigneeSelect
        value=""
        onChange={mockOnChange}
        onAdvance={mockOnAdvance}
      />
    );

    await user.click(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    await user.click(screen.getByText('John Doe'));

    await waitFor(() => {
      expect(mockOnAdvance).toHaveBeenCalled();
    });
  });

  it('renders avatar when available', async () => {
    const user = userEvent.setup();
    render(<AssigneeSelect value="" onChange={mockOnChange} />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      // Check that the member with avatar is shown (jane@example.com has avatar)
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      // Avatar is rendered in a portal, so just verify the option is visible
      const avatar = document.querySelector(
        'img[src="https://example.com/avatar.jpg"]'
      );
      expect(avatar).toBeInTheDocument();
    });
  });

  it('renders initial letter when no avatar', async () => {
    const user = userEvent.setup();
    render(<AssigneeSelect value="" onChange={mockOnChange} />);

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });

  it('accepts custom id prop', () => {
    render(
      <AssigneeSelect value="" onChange={mockOnChange} id="test-select" />
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'test-select');
  });

  it('auto-opens when autoOpen is true', async () => {
    render(<AssigneeSelect value="" onChange={mockOnChange} autoOpen />);

    // The dropdown should auto-open
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
