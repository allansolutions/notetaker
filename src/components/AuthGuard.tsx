import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface AuthGuardProps {
  children: ReactNode;
  fallback: ReactNode;
}

function LoadingSpinner(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export function AuthGuard({ children, fallback }: AuthGuardProps): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <>{isAuthenticated ? children : fallback}</>;
}
