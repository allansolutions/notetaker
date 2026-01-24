import { useState, useEffect } from 'react';
import { teamApi } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

interface InviteDetails {
  invite: { id: string; email: string; expiresAt: number };
  team: { id: string; name: string } | null;
}

interface AcceptInvitePageProps {
  token: string;
  onAccepted: () => void;
}

export function AcceptInvitePage({ token, onAccepted }: AcceptInvitePageProps) {
  const { isAuthenticated, isLoading: authLoading, login, user } = useAuth();
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch invite details
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const details = await teamApi.getInviteByToken(token);
        setInviteDetails(details);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Invalid or expired invite link');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  // Auto-accept when authenticated (after logging in)
  useEffect(() => {
    if (isAuthenticated && inviteDetails && !isAccepting && !error) {
      handleAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, inviteDetails]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Store token and redirect to login
      sessionStorage.setItem('pendingInviteToken', token);
      login();
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      await teamApi.acceptInvite(token);
      // Clear stored token
      sessionStorage.removeItem('pendingInviteToken');
      onAccepted();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to accept invite');
      }
      setIsAccepting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading invite...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-6 px-4">
          <div className="rounded-lg border border-red-200 bg-white p-8 shadow-sm dark:border-red-800 dark:bg-gray-800">
            <div className="text-center space-y-4">
              <svg
                className="mx-auto h-12 w-12 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Invite Error
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 text-sm text-blue-500 hover:text-blue-600 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!inviteDetails || !inviteDetails.team) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Notetaker
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Team invitation
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                You've been invited to join
              </h2>
              <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {inviteDetails.team.name}
              </p>
            </div>

            {isAuthenticated ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Logged in as{' '}
                  <span className="font-medium">{user?.email}</span>
                </p>
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full rounded-lg bg-blue-500 px-4 py-3 text-white font-medium shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAccepting ? 'Joining...' : 'Accept Invitation'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Sign in to accept this invitation
                </p>
                <button
                  onClick={handleAccept}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="font-medium">Sign in with Google</span>
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
              This invitation was sent to {inviteDetails.invite.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to extract invite token from URL path.
 * Returns null if not an invite URL.
 */
export function getInviteTokenFromUrl(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/invite\/([a-f0-9]+)$/);
  return match ? match[1] : null;
}
