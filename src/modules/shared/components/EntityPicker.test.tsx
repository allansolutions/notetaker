import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityPicker } from './EntityPicker';
import type { SearchableEntity } from '../types';

const mockEntities: SearchableEntity[] = [
  {
    id: 'task-1',
    type: 'task',
    title: 'Buy groceries',
    subtitle: 'Personal task',
    keywords: ['shopping', 'food'],
    module: 'tasks',
    url: '/tasks/task-1',
  },
  {
    id: 'contact-1',
    type: 'contact',
    title: 'John Doe',
    subtitle: 'john@example.com',
    keywords: ['john', 'email'],
    module: 'crm',
    url: '/crm/contacts/contact-1',
  },
  {
    id: 'company-1',
    type: 'company',
    title: 'Acme Corp',
    module: 'crm',
    url: '/crm/companies/company-1',
  },
];

describe('EntityPicker', () => {
  it('renders search input', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByPlaceholderText('Search entities...')
    ).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        placeholder="Find something..."
      />
    );

    expect(
      screen.getByPlaceholderText('Find something...')
    ).toBeInTheDocument();
  });

  it('shows all entities when no query (up to limit)', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // All entities should be visible when no query
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows message when no entities available', () => {
    render(<EntityPicker entities={[]} onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Start typing to search')).toBeInTheDocument();
  });

  it('filters entities by search query', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search entities...');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument();
  });

  it('filters entities by keyword', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search entities...');
    fireEvent.change(input, { target: { value: 'shopping' } });

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('filters entities by subtitle', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search entities...');
    fireEvent.change(input, { target: { value: 'example.com' } });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows no results message when query has no matches', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search entities...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No matching entities found')).toBeInTheDocument();
  });

  it('filters by allowed types', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        allowedTypes={['task']}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search entities...');
    fireEvent.change(input, { target: { value: 'a' } }); // Match all

    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
  });

  it('calls onSelect when entity is clicked', () => {
    const onSelect = vi.fn();
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search entities...');
    fireEvent.change(input, { target: { value: 'John' } });

    fireEvent.click(screen.getByText('John Doe'));

    expect(onSelect).toHaveBeenCalledWith({ type: 'contact', id: 'contact-1' });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={onClose}
      />
    );

    // Find the close button (X icon button)
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[0]; // First button is the close button
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={onClose}
      />
    );

    const input = screen.getByPlaceholderText('Search entities...');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays entity subtitle when available', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search entities...');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays entity type label', () => {
    render(
      <EntityPicker
        entities={mockEntities}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Search entities...');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(screen.getByText('Contact')).toBeInTheDocument();
  });
});
