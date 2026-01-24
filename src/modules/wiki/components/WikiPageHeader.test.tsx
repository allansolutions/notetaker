import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WikiPageHeader } from './WikiPageHeader';

describe('WikiPageHeader', () => {
  const defaultProps = {
    title: 'Test Page',
    icon: null,
    type: null,
    category: null,
    onTitleChange: vi.fn(),
    onIconChange: vi.fn(),
    onTypeChange: vi.fn(),
    onCategoryChange: vi.fn(),
  };

  it('renders the title', () => {
    render(<WikiPageHeader {...defaultProps} />);

    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('shows Untitled when title is empty', () => {
    render(<WikiPageHeader {...defaultProps} title="" />);

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('allows editing title on click', () => {
    render(<WikiPageHeader {...defaultProps} />);

    // Click on title to edit
    fireEvent.click(screen.getByText('Test Page'));

    // Should now show an input
    const input = screen.getByDisplayValue('Test Page');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('calls onTitleChange on blur', () => {
    const onTitleChange = vi.fn();
    render(<WikiPageHeader {...defaultProps} onTitleChange={onTitleChange} />);

    // Click on title to edit
    fireEvent.click(screen.getByText('Test Page'));

    // Change the value
    const input = screen.getByDisplayValue('Test Page');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.blur(input);

    expect(onTitleChange).toHaveBeenCalledWith('New Title');
  });

  it('calls onTitleChange on Enter', () => {
    const onTitleChange = vi.fn();
    render(<WikiPageHeader {...defaultProps} onTitleChange={onTitleChange} />);

    // Click on title to edit
    fireEvent.click(screen.getByText('Test Page'));

    // Change the value and press Enter
    const input = screen.getByDisplayValue('Test Page');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onTitleChange).toHaveBeenCalledWith('New Title');
  });

  it('cancels edit on Escape', () => {
    const onTitleChange = vi.fn();
    render(<WikiPageHeader {...defaultProps} onTitleChange={onTitleChange} />);

    // Click on title to edit
    fireEvent.click(screen.getByText('Test Page'));

    // Change the value and press Escape
    const input = screen.getByDisplayValue('Test Page');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onTitleChange).not.toHaveBeenCalled();
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('renders type dropdown', () => {
    render(<WikiPageHeader {...defaultProps} />);

    expect(screen.getByText('Type:')).toBeInTheDocument();
  });

  it('calls onTypeChange when type is selected', () => {
    const onTypeChange = vi.fn();
    render(<WikiPageHeader {...defaultProps} onTypeChange={onTypeChange} />);

    const typeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(typeSelect, { target: { value: 'sop' } });

    expect(onTypeChange).toHaveBeenCalledWith('sop');
  });

  it('renders category dropdown', () => {
    render(<WikiPageHeader {...defaultProps} />);

    expect(screen.getByText('Category:')).toBeInTheDocument();
  });

  it('calls onCategoryChange when category is selected', () => {
    const onCategoryChange = vi.fn();
    render(
      <WikiPageHeader {...defaultProps} onCategoryChange={onCategoryChange} />
    );

    const categorySelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(categorySelect, { target: { value: 'admin' } });

    expect(onCategoryChange).toHaveBeenCalledWith('admin');
  });

  it('shows current type value', () => {
    render(<WikiPageHeader {...defaultProps} type="sop" />);

    const typeSelect = screen.getAllByRole('combobox')[0];
    expect(typeSelect).toHaveValue('sop');
  });

  it('shows current category value', () => {
    render(<WikiPageHeader {...defaultProps} category="admin" />);

    const categorySelect = screen.getAllByRole('combobox')[1];
    expect(categorySelect).toHaveValue('admin');
  });
});
