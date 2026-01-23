import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityLink, getEntityIcon, getEntityLabel } from './EntityLink';

describe('EntityLink', () => {
  it('renders a link with title', () => {
    render(
      <EntityLink
        entityRef={{ type: 'task', id: 'task-123' }}
        title="Test Task"
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tasks/task-123');
  });

  it('renders with icon by default', () => {
    render(
      <EntityLink
        entityRef={{ type: 'contact', id: 'contact-123' }}
        title="John Doe"
      />
    );

    // Icon should be present (svg element)
    const link = screen.getByRole('link');
    expect(link.querySelector('svg')).toBeInTheDocument();
  });

  it('hides icon when showIcon is false', () => {
    render(
      <EntityLink
        entityRef={{ type: 'contact', id: 'contact-123' }}
        title="John Doe"
        showIcon={false}
      />
    );

    const link = screen.getByRole('link');
    expect(link.querySelector('svg')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <EntityLink
        entityRef={{ type: 'task', id: 'task-123' }}
        title="Test Task"
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <EntityLink
        entityRef={{ type: 'task', id: 'task-123' }}
        title="Test Task"
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByRole('link'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('navigates via window.location when no onClick provided', () => {
    const originalLocation = window.location;
    // @ts-expect-error - mocking window.location
    delete window.location;
    window.location = { href: '' } as Location;

    render(
      <EntityLink
        entityRef={{ type: 'company', id: 'company-123' }}
        title="Acme Corp"
      />
    );

    fireEvent.click(screen.getByRole('link'));
    expect(window.location.href).toBe('/crm/companies/company-123');

    window.location = originalLocation;
  });

  it('applies custom className', () => {
    render(
      <EntityLink
        entityRef={{ type: 'task', id: 'task-123' }}
        title="Test Task"
        className="custom-class"
      />
    );

    expect(screen.getByRole('link')).toHaveClass('custom-class');
  });

  it('has correct title attribute', () => {
    render(
      <EntityLink
        entityRef={{ type: 'wiki-page', id: 'page-123' }}
        title="My Page"
      />
    );

    expect(screen.getByRole('link')).toHaveAttribute('title', 'Page: My Page');
  });
});

describe('getEntityIcon', () => {
  it('returns icon for task', () => {
    const Icon = getEntityIcon('task');
    expect(Icon).toBeDefined();
  });

  it('returns icon for contact', () => {
    const Icon = getEntityIcon('contact');
    expect(Icon).toBeDefined();
  });

  it('returns icon for company', () => {
    const Icon = getEntityIcon('company');
    expect(Icon).toBeDefined();
  });

  it('returns icon for wiki-page', () => {
    const Icon = getEntityIcon('wiki-page');
    expect(Icon).toBeDefined();
  });
});

describe('getEntityLabel', () => {
  it('returns "Task" for task type', () => {
    expect(getEntityLabel('task')).toBe('Task');
  });

  it('returns "Contact" for contact type', () => {
    expect(getEntityLabel('contact')).toBe('Contact');
  });

  it('returns "Company" for company type', () => {
    expect(getEntityLabel('company')).toBe('Company');
  });

  it('returns "Page" for wiki-page type', () => {
    expect(getEntityLabel('wiki-page')).toBe('Page');
  });
});
