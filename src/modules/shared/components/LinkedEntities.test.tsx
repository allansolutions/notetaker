import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LinkedEntities } from './LinkedEntities';
import { useEntityLinks } from '../hooks/useEntityLinks';
import type { SearchableEntity } from '../types';

// Mock the useEntityLinks hook
vi.mock('../hooks/useEntityLinks', () => ({
  useEntityLinks: vi.fn(),
}));

const mockLinks = [
  {
    id: 'link-1',
    sourceType: 'task' as const,
    sourceId: 'task-123',
    targetType: 'contact' as const,
    targetId: 'contact-456',
    createdAt: Date.now(),
  },
];

const mockBacklinks = [
  {
    id: 'link-2',
    sourceType: 'company' as const,
    sourceId: 'company-789',
    targetType: 'task' as const,
    targetId: 'task-123',
    createdAt: Date.now(),
  },
];

const mockAvailableEntities: SearchableEntity[] = [
  {
    id: 'task-other',
    type: 'task',
    title: 'Other Task',
    module: 'tasks',
    url: '/tasks/task-other',
  },
  {
    id: 'contact-other',
    type: 'contact',
    title: 'Jane Doe',
    module: 'crm',
    url: '/crm/contacts/contact-other',
  },
];

const mockGetEntityTitle = vi.fn((ref) => {
  const titles: Record<string, string> = {
    'contact-456': 'John Doe',
    'company-789': 'Acme Corp',
  };
  return titles[ref.id];
});

describe('LinkedEntities', () => {
  const mockAddLink = vi.fn();
  const mockRemoveLink = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEntityLinks).mockReturnValue({
      links: mockLinks,
      backlinks: mockBacklinks,
      isLoading: false,
      error: null,
      addLink: mockAddLink,
      removeLink: mockRemoveLink,
      refresh: vi.fn(),
    });
  });

  it('renders loading state', () => {
    vi.mocked(useEntityLinks).mockReturnValue({
      links: [],
      backlinks: [],
      isLoading: true,
      error: null,
      addLink: mockAddLink,
      removeLink: mockRemoveLink,
      refresh: vi.fn(),
    });

    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
      />
    );

    expect(screen.getByText('Loading links...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.mocked(useEntityLinks).mockReturnValue({
      links: [],
      backlinks: [],
      isLoading: false,
      error: 'Failed to load links',
      addLink: mockAddLink,
      removeLink: mockRemoveLink,
      refresh: vi.fn(),
    });

    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
      />
    );

    expect(screen.getByText('Failed to load links')).toBeInTheDocument();
  });

  it('renders linked items', () => {
    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
      />
    );

    expect(screen.getByText('Linked Items')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders backlinks', () => {
    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
      />
    );

    expect(screen.getByText('Linked From')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('hides backlinks when showBacklinks is false', () => {
    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
        showBacklinks={false}
      />
    );

    expect(screen.queryByText('Linked From')).not.toBeInTheDocument();
  });

  it('uses custom labels', () => {
    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
        linksLabel="Related"
        backlinksLabel="Referenced By"
      />
    );

    expect(screen.getByText('Related')).toBeInTheDocument();
    expect(screen.getByText('Referenced By')).toBeInTheDocument();
  });

  it('shows "No linked items" when there are no links', () => {
    vi.mocked(useEntityLinks).mockReturnValue({
      links: [],
      backlinks: [],
      isLoading: false,
      error: null,
      addLink: mockAddLink,
      removeLink: mockRemoveLink,
      refresh: vi.fn(),
    });

    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
      />
    );

    expect(screen.getByText('No linked items')).toBeInTheDocument();
  });

  it('opens entity picker when Add button is clicked', () => {
    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
      />
    );

    fireEvent.click(screen.getByText('Add'));

    expect(screen.getByPlaceholderText('Link to...')).toBeInTheDocument();
  });

  it('removes link when remove button is clicked', async () => {
    mockRemoveLink.mockResolvedValue(undefined);

    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
      />
    );

    // Hover to show the remove button (or just click it directly)
    const removeButton = screen.getByTitle('Remove link');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockRemoveLink).toHaveBeenCalledWith('link-1');
    });
  });

  it('calls onNavigate when link is clicked', () => {
    const onNavigate = vi.fn();

    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText('John Doe'));

    expect(onNavigate).toHaveBeenCalledWith({
      type: 'contact',
      id: 'contact-456',
    });
  });

  it('closes picker when backdrop is clicked', () => {
    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={mockGetEntityTitle}
      />
    );

    // Open picker
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByPlaceholderText('Link to...')).toBeInTheDocument();

    // Click backdrop
    fireEvent.click(screen.getByLabelText('Close picker'));

    expect(screen.queryByPlaceholderText('Link to...')).not.toBeInTheDocument();
  });

  it('displays Unknown for entity without title', () => {
    const getEntityTitle = vi.fn().mockReturnValue(undefined);

    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={mockAvailableEntities}
        getEntityTitle={getEntityTitle}
      />
    );

    expect(screen.getAllByText('Unknown')).toHaveLength(2); // One for link, one for backlink
  });

  it('filters out already linked entities from picker', () => {
    // Add contact-456 to available entities (it's already linked)
    const availableWithLinked: SearchableEntity[] = [
      ...mockAvailableEntities,
      {
        id: 'contact-456',
        type: 'contact',
        title: 'John Doe',
        module: 'crm',
        url: '/crm/contacts/contact-456',
      },
    ];

    render(
      <LinkedEntities
        sourceRef={{ type: 'task', id: 'task-123' }}
        availableEntities={availableWithLinked}
        getEntityTitle={mockGetEntityTitle}
      />
    );

    // Open picker and search
    fireEvent.click(screen.getByText('Add'));
    const input = screen.getByPlaceholderText('Link to...');
    fireEvent.change(input, { target: { value: 'John' } });

    // John Doe should not appear since it's already linked
    // The only John Doe should be the one in the links list, not the picker
    const johnsInPicker = screen
      .queryAllByText('John Doe')
      .filter((el) => el.closest('[role="list"]'));
    expect(johnsInPicker).toHaveLength(0);
  });
});
