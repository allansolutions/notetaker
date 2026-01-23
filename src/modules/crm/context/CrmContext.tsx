import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import type { Contact, Company } from '../types';
import { contactApi, companyApi } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

interface CrmContextType {
  contacts: Contact[];
  companies: Company[];
  isLoading: boolean;
  error: string | null;
  addContact: (
    contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'company'> & {
      newCompanyName?: string;
    }
  ) => Promise<Contact | null>;
  updateContact: (
    id: string,
    updates: Partial<
      Omit<Contact, 'id' | 'createdAt' | 'company'> & {
        newCompanyName?: string;
      }
    >
  ) => Promise<Contact | null>;
  removeContact: (id: string) => Promise<void>;
  getContact: (id: string) => Promise<Contact | null>;
  refreshContacts: () => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const CrmContext = createContext<CrmContextType | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!isAuthenticated) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await contactApi.getAll();
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchCompanies = useCallback(async () => {
    if (!isAuthenticated) {
      setCompanies([]);
      return;
    }

    try {
      const data = await companyApi.getAll();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
  }, [fetchContacts, fetchCompanies]);

  const addContact = useCallback(
    async (
      contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'company'> & {
        newCompanyName?: string;
      }
    ): Promise<Contact | null> => {
      try {
        const newContact = await contactApi.create(contact);
        setContacts((prev) => [...prev, newContact]);
        // Refresh companies in case a new one was created
        if (contact.newCompanyName) {
          await fetchCompanies();
        }
        return newContact;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create contact'
        );
        return null;
      }
    },
    [fetchCompanies]
  );

  const updateContact = useCallback(
    async (
      id: string,
      updates: Partial<
        Omit<Contact, 'id' | 'createdAt' | 'company'> & {
          newCompanyName?: string;
        }
      >
    ): Promise<Contact | null> => {
      try {
        const updatedContact = await contactApi.update(id, updates);
        setContacts((prev) =>
          prev.map((c) => (c.id === id ? updatedContact : c))
        );
        // Refresh companies in case a new one was created
        if (updates.newCompanyName) {
          await fetchCompanies();
        }
        return updatedContact;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update contact'
        );
        return null;
      }
    },
    [fetchCompanies]
  );

  const removeContact = useCallback(async (id: string) => {
    try {
      await contactApi.delete(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  }, []);

  const getContact = useCallback(
    async (id: string): Promise<Contact | null> => {
      try {
        return await contactApi.get(id);
      } catch {
        return null;
      }
    },
    []
  );

  return (
    <CrmContext.Provider
      value={{
        contacts,
        companies,
        isLoading,
        error,
        addContact,
        updateContact,
        removeContact,
        getContact,
        refreshContacts: fetchContacts,
        refreshCompanies: fetchCompanies,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
}
