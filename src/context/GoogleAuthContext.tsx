import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { GoogleAuthState } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

interface GoogleAuthContextType extends GoogleAuthState {
  connect: () => void;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GoogleAuthState>({
    isConnected: false,
    isLoading: true,
  });

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/status`, {
        credentials: 'include',
      });
      const data = await response.json();
      setState({
        isConnected: data.isConnected,
        email: data.email,
        isLoading: false,
      });
    } catch {
      setState({
        isConnected: false,
        isLoading: false,
        error: 'Failed to check authentication status',
      });
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Check for auth errors in URL (from OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) {
      setState((prev) => ({
        ...prev,
        error: decodeURIComponent(authError),
      }));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const connect = useCallback(() => {
    window.location.href = `${API_URL}/auth/google`;
  }, []);

  const disconnect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setState({
        isConnected: false,
        isLoading: false,
      });
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to disconnect',
      }));
    }
  }, []);

  const refresh = useCallback(async () => {
    await checkStatus();
  }, [checkStatus]);

  return (
    <GoogleAuthContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        refresh,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
}
