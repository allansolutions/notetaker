import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WikiPageView } from './WikiPageView';
import type { WikiPage, WikiBreadcrumb } from '../../types';

const mockPage: WikiPage = {
  id: 'page-1',
  title: 'Test Page',
  slug: 'test-page',
  parentId: null,
  blocks: [{ id: 'block-1', type: 'paragraph', content: 'Hello world' }],
  order: 0,
  icon: '📄',
  type: 'general',
  category: 'admin',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockAncestors: WikiBreadcrumb[] = [
  { id: 'parent', title: 'Parent Page', slug: 'parent', icon: '📁' },
];

const mockGetPage = vi.fn();
const mockGetAncestors = vi.fn();
const mockUpdatePage = vi.fn();

vi.mock('../../context/WikiContext', () => ({
  useWiki: () => ({
    getPage: mockGetPage,
    getAncestors: mockGetAncestors,
    updatePage: mockUpdatePage,
  }),
}));

// Mock the Editor component
vi.mock('@/components/Editor', () => ({
  Editor: ({ blocks }: { blocks: unknown[] }) => (
    <div data-testid="editor">Blocks: {blocks.length}</div>
  ),
  createBlock: (type = 'paragraph', content = '') => ({
    id: 'new-block',
    type,
    content,
  }),
}));

describe('WikiPageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPage.mockResolvedValue(mockPage);
    mockGetAncestors.mockResolvedValue(mockAncestors);
    mockUpdatePage.mockResolvedValue(mockPage);
  });

  it('shows loading state initially', async () => {
    // Use a slower resolving mock to catch the loading state
    mockGetPage.mockReturnValue(
      new Promise((resolve) => setTimeout(() => resolve(mockPage), 100))
    );

    render(
      <WikiPageView
        pageId="page-1"
        onNavigateToPage={vi.fn()}
        onNavigateToList={vi.fn()}
      />
    );

    expect(screen.getByText('Loading page...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading page...')).not.toBeInTheDocument();
    });
  });

  it('shows error when page not found', async () => {
    mockGetPage.mockResolvedValue(null);

    render(
      <WikiPageView
        pageId="page-1"
        onNavigateToPage={vi.fn()}
        onNavigateToList={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
  });

  it('shows error message when loading fails', async () => {
    mockGetPage.mockRejectedValue(new Error('Network error'));

    render(
      <WikiPageView
        pageId="page-1"
        onNavigateToPage={vi.fn()}
        onNavigateToList={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('calls getPage and getAncestors on mount', async () => {
    render(
      <WikiPageView
        pageId="page-1"
        onNavigateToPage={vi.fn()}
        onNavigateToList={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockGetPage).toHaveBeenCalledWith('page-1');
      expect(mockGetAncestors).toHaveBeenCalledWith('page-1');
    });
  });

  it('calls onNavigateToList when clicking back link on error', async () => {
    mockGetPage.mockResolvedValue(null);
    const onNavigateToList = vi.fn();

    render(
      <WikiPageView
        pageId="page-1"
        onNavigateToPage={vi.fn()}
        onNavigateToList={onNavigateToList}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Back to wiki')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Back to wiki'));
    expect(onNavigateToList).toHaveBeenCalled();
  });
});
