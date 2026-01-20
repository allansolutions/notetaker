import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleAuthProvider, useGoogleAuth } from './GoogleAuthContext';

function TestComponent() {
  const auth = useGoogleAuth();
  return (
    <div>
      <span data-testid="is-connected">{String(auth.isConnected)}</span>
      <span data-testid="is-loading">{String(auth.isLoading)}</span>
      <span data-testid="email">{auth.email || 'none'}</span>
      <span data-testid="error">{auth.error || 'none'}</span>
      <button onClick={auth.connect}>Connect</button>
      <button onClick={auth.refresh}>Refresh</button>
    </div>
  );
}

describe('GoogleAuthContext', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    vi.useRealTimers();
  });

  it('throws when used outside provider', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useGoogleAuth must be used within a GoogleAuthProvider'
    );

    consoleError.mockRestore();
  });

  it('fetches auth status on mount', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ isConnected: true, email: 'test@example.com' }),
    } as Response);

    render(
      <GoogleAuthProvider>
        <TestComponent />
      </GoogleAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('is-connected').textContent).toBe('true');
    expect(screen.getByTestId('email').textContent).toBe('test@example.com');
  });

  it('handles fetch error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(
      <GoogleAuthProvider>
        <TestComponent />
      </GoogleAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('is-connected').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe(
      'Failed to check authentication status'
    );
  });

  it('redirects on connect', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isConnected: false }),
    } as Response);

    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    render(
      <GoogleAuthProvider>
        <TestComponent />
      </GoogleAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });

    await user.click(screen.getByText('Connect'));
    expect(mockLocation.href).toBe('/auth/google');
  });

  it('refreshes auth status', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isConnected: false }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ isConnected: true, email: 'new@example.com' }),
      } as Response);

    render(
      <GoogleAuthProvider>
        <TestComponent />
      </GoogleAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-connected').textContent).toBe('false');
    });

    await user.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('is-connected').textContent).toBe('true');
      expect(screen.getByTestId('email').textContent).toBe('new@example.com');
    });
  });

  it('handles auth error from URL', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isConnected: false }),
    } as Response);

    const mockReplaceState = vi.fn();
    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = mockReplaceState;

    Object.defineProperty(window, 'location', {
      value: {
        search: '?auth_error=access_denied',
        pathname: '/',
      },
      writable: true,
    });

    render(
      <GoogleAuthProvider>
        <TestComponent />
      </GoogleAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('access_denied');
    });

    expect(mockReplaceState).toHaveBeenCalledWith({}, '', '/');

    window.history.replaceState = originalReplaceState;
  });
});
