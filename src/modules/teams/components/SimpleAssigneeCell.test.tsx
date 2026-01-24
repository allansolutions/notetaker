import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssigneeCell } from './AssigneeCell';

describe('AssigneeCell', () => {
  it('renders dash when no assignee', () => {
    render(<AssigneeCell assignee={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders dash when assignee is undefined', () => {
    render(<AssigneeCell assignee={undefined} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders assignee name', () => {
    const assignee = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: null,
    };
    render(<AssigneeCell assignee={assignee} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders email prefix when no name', () => {
    const assignee = {
      id: 'user-1',
      name: null,
      email: 'john@example.com',
      avatarUrl: null,
    };
    render(<AssigneeCell assignee={assignee} />);
    expect(screen.getByText('john')).toBeInTheDocument();
  });

  it('renders avatar when available', () => {
    const assignee = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: 'https://example.com/avatar.jpg',
    };
    const { container } = render(<AssigneeCell assignee={assignee} />);
    const avatar = container.querySelector('img');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders initial letter when no avatar', () => {
    const assignee = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: null,
    };
    render(<AssigneeCell assignee={assignee} />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders initial from email when no name or avatar', () => {
    const assignee = {
      id: 'user-1',
      name: null,
      email: 'jane@example.com',
      avatarUrl: null,
    };
    render(<AssigneeCell assignee={assignee} />);
    // Initial should be 'J' from 'jane'
    expect(screen.getByText('J')).toBeInTheDocument();
  });
});
