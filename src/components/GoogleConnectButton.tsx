import { useGoogleAuth } from '../context/GoogleAuthContext';

export function GoogleConnectButton() {
  const { isConnected, isLoading, email, error, connect, disconnect } =
    useGoogleAuth();

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
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted truncate" title={email}>
          {email}
        </span>
        <button
          type="button"
          onClick={disconnect}
          className="text-xs text-muted hover:text-default underline text-left"
          data-testid="google-disconnect-button"
        >
          Disconnect Calendar
        </button>
      </div>
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
