import { useGoogleAuth } from '../context/GoogleAuthContext';

export function GoogleConnectButton() {
  const { isConnected, isLoading, email, error, connect } = useGoogleAuth();

  if (isLoading) {
    return (
      <div className="text-xs text-muted" data-testid="google-auth-loading">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-500" data-testid="google-auth-error">
        {error}
      </div>
    );
  }

  if (isConnected) {
    return (
      <span
        className="text-xs text-muted truncate"
        title={email}
        data-testid="google-connected-email"
      >
        {email}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      className="text-xs text-accent hover:text-accent-hover underline"
      data-testid="google-connect-button"
    >
      Connect Google Calendar
    </button>
  );
}
