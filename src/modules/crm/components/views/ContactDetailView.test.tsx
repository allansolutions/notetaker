import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactDetailView } from './ContactDetailView';
import * as CrmContext from '../../context/CrmContext';

// Mock CrmContext
vi.mock('../../context/CrmContext', () => ({
  useCrm: vi.fn(),
}));

describe('ContactDetailView', () => {
  const mockOnBack = vi.fn();
  const mockOnSaved = vi.fn();

  const mockCrmContext = {
    contacts: [],
    companies: [
      {
        id: 'company-1',
        name: 'Acme Corp',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    isLoading: false,
    error: null,
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
    getContact: vi.fn(),
    refreshContacts: vi.fn(),
    refreshCompanies: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CrmContext.useCrm).mockReturnValue(mockCrmContext);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows "New Contact" title when contactId is null', () => {
    render(
      <ContactDetailView
        contactId={null}
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText('New Contact')).toBeInTheDocument();
  });

  it('shows loading state when fetching contact', async () => {
    let resolveGetContact: (value: unknown) => void;
    mockCrmContext.getContact = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGetContact = resolve;
        })
    );

    render(
      <ContactDetailView
        contactId="contact-1"
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText('Loading contact...')).toBeInTheDocument();

    // Resolve the promise
    resolveGetContact!({
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading contact...')).not.toBeInTheDocument();
    });
  });

  it('shows error when contact not found', async () => {
    mockCrmContext.getContact = vi.fn().mockResolvedValue(null);

    render(
      <ContactDetailView
        contactId="non-existent"
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Contact not found')).toBeInTheDocument();
    });
  });

  it('displays contact name in title when editing', async () => {
    mockCrmContext.getContact = vi.fn().mockResolvedValue({
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    render(
      <ContactDetailView
        contactId="contact-1"
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('calls onBack when clicking back button', () => {
    render(
      <ContactDetailView
        contactId={null}
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.click(screen.getByText('Contacts'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('creates new contact and calls onSaved', async () => {
    const newContact = {
      id: 'new-contact',
      firstName: 'New',
      lastName: 'Contact',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockCrmContext.addContact = vi.fn().mockResolvedValue(newContact);

    render(
      <ContactDetailView
        contactId={null}
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('First name *'), {
      target: { value: 'New' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name *'), {
      target: { value: 'Contact' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCrmContext.addContact).toHaveBeenCalled();
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it('shows error when creating contact fails', async () => {
    mockCrmContext.addContact = vi.fn().mockResolvedValue(null);

    render(
      <ContactDetailView
        contactId={null}
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('First name *'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name *'), {
      target: { value: 'User' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed to create contact')).toBeInTheDocument();
    });
  });

  it('updates existing contact and calls onSaved', async () => {
    const existingContact = {
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockCrmContext.getContact = vi.fn().mockResolvedValue(existingContact);
    mockCrmContext.updateContact = vi.fn().mockResolvedValue({
      ...existingContact,
      firstName: 'Jane',
    });

    render(
      <ContactDetailView
        contactId="contact-1"
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('First name *'), {
      target: { value: 'Jane' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCrmContext.updateContact).toHaveBeenCalledWith(
        'contact-1',
        expect.objectContaining({ firstName: 'Jane' })
      );
      expect(mockOnSaved).toHaveBeenCalled();
    });
  });

  it('shows error when updating contact fails', async () => {
    const existingContact = {
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    mockCrmContext.getContact = vi.fn().mockResolvedValue(existingContact);
    mockCrmContext.updateContact = vi.fn().mockResolvedValue(null);

    render(
      <ContactDetailView
        contactId="contact-1"
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed to update contact')).toBeInTheDocument();
    });
  });

  it('shows generic error on exception', async () => {
    mockCrmContext.addContact = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));

    render(
      <ContactDetailView
        contactId={null}
        onBack={mockOnBack}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('First name *'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name *'), {
      target: { value: 'User' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(
        screen.getByText('An error occurred while saving')
      ).toBeInTheDocument();
    });
  });
});
