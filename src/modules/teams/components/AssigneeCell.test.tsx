import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssigneeCell } from '../../../components/spreadsheet/AssigneeCell';

vi.mock('@/modules/teams/context/TeamContext', () => ({
  useTeam: () => ({
    members: [
      {
        userId: 'user-1',
        user: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          avatarUrl: null,
        },
        role: 'admin',
      },
      {
        userId: 'user-2',
        user: {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        role: 'member',
      },
    ],
  }),
}));

describe('AssigneeCell', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unassigned state when no assignee', () => {
    render(
      <AssigneeCell value={null} assignee={null} onChange={mockOnChange} />
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders assignee name when assigned', () => {
    const assignee = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: null,
    };
    render(
      <AssigneeCell
        value="user-1"
        assignee={assignee}
        onChange={mockOnChange}
      />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders assignee email prefix when no name', () => {
    const assignee = {
      id: 'user-1',
      name: null,
      email: 'john@example.com',
      avatarUrl: null,
    };
    render(
      <AssigneeCell
        value="user-1"
        assignee={assignee}
        onChange={mockOnChange}
      />
    );
    expect(screen.getByText('john')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    const user = userEvent.setup();
    render(
      <AssigneeCell value={null} assignee={null} onChange={mockOnChange} />
    );

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('calls onChange when member selected', async () => {
    const user = userEvent.setup();
    render(
      <AssigneeCell value={null} assignee={null} onChange={mockOnChange} />
    );

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('John Doe'));

    expect(mockOnChange).toHaveBeenCalledWith('user-1');
  });

  it('calls onChange with null when Unassigned selected', async () => {
    const user = userEvent.setup();
    const assignee = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: null,
    };
    render(
      <AssigneeCell
        value="user-1"
        assignee={assignee}
        onChange={mockOnChange}
      />
    );

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Unassigned'));

    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <AssigneeCell value={null} assignee={null} onChange={mockOnChange} />
        <button>Outside</button>
      </div>
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /-/ }));
    expect(screen.getByText('Unassigned')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByText('Outside'));

    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('closes dropdown on Escape key', async () => {
    render(
      <AssigneeCell value={null} assignee={null} onChange={mockOnChange} />
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Unassigned')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });
});
