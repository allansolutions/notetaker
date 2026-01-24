import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsMenu } from './SettingsMenu';
import { AuthProvider } from '../context/AuthContext';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const mockCreateObjectURL = vi.fn(() => 'blob:test-url');
const mockRevokeObjectURL = vi.fn();
URL.createObjectURL = mockCreateObjectURL;
URL.revokeObjectURL = mockRevokeObjectURL;

function renderWithAuth() {
  return render(
    <AuthProvider>
      <SettingsMenu />
    </AuthProvider>
  );
}

describe('SettingsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock initial auth check
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          settings: null,
        }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings icon button', async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Settings' })
      ).toBeInTheDocument();
    });
  });

  it('opens popover when clicked', async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Settings' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(await screen.findByText('Export Data')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('shows user email in popover', async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Settings' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(await screen.findByText('test@example.com')).toBeInTheDocument();
  });

  it('triggers export and downloads file', async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Settings' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    // Mock export API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          exportedAt: Date.now(),
          version: '1.0',
          tasks: [],
          wikiPages: [],
          crm: { contacts: [], companies: [] },
          entityLinks: [],
        }),
    });

    const exportButton = await screen.findByText('Export Data');

    // Mock click handler for download link
    const mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') {
        element.click = mockClick;
      }
      return element;
    });

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/export'),
        expect.objectContaining({ credentials: 'include' })
      );
    });

    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  it('calls logout when logout button is clicked', async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Settings' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    // Mock logout API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const logoutButton = await screen.findByText('Logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
  });

  it('handles export error gracefully', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    renderWithAuth();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Settings' })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    // Mock export API error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const exportButton = await screen.findByText('Export Data');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Export failed:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });
});
