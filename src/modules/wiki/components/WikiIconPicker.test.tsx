import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WikiIconPicker } from './WikiIconPicker';

describe('WikiIconPicker', () => {
  it('renders smile icon when no icon is set', () => {
    render(<WikiIconPicker icon={null} onChange={vi.fn()} />);

    // The button should contain the Smile icon (from lucide-react)
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders current icon when set', () => {
    render(<WikiIconPicker icon="📄" onChange={vi.fn()} />);

    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('opens popover when clicking the button', () => {
    render(<WikiIconPicker icon={null} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Choose icon')).toBeInTheDocument();
  });

  it('calls onChange with selected emoji', () => {
    const onChange = vi.fn();
    render(<WikiIconPicker icon={null} onChange={onChange} />);

    // Open popover
    fireEvent.click(screen.getByRole('button'));

    // Click on an emoji
    fireEvent.click(screen.getByText('📄'));

    expect(onChange).toHaveBeenCalledWith('📄');
  });

  it('shows remove button when icon is set', () => {
    render(<WikiIconPicker icon="📄" onChange={vi.fn()} />);

    // Open popover
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('calls onChange with null when clicking remove', () => {
    const onChange = vi.fn();
    render(<WikiIconPicker icon="📄" onChange={onChange} />);

    // Open popover
    fireEvent.click(screen.getByRole('button'));

    // Click remove
    fireEvent.click(screen.getByText('Remove'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('does not show remove button when no icon', () => {
    render(<WikiIconPicker icon={null} onChange={vi.fn()} />);

    // Open popover
    fireEvent.click(screen.getByRole('button'));

    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });
});
