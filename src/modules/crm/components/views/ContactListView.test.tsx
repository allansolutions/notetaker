import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactListView } from './ContactListView';
import * as CrmContext from '../../context/CrmContext';

// Mock CrmContext
vi.mock('../../context/CrmContext', () => ({
  useCrm: vi.fn(),
}));

describe('ContactListView', () => {
  const mockOnBack = vi.fn();
  const mockOnNewContact = vi.fn();
  const mockOnSelectContact = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    vi.mocked(CrmContext.useCrm).mockReturnValue({
      contacts: [],
      companies: [],
      isLoading: true,
      error: null,
      addContact: vi.fn(),
      updateContact: vi.fn(),
      removeContact: vi.fn(),
      getContact: vi.fn(),
      refreshContacts: vi.fn(),
      refreshCompanies: vi.fn(),
    });

    render(
      <ContactListView
        onBack={mockOnBack}
        onNewContact={mockOnNewContact}
        onSelectContact={mockOnSelectContact}
      />
    );

    expect(screen.getByText('Loading contacts...')).toBeInTheDocument();
  });

  it('shows empty state when no contacts', () => {
    vi.mocked(CrmContext.useCrm).mockReturnValue({
      contacts: [],
      companies: [],
      isLoading: false,
      error: null,
      addContact: vi.fn(),
      updateContact: vi.fn(),
      removeContact: vi.fn(),
      getContact: vi.fn(),
      refreshContacts: vi.fn(),
      refreshCompanies: vi.fn(),
    });

    render(
      <ContactListView
        onBack={mockOnBack}
        onNewContact={mockOnNewContact}
        onSelectContact={mockOnSelectContact}
      />
    );

    expect(screen.getByText(/No contacts yet/)).toBeInTheDocument();
    expect(screen.getByText('Create your first contact')).toBeInTheDocument();
  });

  it('calls onNewContact when clicking create link', () => {
    vi.mocked(CrmContext.useCrm).mockReturnValue({
      contacts: [],
      companies: [],
      isLoading: false,
      error: null,
      addContact: vi.fn(),
      updateContact: vi.fn(),
      removeContact: vi.fn(),
      getContact: vi.fn(),
      refreshContacts: vi.fn(),
      refreshCompanies: vi.fn(),
    });

    render(
      <ContactListView
        onBack={mockOnBack}
        onNewContact={mockOnNewContact}
        onSelectContact={mockOnSelectContact}
      />
    );

    fireEvent.click(screen.getByText('Create your first contact'));
    expect(mockOnNewContact).toHaveBeenCalled();
  });

  it('displays contacts in a table', () => {
    vi.mocked(CrmContext.useCrm).mockReturnValue({
      contacts: [
        {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          company: {
            id: 'company-1',
            name: 'Acme Corp',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'contact-2',
          firstName: 'Jane',
          lastName: 'Smith',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      companies: [],
      isLoading: false,
      error: null,
      addContact: vi.fn(),
      updateContact: vi.fn(),
      removeContact: vi.fn(),
      getContact: vi.fn(),
      refreshContacts: vi.fn(),
      refreshCompanies: vi.fn(),
    });

    render(
      <ContactListView
        onBack={mockOnBack}
        onNewContact={mockOnNewContact}
        onSelectContact={mockOnSelectContact}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('calls onSelectContact when clicking a contact name', () => {
    vi.mocked(CrmContext.useCrm).mockReturnValue({
      contacts: [
        {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      companies: [],
      isLoading: false,
      error: null,
      addContact: vi.fn(),
      updateContact: vi.fn(),
      removeContact: vi.fn(),
      getContact: vi.fn(),
      refreshContacts: vi.fn(),
      refreshCompanies: vi.fn(),
    });

    render(
      <ContactListView
        onBack={mockOnBack}
        onNewContact={mockOnNewContact}
        onSelectContact={mockOnSelectContact}
      />
    );

    fireEvent.click(screen.getByText('John Doe'));
    expect(mockOnSelectContact).toHaveBeenCalledWith('contact-1');
  });

  it('calls onBack when clicking back button', () => {
    vi.mocked(CrmContext.useCrm).mockReturnValue({
      contacts: [],
      companies: [],
      isLoading: false,
      error: null,
      addContact: vi.fn(),
      updateContact: vi.fn(),
      removeContact: vi.fn(),
      getContact: vi.fn(),
      refreshContacts: vi.fn(),
      refreshCompanies: vi.fn(),
    });

    render(
      <ContactListView
        onBack={mockOnBack}
        onNewContact={mockOnNewContact}
        onSelectContact={mockOnSelectContact}
      />
    );

    fireEvent.click(screen.getByText('Tasks'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('calls onNewContact when clicking New Contact button', () => {
    vi.mocked(CrmContext.useCrm).mockReturnValue({
      contacts: [],
      companies: [],
      isLoading: false,
      error: null,
      addContact: vi.fn(),
      updateContact: vi.fn(),
      removeContact: vi.fn(),
      getContact: vi.fn(),
      refreshContacts: vi.fn(),
      refreshCompanies: vi.fn(),
    });

    render(
      <ContactListView
        onBack={mockOnBack}
        onNewContact={mockOnNewContact}
        onSelectContact={mockOnSelectContact}
      />
    );

    fireEvent.click(screen.getByText('New Contact'));
    expect(mockOnNewContact).toHaveBeenCalled();
  });

  it('calls onSelectContact when clicking table row', () => {
    vi.mocked(CrmContext.useCrm).mockReturnValue({
      contacts: [
        {
          id: 'contact-1',
          firstName: 'John',
          lastName: 'Doe',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      companies: [],
      isLoading: false,
      error: null,
      addContact: vi.fn(),
      updateContact: vi.fn(),
      removeContact: vi.fn(),
      getContact: vi.fn(),
      refreshContacts: vi.fn(),
      refreshCompanies: vi.fn(),
    });

    render(
      <ContactListView
        onBack={mockOnBack}
        onNewContact={mockOnNewContact}
        onSelectContact={mockOnSelectContact}
      />
    );

    const row = screen.getByRole('row', { name: /John Doe/i });
    fireEvent.click(row);
    expect(mockOnSelectContact).toHaveBeenCalledWith('contact-1');
  });
});
