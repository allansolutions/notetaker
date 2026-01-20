/* eslint-disable sonarjs/no-nested-functions */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useAuth', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });

  describe('AuthProvider', () => {
    it('initializes with loading state', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('sets authenticated state when user is logged in', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
            },
            settings: { theme: 'light', sidebarWidth: 300 },
          }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.settings?.theme).toBe('light');
    });

    it('sets unauthenticated state when no user', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: null }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('handles API error gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('handles network error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe(
        'Failed to check authentication status'
      );
    });

    it('parses auth_error from URL', async () => {
      // Set URL before rendering
      const originalSearch = window.location.search;
      Object.defineProperty(window, 'location', {
        value: { ...window.location, search: '?auth_error=access_denied' },
        writable: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: null }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.error).toBe('access_denied');
      });

      // Restore
      Object.defineProperty(window, 'location', {
        value: { ...window.location, search: originalSearch },
        writable: true,
      });
    });

    describe('login', () => {
      it('redirects to auth endpoint', async () => {
        const originalLocation = window.location;
        delete (window as unknown as { location?: Location }).location;
        window.location = { ...originalLocation, href: '' } as Location;

        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ user: null }),
        });

        const { result } = renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        result.current.login();

        expect(window.location.href).toBe('/auth/google');

        window.location = originalLocation;
      });
    });

    describe('logout', () => {
      it('calls logout endpoint and clears user', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                user: { id: 'user-1', email: 'test@example.com' },
                settings: null,
              }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          });

        const { result } = renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          await result.current.logout();
        });

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
      });

      it('handles logout error', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                user: { id: 'user-1', email: 'test@example.com' },
                settings: null,
              }),
          })
          .mockRejectedValueOnce(new Error('Logout failed'));

        const { result } = renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });

        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });

        await act(async () => {
          await result.current.logout();
        });

        expect(result.current.error).toBe('Failed to logout');
      });
    });

    describe('refresh', () => {
      it('re-fetches auth status', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ user: null }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                user: { id: 'user-1', email: 'test@example.com' },
                settings: null,
              }),
          });

        const { result } = renderHook(() => useAuth(), {
          wrapper: AuthProvider,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.isAuthenticated).toBe(false);

        await act(async () => {
          await result.current.refresh();
        });

        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });
});
