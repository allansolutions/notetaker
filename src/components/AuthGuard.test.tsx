import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard } from './AuthGuard';
import { AuthProvider } from '../context/AuthContext';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while checking auth', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <AuthGuard fallback={<div>Login Page</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('shows fallback when not authenticated', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: null }),
    });

    render(
      <AuthProvider>
        <AuthGuard fallback={<div>Login Page</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows children when authenticated', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: 'user-1', email: 'test@example.com' },
          settings: null,
        }),
    });

    render(
      <AuthProvider>
        <AuthGuard fallback={<div>Login Page</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
