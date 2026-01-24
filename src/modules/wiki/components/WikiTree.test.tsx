import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WikiTree } from './WikiTree';
import type { WikiPageTreeNode } from '../types';

const createMockNode = (
  overrides: Partial<WikiPageTreeNode> = {}
): WikiPageTreeNode => ({
  id: 'page-1',
  title: 'Test Page',
  slug: 'test-page',
  parentId: null,
  blocks: [],
  order: 0,
  icon: null,
  type: null,
  category: null,
  depth: 0,
  children: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('WikiTree', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows empty state when no pages', () => {
    render(
      <WikiTree
        tree={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onCreatePage={vi.fn()}
        onDeletePage={vi.fn()}
      />
    );

    expect(
      screen.getByText('No pages yet. Click + to create one.')
    ).toBeInTheDocument();
  });

  it('renders tree nodes', () => {
    const tree = [
      createMockNode({ id: 'page-1', title: 'Page 1' }),
      createMockNode({ id: 'page-2', title: 'Page 2' }),
    ];

    render(
      <WikiTree
        tree={tree}
        selectedId={null}
        onSelect={vi.fn()}
        onCreatePage={vi.fn()}
        onDeletePage={vi.fn()}
      />
    );

    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });

  it('calls onSelect when clicking a page', () => {
    const onSelect = vi.fn();
    const tree = [createMockNode({ id: 'page-1', title: 'Page 1' })];

    render(
      <WikiTree
        tree={tree}
        selectedId={null}
        onSelect={onSelect}
        onCreatePage={vi.fn()}
        onDeletePage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Page 1'));
    expect(onSelect).toHaveBeenCalledWith('page-1');
  });

  it('calls onCreatePage with null for root page creation', () => {
    const onCreatePage = vi.fn();

    render(
      <WikiTree
        tree={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onCreatePage={onCreatePage}
        onDeletePage={vi.fn()}
      />
    );

    // Click the + button in the header
    const addButton = screen.getByTitle('Add root page');
    fireEvent.click(addButton);

    expect(onCreatePage).toHaveBeenCalledWith(null);
  });

  it('renders page icons when present', () => {
    const tree = [
      createMockNode({ id: 'page-1', title: 'Page 1', icon: '📄' }),
    ];

    render(
      <WikiTree
        tree={tree}
        selectedId={null}
        onSelect={vi.fn()}
        onCreatePage={vi.fn()}
        onDeletePage={vi.fn()}
      />
    );

    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('renders nested children when expanded', () => {
    const tree = [
      createMockNode({
        id: 'parent',
        title: 'Parent',
        children: [
          createMockNode({
            id: 'child',
            title: 'Child',
            parentId: 'parent',
            depth: 1,
          }),
        ],
      }),
    ];

    // Mock localStorage to have parent expanded
    localStorage.setItem('wiki-tree-expanded', JSON.stringify(['parent']));

    render(
      <WikiTree
        tree={tree}
        selectedId={null}
        onSelect={vi.fn()}
        onCreatePage={vi.fn()}
        onDeletePage={vi.fn()}
      />
    );

    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('shows Untitled for pages without title', () => {
    const tree = [createMockNode({ id: 'page-1', title: '' })];

    render(
      <WikiTree
        tree={tree}
        selectedId={null}
        onSelect={vi.fn()}
        onCreatePage={vi.fn()}
        onDeletePage={vi.fn()}
      />
    );

    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('renders Pages header', () => {
    render(
      <WikiTree
        tree={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onCreatePage={vi.fn()}
        onDeletePage={vi.fn()}
      />
    );

    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('expands parent when creating child', () => {
    const onCreatePage = vi.fn();
    const tree = [
      createMockNode({
        id: 'parent',
        title: 'Parent',
        children: [
          createMockNode({
            id: 'child',
            title: 'Child',
            parentId: 'parent',
            depth: 1,
          }),
        ],
      }),
    ];

    render(
      <WikiTree
        tree={tree}
        selectedId={null}
        onSelect={vi.fn()}
        onCreatePage={onCreatePage}
        onDeletePage={vi.fn()}
      />
    );

    // Hover over parent to show action buttons
    fireEvent.mouseEnter(
      screen.getByText('Parent').closest('div[role="button"]')!
    );

    // Click create child button
    const addButton = screen.getByTitle('Add child page');
    fireEvent.click(addButton);

    expect(onCreatePage).toHaveBeenCalledWith('parent');
  });
});
