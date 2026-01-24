import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WikiBreadcrumbs } from './WikiBreadcrumbs';
import type { WikiBreadcrumb } from '../types';

describe('WikiBreadcrumbs', () => {
  it('renders home link with Wiki text', () => {
    render(
      <WikiBreadcrumbs
        ancestors={[]}
        currentPage={null}
        onNavigate={vi.fn()}
        onNavigateHome={vi.fn()}
      />
    );

    expect(screen.getByText('Wiki')).toBeInTheDocument();
  });

  it('calls onNavigateHome when clicking Wiki link', () => {
    const onNavigateHome = vi.fn();
    render(
      <WikiBreadcrumbs
        ancestors={[]}
        currentPage={null}
        onNavigate={vi.fn()}
        onNavigateHome={onNavigateHome}
      />
    );

    fireEvent.click(screen.getByText('Wiki'));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('renders ancestor links', () => {
    const ancestors: WikiBreadcrumb[] = [
      { id: 'parent', title: 'Parent Page', slug: 'parent', icon: null },
    ];

    render(
      <WikiBreadcrumbs
        ancestors={ancestors}
        currentPage={{ title: 'Current Page', icon: null }}
        onNavigate={vi.fn()}
        onNavigateHome={vi.fn()}
      />
    );

    expect(screen.getByText('Parent Page')).toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('calls onNavigate with ancestor id when clicking ancestor', () => {
    const onNavigate = vi.fn();
    const ancestors: WikiBreadcrumb[] = [
      { id: 'parent', title: 'Parent Page', slug: 'parent', icon: null },
    ];

    render(
      <WikiBreadcrumbs
        ancestors={ancestors}
        currentPage={{ title: 'Current Page', icon: null }}
        onNavigate={onNavigate}
        onNavigateHome={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Parent Page'));
    expect(onNavigate).toHaveBeenCalledWith('parent');
  });

  it('renders ancestor icons when present', () => {
    const ancestors: WikiBreadcrumb[] = [
      { id: 'parent', title: 'Parent Page', slug: 'parent', icon: '📁' },
    ];

    render(
      <WikiBreadcrumbs
        ancestors={ancestors}
        currentPage={{ title: 'Current Page', icon: '📄' }}
        onNavigate={vi.fn()}
        onNavigateHome={vi.fn()}
      />
    );

    expect(screen.getByText('📁')).toBeInTheDocument();
    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('renders current page as non-clickable', () => {
    render(
      <WikiBreadcrumbs
        ancestors={[]}
        currentPage={{ title: 'Current Page', icon: null }}
        onNavigate={vi.fn()}
        onNavigateHome={vi.fn()}
      />
    );

    const currentPageElement = screen.getByText('Current Page');
    // Current page should be in a span, not a button
    expect(currentPageElement.closest('button')).toBeNull();
  });

  it('shows Untitled for pages without title', () => {
    render(
      <WikiBreadcrumbs
        ancestors={[{ id: 'parent', title: '', slug: 'parent', icon: null }]}
        currentPage={{ title: '', icon: null }}
        onNavigate={vi.fn()}
        onNavigateHome={vi.fn()}
      />
    );

    const untitledElements = screen.getAllByText('Untitled');
    expect(untitledElements).toHaveLength(2);
  });

  it('renders multiple ancestors in order', () => {
    const ancestors: WikiBreadcrumb[] = [
      {
        id: 'grandparent',
        title: 'Grandparent',
        slug: 'grandparent',
        icon: null,
      },
      { id: 'parent', title: 'Parent', slug: 'parent', icon: null },
    ];

    render(
      <WikiBreadcrumbs
        ancestors={ancestors}
        currentPage={{ title: 'Current', icon: null }}
        onNavigate={vi.fn()}
        onNavigateHome={vi.fn()}
      />
    );

    const breadcrumbNav = screen.getByRole('navigation');
    const buttons = breadcrumbNav.querySelectorAll('button');

    // Should have 3 buttons: Wiki, Grandparent, Parent
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent('Wiki');
    expect(buttons[1]).toHaveTextContent('Grandparent');
    expect(buttons[2]).toHaveTextContent('Parent');
  });
});
