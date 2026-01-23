import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CompanyAutocomplete } from './CompanyAutocomplete';
import type { Contact, Company } from '../types';

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  instagram?: string;
  street?: string;
  city?: string;
  country?: string;
  companyId?: string;
  newCompanyName?: string;
}

interface ContactFormProps {
  contact?: Contact | null;
  companies: Company[];
  onSave: (data: ContactFormData) => Promise<void>;
  isSaving: boolean;
}

export function ContactForm({
  contact,
  companies,
  onSave,
  isSaving,
}: ContactFormProps): JSX.Element {
  const [firstName, setFirstName] = useState(contact?.firstName || '');
  const [lastName, setLastName] = useState(contact?.lastName || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [linkedIn, setLinkedIn] = useState(contact?.linkedIn || '');
  const [instagram, setInstagram] = useState(contact?.instagram || '');
  const [street, setStreet] = useState(contact?.street || '');
  const [city, setCity] = useState(contact?.city || '');
  const [country, setCountry] = useState(contact?.country || '');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(
    contact?.company || null
  );
  const [newCompanyName, setNewCompanyName] = useState('');

  // Update form when contact changes (e.g., when loading a contact by ID)
  useEffect(() => {
    if (contact) {
      setFirstName(contact.firstName);
      setLastName(contact.lastName);
      setEmail(contact.email || '');
      setPhone(contact.phone || '');
      setLinkedIn(contact.linkedIn || '');
      setInstagram(contact.instagram || '');
      setStreet(contact.street || '');
      setCity(contact.city || '');
      setCountry(contact.country || '');
      setSelectedCompany(contact.company || null);
      setNewCompanyName('');
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      linkedIn: linkedIn.trim() || undefined,
      instagram: instagram.trim() || undefined,
      street: street.trim() || undefined,
      city: city.trim() || undefined,
      country: country.trim() || undefined,
      companyId: selectedCompany?.id,
      newCompanyName: newCompanyName.trim() || undefined,
    });
  };

  const isValid = firstName.trim() && lastName.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity Section */}
      <section>
        <h3 className="text-small font-medium text-muted mb-3">Name</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="sr-only">
              First Name
            </label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name *"
              required
            />
          </div>
          <div>
            <label htmlFor="lastName" className="sr-only">
              Last Name
            </label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name *"
              required
            />
          </div>
        </div>
      </section>

      {/* Contact Info Section */}
      <section>
        <h3 className="text-small font-medium text-muted mb-3">Contact</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
          </div>
          <div>
            <label htmlFor="phone" className="sr-only">
              Phone
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
            />
          </div>
        </div>
      </section>

      {/* Social Section */}
      <section>
        <h3 className="text-small font-medium text-muted mb-3">Social</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="linkedIn" className="sr-only">
              LinkedIn
            </label>
            <Input
              id="linkedIn"
              type="text"
              value={linkedIn}
              onChange={(e) => setLinkedIn(e.target.value)}
              placeholder="LinkedIn URL"
            />
          </div>
          <div>
            <label htmlFor="instagram" className="sr-only">
              Instagram
            </label>
            <Input
              id="instagram"
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="Instagram handle"
            />
          </div>
        </div>
      </section>

      {/* Company Section */}
      <section>
        <h3 className="text-small font-medium text-muted mb-3">Company</h3>
        <CompanyAutocomplete
          companies={companies}
          selectedCompany={selectedCompany}
          newCompanyName={newCompanyName}
          onSelectCompany={setSelectedCompany}
          onNewCompanyNameChange={setNewCompanyName}
        />
      </section>

      {/* Address Section */}
      <section>
        <h3 className="text-small font-medium text-muted mb-3">Address</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="street" className="sr-only">
              Street
            </label>
            <Input
              id="street"
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Street"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="sr-only">
                City
              </label>
              <Input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <label htmlFor="country" className="sr-only">
                Country
              </label>
              <Input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="pt-4">
        <Button type="submit" disabled={!isValid || isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
