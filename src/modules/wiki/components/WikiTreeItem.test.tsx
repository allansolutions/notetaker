import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WikiTreeItem } from './WikiTreeItem';
import type { WikiPageTreeNode } from '../types';

const createMockNode = (
  overrides: Partial<WikiPageTreeNode> = {}
): WikiPageTreeNode => ({
  id: 'node-1',
  title: 'Test Node',
  slug: 'test-node',
  parentId: null,
  blocks: [],
  order: 0,
  icon: null,
  type: null,
  category: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  children: [],
  depth: 0,
  ...overrides,
});

describe('WikiTreeItem', () => {
  const mockOnSelect = vi.fn();
  const mockOnToggleExpand = vi.fn();
  const mockOnCreateChild = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders node title', () => {
    const node = createMockNode({ title: 'My Page' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('My Page')).toBeInTheDocument();
  });

  it('renders "Untitled" when title is empty', () => {
    const node = createMockNode({ title: '' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    const node = createMockNode({ icon: '📄' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const node = createMockNode({ id: 'page-123' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /test node/i }));
    expect(mockOnSelect).toHaveBeenCalledWith('page-123');
  });

  it('calls onSelect on Enter key', () => {
    const node = createMockNode({ id: 'page-123' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.keyDown(screen.getByRole('button', { name: /test node/i }), {
      key: 'Enter',
    });
    expect(mockOnSelect).toHaveBeenCalledWith('page-123');
  });

  it('calls onSelect on Space key', () => {
    const node = createMockNode({ id: 'page-123' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.keyDown(screen.getByRole('button', { name: /test node/i }), {
      key: ' ',
    });
    expect(mockOnSelect).toHaveBeenCalledWith('page-123');
  });

  it('calls onToggleExpand when chevron is clicked', () => {
    const child = createMockNode({ id: 'child-1', title: 'Child', depth: 1 });
    const node = createMockNode({
      id: 'parent-1',
      title: 'Parent',
      children: [child],
    });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    // The toggle button is inside the main clickable area - find all buttons
    // and click the one that's not the main clickable row
    const allButtons = screen.getAllByRole('button');
    // Second button (index 1) is the chevron toggle, first is the row
    fireEvent.click(allButtons[1]);
    expect(mockOnToggleExpand).toHaveBeenCalledWith('parent-1');
  });

  it('shows children when expanded', () => {
    const child = createMockNode({
      id: 'child-1',
      title: 'Child Page',
      depth: 1,
    });
    const node = createMockNode({
      id: 'parent-1',
      title: 'Parent',
      children: [child],
    });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set(['parent-1'])}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Child Page')).toBeInTheDocument();
  });

  it('hides children when collapsed', () => {
    const child = createMockNode({
      id: 'child-1',
      title: 'Child Page',
      depth: 1,
    });
    const node = createMockNode({
      id: 'parent-1',
      title: 'Parent',
      children: [child],
    });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByText('Child Page')).not.toBeInTheDocument();
  });

  it('shows action buttons on hover', async () => {
    const node = createMockNode({ title: 'Test Page' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    const item = screen.getByRole('button', { name: /test page/i });
    fireEvent.mouseEnter(item);

    expect(screen.getByTitle('Add child page')).toBeInTheDocument();
    expect(screen.getByTitle('Delete page')).toBeInTheDocument();
  });

  it('hides action buttons on mouse leave', async () => {
    const node = createMockNode({ title: 'Test Page' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    const item = screen.getByRole('button', { name: /test page/i });
    fireEvent.mouseEnter(item);
    fireEvent.mouseLeave(item);

    expect(screen.queryByTitle('Add child page')).not.toBeInTheDocument();
  });

  it('calls onCreateChild when add button is clicked', () => {
    const node = createMockNode({ id: 'page-123', title: 'Test Page' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    const item = screen.getByRole('button', { name: /test page/i });
    fireEvent.mouseEnter(item);
    fireEvent.click(screen.getByTitle('Add child page'));

    expect(mockOnCreateChild).toHaveBeenCalledWith('page-123');
  });

  it('calls onDelete when delete button is clicked', () => {
    const node = createMockNode({ id: 'page-123', title: 'Test Page' });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    const item = screen.getByRole('button', { name: /test page/i });
    fireEvent.mouseEnter(item);
    fireEvent.click(screen.getByTitle('Delete page'));

    expect(mockOnDelete).toHaveBeenCalledWith('page-123');
  });

  it('does not show add child button at max depth', () => {
    const node = createMockNode({ title: 'Deep Page', depth: 9 });

    render(
      <WikiTreeItem
        node={node}
        selectedId={null}
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    const item = screen.getByRole('button', { name: /deep page/i });
    fireEvent.mouseEnter(item);

    expect(screen.queryByTitle('Add child page')).not.toBeInTheDocument();
    expect(screen.getByTitle('Delete page')).toBeInTheDocument();
  });

  it('applies selected styling when selected', () => {
    const node = createMockNode({ id: 'page-1' });

    render(
      <WikiTreeItem
        node={node}
        selectedId="page-1"
        expandedIds={new Set()}
        onSelect={mockOnSelect}
        onToggleExpand={mockOnToggleExpand}
        onCreateChild={mockOnCreateChild}
        onDelete={mockOnDelete}
      />
    );

    const item = screen.getByRole('button', { name: /test node/i });
    expect(item).toHaveClass('bg-muted');
  });
});
