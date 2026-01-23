import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from './ContactForm';

describe('ContactForm', () => {
  const mockOnSave = vi.fn();
  const companies = [
    {
      id: 'company-1',
      name: 'Acme Corp',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'company-2',
      name: 'Tech Inc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  it('renders all form sections', () => {
    render(
      <ContactForm companies={companies} onSave={mockOnSave} isSaving={false} />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
  });

  it('disables save button when firstName or lastName is empty', () => {
    render(
      <ContactForm companies={companies} onSave={mockOnSave} isSaving={false} />
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when required fields are filled', () => {
    render(
      <ContactForm companies={companies} onSave={mockOnSave} isSaving={false} />
    );

    fireEvent.change(screen.getByPlaceholderText('First name *'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name *'), {
      target: { value: 'Doe' },
    });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).not.toBeDisabled();
  });

  it('shows saving state', () => {
    render(
      <ContactForm companies={companies} onSave={mockOnSave} isSaving={true} />
    );

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('calls onSave with form data', async () => {
    render(
      <ContactForm companies={companies} onSave={mockOnSave} isSaving={false} />
    );

    fireEvent.change(screen.getByPlaceholderText('First name *'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name *'), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Phone'), {
      target: { value: '123-456-7890' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
        })
      );
    });
  });

  it('populates form with existing contact data', () => {
    const contact = {
      id: 'contact-1',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '555-1234',
      linkedIn: 'linkedin.com/jane',
      instagram: '@jane',
      street: '123 Main St',
      city: 'New York',
      country: 'USA',
      company: companies[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    render(
      <ContactForm
        contact={contact}
        companies={companies}
        onSave={mockOnSave}
        isSaving={false}
      />
    );

    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('linkedin.com/jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('@jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New York')).toBeInTheDocument();
    expect(screen.getByDisplayValue('USA')).toBeInTheDocument();
  });

  it('updates form when contact prop changes', () => {
    const { rerender } = render(
      <ContactForm
        contact={null}
        companies={companies}
        onSave={mockOnSave}
        isSaving={false}
      />
    );

    expect(screen.getByPlaceholderText('First name *')).toHaveValue('');

    const contact = {
      id: 'contact-1',
      firstName: 'Updated',
      lastName: 'Contact',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    rerender(
      <ContactForm
        contact={contact}
        companies={companies}
        onSave={mockOnSave}
        isSaving={false}
      />
    );

    expect(screen.getByDisplayValue('Updated')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Contact')).toBeInTheDocument();
  });

  it('trims whitespace from field values', async () => {
    render(
      <ContactForm companies={companies} onSave={mockOnSave} isSaving={false} />
    );

    fireEvent.change(screen.getByPlaceholderText('First name *'), {
      target: { value: '  John  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name *'), {
      target: { value: '  Doe  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });
  });

  it('converts empty strings to undefined', async () => {
    render(
      <ContactForm companies={companies} onSave={mockOnSave} isSaving={false} />
    );

    fireEvent.change(screen.getByPlaceholderText('First name *'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name *'), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: '  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          email: undefined,
        })
      );
    });
  });
});
