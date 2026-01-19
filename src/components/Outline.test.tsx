import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Outline } from './Outline';
import { Block } from '../types';

const createBlock = (id: string, type: Block['type'], content: string): Block => ({
  id,
  type,
  content,
});

describe('Outline', () => {
  const defaultProps = {
    blocks: [] as Block[],
    onNavigate: vi.fn(),
    hiddenBlockIds: new Set<string>(),
    onToggleVisibility: vi.fn(),
  };

  it('renders outline header', () => {
    render(<Outline {...defaultProps} />);
    expect(screen.getByText('Outline')).toBeInTheDocument();
  });

  it('shows "No headings" when no H1 blocks exist', () => {
    render(<Outline {...defaultProps} blocks={[]} />);
    expect(screen.getByText('No headings')).toBeInTheDocument();
  });

  it('shows "No headings" when only non-H1 blocks exist', () => {
    const blocks = [
      createBlock('1', 'paragraph', 'Some text'),
      createBlock('2', 'h2', 'Subheading'),
    ];
    render(<Outline {...defaultProps} blocks={blocks} />);
    expect(screen.getByText('No headings')).toBeInTheDocument();
  });

  it('displays H1 blocks in outline', () => {
    const blocks = [
      createBlock('1', 'h1', 'First Section'),
      createBlock('2', 'paragraph', 'Content'),
      createBlock('3', 'h1', 'Second Section'),
    ];
    render(<Outline {...defaultProps} blocks={blocks} />);

    expect(screen.getByText('First Section')).toBeInTheDocument();
    expect(screen.getByText('Second Section')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('displays "Untitled" for empty H1 content', () => {
    const blocks = [createBlock('1', 'h1', '')];
    render(<Outline {...defaultProps} blocks={blocks} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('calls onNavigate when H1 text is clicked', () => {
    const onNavigate = vi.fn();
    const blocks = [createBlock('1', 'h1', 'Section')];
    render(<Outline {...defaultProps} blocks={blocks} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Section'));
    expect(onNavigate).toHaveBeenCalledWith('1');
  });

  it('calls onToggleVisibility when visibility button is clicked', () => {
    const onToggleVisibility = vi.fn();
    const blocks = [createBlock('1', 'h1', 'Section')];
    render(
      <Outline
        {...defaultProps}
        blocks={blocks}
        onToggleVisibility={onToggleVisibility}
      />
    );

    // Find the visibility toggle button (it contains an svg)
    const toggleButton = document.querySelector('button');
    fireEvent.click(toggleButton!);
    expect(onToggleVisibility).toHaveBeenCalledWith('1');
  });

  it('adds opacity-50 class when block is hidden', () => {
    const blocks = [createBlock('1', 'h1', 'Section')];
    const hiddenIds = new Set(['1']);
    render(
      <Outline {...defaultProps} blocks={blocks} hiddenBlockIds={hiddenIds} />
    );

    // Find the item container (parent of the text span)
    const itemText = screen.getByText('Section');
    const item = itemText.closest('div.group');
    expect(item?.classList.contains('opacity-50')).toBe(true);
  });

  it('does not add opacity-50 class when block is visible', () => {
    const blocks = [createBlock('1', 'h1', 'Section')];
    render(<Outline {...defaultProps} blocks={blocks} />);

    const itemText = screen.getByText('Section');
    const item = itemText.closest('div.group');
    expect(item?.classList.contains('opacity-50')).toBe(false);
  });
});
