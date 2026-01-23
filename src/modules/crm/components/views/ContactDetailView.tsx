import { useState, useEffect } from 'react';
import { useCrm } from '../../context/CrmContext';
import { BackButton } from '@/components/BackButton';
import { ContactForm, ContactFormData } from '../ContactForm';
import type { Contact } from '../../types';

interface ContactDetailViewProps {
  contactId: string | null; // null means new contact
  onBack: () => void;
  onSaved: () => void;
}

export function ContactDetailView({
  contactId,
  onBack,
  onSaved,
}: ContactDetailViewProps): JSX.Element {
  const { companies, addContact, updateContact, getContact } = useCrm();
  const [contact, setContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(!!contactId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNewContact = !contactId;

  // Load contact if editing
  useEffect(() => {
    if (contactId) {
      setIsLoading(true);
      setError(null);
      getContact(contactId)
        .then((data) => {
          if (data) {
            setContact(data);
          } else {
            setError('Contact not found');
          }
        })
        .catch(() => {
          setError('Failed to load contact');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [contactId, getContact]);

  const handleSave = async (data: ContactFormData) => {
    setIsSaving(true);
    setError(null);

    try {
      if (isNewContact) {
        const result = await addContact({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          linkedIn: data.linkedIn,
          instagram: data.instagram,
          street: data.street,
          city: data.city,
          country: data.country,
          companyId: data.companyId,
          newCompanyName: data.newCompanyName,
        });
        if (result) {
          onSaved();
        } else {
          setError('Failed to create contact');
        }
      } else if (contactId) {
        const result = await updateContact(contactId, {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          linkedIn: data.linkedIn,
          instagram: data.instagram,
          street: data.street,
          city: data.city,
          country: data.country,
          companyId: data.companyId,
          newCompanyName: data.newCompanyName,
        });
        if (result) {
          onSaved();
        } else {
          setError('Failed to update contact');
        }
      }
    } catch {
      setError('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const getTitle = (): string => {
    if (isNewContact) return 'New Contact';
    if (contact) return `${contact.firstName} ${contact.lastName}`;
    return 'Loading...';
  };
  const title = getTitle();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <BackButton onClick={onBack} label="Contacts" />
        <h1 className="text-lg font-semibold text-primary">{title}</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-small">
          {error}
        </div>
      )}

      {isLoading && <p className="text-muted italic">Loading contact...</p>}
      {!isLoading && !isNewContact && !contact && (
        <p className="text-muted italic">Contact not found.</p>
      )}
      {!isLoading && (isNewContact || contact) && (
        <div className="max-w-md">
          <ContactForm
            contact={contact}
            companies={companies}
            onSave={handleSave}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
}
