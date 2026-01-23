import { useCrm } from '../../context/CrmContext';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import type { Contact } from '../../types';

interface ContactListViewProps {
  onBack: () => void;
  onNewContact: () => void;
  onSelectContact: (id: string) => void;
}

export function ContactListView({
  onBack,
  onNewContact,
  onSelectContact,
}: ContactListViewProps): JSX.Element {
  const { contacts, isLoading } = useCrm();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} label="Tasks" />
          <h1 className="text-lg font-semibold text-primary">Contacts</h1>
        </div>
        <Button onClick={onNewContact}>New Contact</Button>
      </div>

      {isLoading && <p className="text-muted italic">Loading contacts...</p>}
      {!isLoading && contacts.length === 0 && (
        <p className="text-muted italic">
          No contacts yet.{' '}
          <button
            type="button"
            onClick={onNewContact}
            className="text-accent hover:underline"
          >
            Create your first contact
          </button>
        </p>
      )}
      {!isLoading && contacts.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-alt border-b border-border">
                <th className="text-left py-2 px-4 text-small font-medium text-muted">
                  Name
                </th>
                <th className="text-left py-2 px-4 text-small font-medium text-muted">
                  Company
                </th>
                <th className="text-left py-2 px-4 text-small font-medium text-muted">
                  Email
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onClick={() => onSelectContact(contact.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ContactRowProps {
  contact: Contact;
  onClick: () => void;
}

function ContactRow({ contact, onClick }: ContactRowProps): JSX.Element {
  return (
    <tr
      className="border-b border-border last:border-b-0 hover:bg-surface-alt cursor-pointer"
      onClick={onClick}
    >
      <td className="py-2 px-4">
        <button
          type="button"
          className="text-primary hover:text-accent hover:underline text-left"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {contact.firstName} {contact.lastName}
        </button>
      </td>
      <td className="py-2 px-4 text-muted">{contact.company?.name || '-'}</td>
      <td className="py-2 px-4 text-muted">{contact.email || '-'}</td>
    </tr>
  );
}
