import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleConnectButton } from './GoogleConnectButton';

vi.mock('../context/GoogleAuthContext', () => ({
  useGoogleAuth: vi.fn(),
}));

import { useGoogleAuth } from '../context/GoogleAuthContext';

const mockUseGoogleAuth = useGoogleAuth as ReturnType<typeof vi.fn>;

describe('GoogleConnectButton', () => {
  it('shows loading state', () => {
    mockUseGoogleAuth.mockReturnValue({
      isConnected: false,
      isLoading: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<GoogleConnectButton />);

    expect(screen.getByTestId('google-auth-loading')).toHaveTextContent(
      'Loading...'
    );
  });

  it('shows error state', () => {
    mockUseGoogleAuth.mockReturnValue({
      isConnected: false,
      isLoading: false,
      error: 'Something went wrong',
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<GoogleConnectButton />);

    expect(screen.getByTestId('google-auth-error')).toHaveTextContent(
      'Something went wrong'
    );
  });

  it('shows connect button when not connected', () => {
    mockUseGoogleAuth.mockReturnValue({
      isConnected: false,
      isLoading: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<GoogleConnectButton />);

    expect(screen.getByTestId('google-connect-button')).toHaveTextContent(
      'Connect Google Calendar'
    );
  });

  it('calls connect when connect button clicked', async () => {
    const user = userEvent.setup();
    const mockConnect = vi.fn();

    mockUseGoogleAuth.mockReturnValue({
      isConnected: false,
      isLoading: false,
      connect: mockConnect,
      disconnect: vi.fn(),
    });

    render(<GoogleConnectButton />);

    await user.click(screen.getByTestId('google-connect-button'));

    expect(mockConnect).toHaveBeenCalled();
  });

  it('shows email and disconnect when connected', () => {
    mockUseGoogleAuth.mockReturnValue({
      isConnected: true,
      isLoading: false,
      email: 'test@example.com',
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<GoogleConnectButton />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('google-disconnect-button')).toHaveTextContent(
      'Disconnect Calendar'
    );
  });

  it('calls disconnect when disconnect button clicked', async () => {
    const user = userEvent.setup();
    const mockDisconnect = vi.fn();

    mockUseGoogleAuth.mockReturnValue({
      isConnected: true,
      isLoading: false,
      email: 'test@example.com',
      connect: vi.fn(),
      disconnect: mockDisconnect,
    });

    render(<GoogleConnectButton />);

    await user.click(screen.getByTestId('google-disconnect-button'));

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('shows email with title attribute for truncated emails', () => {
    mockUseGoogleAuth.mockReturnValue({
      isConnected: true,
      isLoading: false,
      email: 'verylongemail@example.com',
      connect: vi.fn(),
      disconnect: vi.fn(),
    });

    render(<GoogleConnectButton />);

    const emailSpan = screen.getByText('verylongemail@example.com');
    expect(emailSpan).toHaveAttribute('title', 'verylongemail@example.com');
  });
});
