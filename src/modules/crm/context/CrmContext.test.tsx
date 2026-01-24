/* eslint-disable sonarjs/no-nested-functions */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { CrmProvider, useCrm } from './CrmContext';
import { AuthProvider } from '@/context/AuthContext';
import * as apiClient from '@/api/client';

// Mock the API client
vi.mock('@/api/client', () => ({
  contactApi: {
    getAll: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  companyApi: {
    getAll: vi.fn(),
    search: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider>
        <CrmProvider>{children}</CrmProvider>
      </AuthProvider>
    );
  };
}

describe('CrmContext', () => {
  beforeEach(() => {
    // Mock authenticated user
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: 'user-1', email: 'test@example.com' },
          settings: null,
        }),
    });

    // Default mock implementations
    vi.mocked(apiClient.contactApi.getAll).mockResolvedValue([]);
    vi.mocked(apiClient.companyApi.getAll).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useCrm', () => {
    it('throws error when used outside CrmProvider', () => {
      expect(() => {
        renderHook(() => useCrm());
      }).toThrow('useCrm must be used within a CrmProvider');
    });
  });

  describe('CrmProvider', () => {
    it('shows loading state while fetching contacts', async () => {
      let resolveGetAll: (value: never[]) => void;
      vi.mocked(apiClient.contactApi.getAll).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveGetAll = resolve;
          })
      );

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      // Wait for auth to complete and fetch to start
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the fetch
      await act(async () => {
        resolveGetAll!([]);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('handles API error when fetching contacts', async () => {
      vi.mocked(apiClient.contactApi.getAll).mockReset();
      vi.mocked(apiClient.contactApi.getAll).mockRejectedValue(
        new Error('Failed to fetch')
      );

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch');
      });
      expect(result.current.contacts).toEqual([]);
    });

    it('creates contact successfully', async () => {
      const createdContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.contactApi.create).mockResolvedValueOnce(
        createdContact
      );

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newContact = await act(async () => {
        return result.current.addContact({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        });
      });

      expect(newContact).not.toBeNull();
      expect(newContact?.firstName).toBe('John');
      expect(result.current.contacts).toHaveLength(1);
    });

    it('handles error when creating contact fails', async () => {
      vi.mocked(apiClient.contactApi.create).mockRejectedValueOnce(
        new Error('Create failed')
      );

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      await waitFor(() => {
        expect(apiClient.contactApi.getAll).toHaveBeenCalled();
      });

      const createdContact = await act(async () => {
        return result.current.addContact({
          firstName: 'John',
          lastName: 'Doe',
        });
      });

      expect(createdContact).toBeNull();
      await waitFor(() => {
        expect(result.current.error).toBe('Create failed');
      });
    });

    it('updates contact successfully', async () => {
      const existingContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updatedContact = {
        ...existingContact,
        firstName: 'Jane',
      };
      vi.mocked(apiClient.contactApi.getAll).mockResolvedValueOnce([
        existingContact,
      ]);
      vi.mocked(apiClient.contactApi.update).mockResolvedValueOnce(
        updatedContact
      );

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.contacts).toHaveLength(1);
      });

      const updated = await act(async () => {
        return result.current.updateContact('contact-1', { firstName: 'Jane' });
      });

      expect(updated?.firstName).toBe('Jane');
      expect(result.current.contacts[0].firstName).toBe('Jane');
    });

    it('handles error when updating contact fails', async () => {
      const existingContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.contactApi.getAll).mockResolvedValueOnce([
        existingContact,
      ]);
      vi.mocked(apiClient.contactApi.update).mockRejectedValueOnce(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.contacts).toHaveLength(1);
      });

      const updated = await act(async () => {
        return result.current.updateContact('contact-1', { firstName: 'Jane' });
      });

      expect(updated).toBeNull();
      expect(result.current.error).toBe('Update failed');
    });

    it('deletes contact successfully', async () => {
      const existingContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.contactApi.getAll).mockResolvedValueOnce([
        existingContact,
      ]);
      vi.mocked(apiClient.contactApi.delete).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.contacts).toHaveLength(1);
      });

      await act(async () => {
        await result.current.removeContact('contact-1');
      });

      expect(result.current.contacts).toHaveLength(0);
    });

    it('handles error when deleting contact fails', async () => {
      const existingContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.contactApi.getAll).mockResolvedValueOnce([
        existingContact,
      ]);
      vi.mocked(apiClient.contactApi.delete).mockRejectedValueOnce(
        new Error('Delete failed')
      );

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.contacts).toHaveLength(1);
      });

      await act(async () => {
        await result.current.removeContact('contact-1');
      });

      expect(result.current.error).toBe('Delete failed');
    });

    it('gets contact by id', async () => {
      const contact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.contactApi.get).mockResolvedValueOnce(contact);

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchedContact = await act(async () => {
        return result.current.getContact('contact-1');
      });

      expect(fetchedContact?.id).toBe('contact-1');
      expect(fetchedContact?.firstName).toBe('John');
    });

    it('returns null when getting contact fails', async () => {
      vi.mocked(apiClient.contactApi.get).mockRejectedValueOnce(
        new Error('Not found')
      );

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const fetchedContact = await act(async () => {
        return result.current.getContact('non-existent');
      });

      expect(fetchedContact).toBeNull();
    });

    it('does not fetch contacts when not authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: null }),
      });

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.contacts).toEqual([]);
      expect(apiClient.contactApi.getAll).not.toHaveBeenCalled();
    });

    it('refreshes companies when creating contact with new company', async () => {
      const createdContact = {
        id: 'contact-1',
        firstName: 'John',
        lastName: 'Doe',
        companyId: 'company-1',
        company: {
          id: 'company-1',
          name: 'Acme Corp',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      vi.mocked(apiClient.contactApi.create).mockResolvedValueOnce(
        createdContact
      );
      vi.mocked(apiClient.companyApi.getAll).mockResolvedValue([
        {
          id: 'company-1',
          name: 'Acme Corp',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);

      const { result } = renderHook(() => useCrm(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addContact({
          firstName: 'John',
          lastName: 'Doe',
          newCompanyName: 'Acme Corp',
        });
      });

      // Companies should have been refreshed
      expect(apiClient.companyApi.getAll).toHaveBeenCalledTimes(2);
    });
  });
});
