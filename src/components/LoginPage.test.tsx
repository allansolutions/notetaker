import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../context/AuthContext';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: null }),
    });
  });

  it('renders login page with title', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(screen.getByText('Notetaker')).toBeInTheDocument();
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
  });

  it('renders Google sign in button', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    // Wait for loading to finish
    const button = await screen.findByRole('button', {
      name: /continue with google/i,
    });
    expect(button).toBeInTheDocument();
  });

  it('calls login when button is clicked', async () => {
    const originalLocation = window.location;
    delete (window as unknown as { location?: Location }).location;
    window.location = { ...originalLocation, href: '' } as Location;

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    // Wait for button to be enabled
    const button = await screen.findByRole('button', {
      name: /continue with google/i,
    });
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    fireEvent.click(button);

    expect(window.location.href).toBe('/auth/google');

    window.location = originalLocation;
  });

  it('shows loading state while checking auth', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(
      screen.getByRole('button', { name: /loading/i })
    ).toBeInTheDocument();
  });

  it('shows error message when auth error present', async () => {
    // Set URL before rendering
    const originalSearch = window.location.search;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?auth_error=access_denied' },
      writable: true,
    });

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    // Wait for error to be parsed and verify it's displayed
    const errorElement = await screen.findByText('access_denied');
    expect(errorElement).toBeInTheDocument();

    // Restore
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: originalSearch },
      writable: true,
    });
  });
});
