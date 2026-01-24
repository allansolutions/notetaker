import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WikiListView } from './WikiListView';
import type { WikiPageTreeNode } from '../../types';

// Mock the useWiki hook
const mockRemovePage = vi.fn();
vi.mock('../../context/WikiContext', () => ({
  useWiki: () => ({
    tree: mockTree,
    isLoading: mockIsLoading,
    error: mockError,
    removePage: mockRemovePage,
  }),
}));

let mockTree: WikiPageTreeNode[] = [];
let mockIsLoading = false;
let mockError: string | null = null;

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

describe('WikiListView', () => {
  beforeEach(() => {
    mockTree = [];
    mockIsLoading = false;
    mockError = null;
    mockRemovePage.mockClear();
  });

  it('shows loading state', () => {
    mockIsLoading = true;

    render(<WikiListView onSelectPage={vi.fn()} onCreatePage={vi.fn()} />);

    expect(screen.getByText('Loading wiki...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockError = 'Failed to load';

    render(<WikiListView onSelectPage={vi.fn()} onCreatePage={vi.fn()} />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders Wiki header', () => {
    render(<WikiListView onSelectPage={vi.fn()} onCreatePage={vi.fn()} />);

    expect(screen.getByText('Wiki')).toBeInTheDocument();
  });

  it('renders tree with pages', () => {
    mockTree = [
      createMockNode({ id: 'page-1', title: 'Page 1' }),
      createMockNode({ id: 'page-2', title: 'Page 2' }),
    ];

    render(<WikiListView onSelectPage={vi.fn()} onCreatePage={vi.fn()} />);

    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });

  it('calls onSelectPage when clicking a page', () => {
    const onSelectPage = vi.fn();
    mockTree = [createMockNode({ id: 'page-1', title: 'Page 1' })];

    render(<WikiListView onSelectPage={onSelectPage} onCreatePage={vi.fn()} />);

    fireEvent.click(screen.getByText('Page 1'));
    expect(onSelectPage).toHaveBeenCalledWith('page-1');
  });

  it('calls onCreatePage when clicking add button', () => {
    const onCreatePage = vi.fn();

    render(<WikiListView onSelectPage={vi.fn()} onCreatePage={onCreatePage} />);

    fireEvent.click(screen.getByTitle('Add root page'));
    expect(onCreatePage).toHaveBeenCalledWith(null);
  });

  it('calls removePage when deleting after confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockTree = [createMockNode({ id: 'page-1', title: 'Page 1' })];

    render(<WikiListView onSelectPage={vi.fn()} onCreatePage={vi.fn()} />);

    // Hover to show delete button
    const pageItem = screen.getByText('Page 1').closest('div[role="button"]');
    fireEvent.mouseEnter(pageItem!);

    // Click delete
    fireEvent.click(screen.getByTitle('Delete page'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockRemovePage).toHaveBeenCalledWith('page-1');

    confirmSpy.mockRestore();
  });

  it('does not call removePage when confirmation is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockTree = [createMockNode({ id: 'page-1', title: 'Page 1' })];

    render(<WikiListView onSelectPage={vi.fn()} onCreatePage={vi.fn()} />);

    // Hover to show delete button
    const pageItem = screen.getByText('Page 1').closest('div[role="button"]');
    fireEvent.mouseEnter(pageItem!);

    // Click delete
    fireEvent.click(screen.getByTitle('Delete page'));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockRemovePage).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
