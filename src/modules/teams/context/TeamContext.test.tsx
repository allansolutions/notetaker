/* eslint-disable sonarjs/no-nested-functions */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { TeamProvider, useTeam } from './TeamContext';
import { AuthProvider } from '@/context/AuthContext';
import * as apiClient from '@/api/client';
import type { Team, TeamMember, TeamInvite } from '../types';

// Helper functions to create properly typed mock objects
const createMockTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-1',
  name: 'Team A',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

const createMockMember = (overrides: Partial<TeamMember> = {}): TeamMember => ({
  id: 'member-1',
  teamId: 'team-1',
  userId: 'user-1',
  role: 'admin',
  createdAt: Date.now(),
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: null,
  },
  ...overrides,
});

const createMockInvite = (overrides: Partial<TeamInvite> = {}): TeamInvite => ({
  id: 'invite-1',
  teamId: 'team-1',
  email: 'new@example.com',
  token: 'abc123',
  invitedBy: 'user-1',
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  acceptedAt: null,
  createdAt: Date.now(),
  ...overrides,
});

// Mock the API client - preserve other exports, only mock teamApi
vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>();
  return {
    ...actual,
    teamApi: {
      getAll: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getMembers: vi.fn(),
      removeMember: vi.fn(),
      createInvite: vi.fn(),
    },
  };
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider>
        <TeamProvider>{children}</TeamProvider>
      </AuthProvider>
    );
  };
}

describe('TeamContext', () => {
  beforeEach(() => {
    localStorage.clear();

    // Mock authenticated user
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: 'user-1', email: 'test@example.com' },
          settings: null,
        }),
    });

    // Default mock implementations
    vi.mocked(apiClient.teamApi.getAll).mockResolvedValue([]);
    vi.mocked(apiClient.teamApi.getMembers).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  describe('useTeam', () => {
    it('throws error when used outside TeamProvider', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTeam());
      }).toThrow('useTeam must be used within a TeamProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('TeamProvider', () => {
    it('shows loading state while fetching teams', async () => {
      let resolveGetAll: (value: never[]) => void;
      vi.mocked(apiClient.teamApi.getAll).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveGetAll = resolve;
          })
      );

      const { result } = renderHook(() => useTeam(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveGetAll!([]);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('fetches teams on mount when authenticated', async () => {
      const teams = [
        createMockTeam({ id: 'team-1', name: 'Team A' }),
        createMockTeam({ id: 'team-2', name: 'Team B' }),
      ];
      vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);

      const { result } = renderHook(() => useTeam(), {
        wrapper: createWrapper(),
      });

      // Wait for auth and teams to be fetched
      await waitFor(() => {
        expect(apiClient.teamApi.getAll).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.teams).toEqual(teams);
      expect(result.current.activeTeam).toEqual(teams[0]);
    });

    it('does not fetch teams when not authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: null }),
      });

      const { result } = renderHook(() => useTeam(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.teams).toEqual([]);
      expect(apiClient.teamApi.getAll).not.toHaveBeenCalled();
    });

    it('restores active team from localStorage', async () => {
      const teams = [
        createMockTeam({ id: 'team-1', name: 'Team A' }),
        createMockTeam({ id: 'team-2', name: 'Team B' }),
      ];
      localStorage.setItem('activeTeamId', 'team-2');
      vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);

      const { result } = renderHook(() => useTeam(), {
        wrapper: createWrapper(),
      });

      // Wait for teams to be fetched and active team to be set
      await waitFor(() => {
        expect(result.current.activeTeam).toEqual(teams[1]);
      });
    });

    it('handles API error when fetching teams', async () => {
      vi.mocked(apiClient.teamApi.getAll).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useTeam(), {
        wrapper: createWrapper(),
      });

      // Wait for the error to be set
      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('fetches members when active team changes', async () => {
      const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
      const members = [
        createMockMember({ id: 'member-1', userId: 'user-1', role: 'admin' }),
      ];
      vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
      vi.mocked(apiClient.teamApi.getMembers).mockResolvedValue(members);

      const { result } = renderHook(() => useTeam(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(apiClient.teamApi.getMembers).toHaveBeenCalledWith('team-1');
      });

      await waitFor(() => {
        expect(result.current.members).toEqual(members);
      });
    });

    it('computes userRole from members', async () => {
      const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
      const members = [
        createMockMember({ id: 'member-1', userId: 'user-1', role: 'admin' }),
      ];
      vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
      vi.mocked(apiClient.teamApi.getMembers).mockResolvedValue(members);

      const { result } = renderHook(() => useTeam(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userRole).toBe('admin');
      });
    });

    describe('setActiveTeam', () => {
      it('changes active team and saves to localStorage', async () => {
        const teams = [
          createMockTeam({ id: 'team-1', name: 'Team A' }),
          createMockTeam({ id: 'team-2', name: 'Team B' }),
        ];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        // Wait for teams to load
        await waitFor(() => {
          expect(result.current.teams).toHaveLength(2);
        });

        act(() => {
          result.current.setActiveTeam('team-2');
        });

        expect(result.current.activeTeam?.id).toBe('team-2');
        expect(localStorage.getItem('activeTeamId')).toBe('team-2');
      });

      it('clears active team when set to null', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.activeTeam).not.toBeNull();
        });

        act(() => {
          result.current.setActiveTeam(null);
        });

        expect(result.current.activeTeam).toBeNull();
        expect(localStorage.getItem('activeTeamId')).toBeNull();
      });
    });

    describe('createTeam', () => {
      it('creates team and sets it as active', async () => {
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue([]);
        const newTeam = createMockTeam({ id: 'team-new', name: 'New Team' });
        vi.mocked(apiClient.teamApi.create).mockResolvedValue(newTeam);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        let createdTeam;
        await act(async () => {
          createdTeam = await result.current.createTeam('New Team');
        });

        expect(createdTeam).toEqual(newTeam);
        expect(result.current.teams).toContainEqual(newTeam);
        expect(result.current.activeTeam).toEqual(newTeam);
        expect(localStorage.getItem('activeTeamId')).toBe('team-new');
      });

      it('handles create error', async () => {
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue([]);
        vi.mocked(apiClient.teamApi.create).mockRejectedValue(
          new Error('Create failed')
        );

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        let createdTeam;
        await act(async () => {
          createdTeam = await result.current.createTeam('New Team');
        });

        expect(createdTeam).toBeNull();
        expect(result.current.error).toBe('Create failed');
      });
    });

    describe('updateTeam', () => {
      it('updates team in list', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        const updatedTeam = createMockTeam({
          id: 'team-1',
          name: 'Team A Updated',
        });
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.update).mockResolvedValue(updatedTeam);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        // Wait for teams to load
        await waitFor(() => {
          expect(result.current.activeTeam?.id).toBe('team-1');
        });

        await act(async () => {
          await result.current.updateTeam('team-1', 'Team A Updated');
        });

        await waitFor(() => {
          expect(result.current.teams[0].name).toBe('Team A Updated');
        });
        expect(result.current.activeTeam?.name).toBe('Team A Updated');
      });

      it('handles update error', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.update).mockRejectedValue(
          new Error('Update failed')
        );

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.updateTeam('team-1', 'New Name');
        });

        expect(result.current.error).toBe('Update failed');
      });
    });

    describe('deleteTeam', () => {
      it('removes team and switches to next team', async () => {
        const teams = [
          createMockTeam({ id: 'team-1', name: 'Team A' }),
          createMockTeam({ id: 'team-2', name: 'Team B' }),
        ];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.delete).mockResolvedValue(undefined);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        // Wait for teams to be fetched
        await waitFor(() => {
          expect(result.current.activeTeam?.id).toBe('team-1');
        });

        await act(async () => {
          await result.current.deleteTeam('team-1');
        });

        expect(result.current.teams).toHaveLength(1);
        expect(result.current.activeTeam?.id).toBe('team-2');
      });

      it('clears active team when last team deleted', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.delete).mockResolvedValue(undefined);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        // Wait for teams to load
        await waitFor(() => {
          expect(result.current.activeTeam?.id).toBe('team-1');
        });

        await act(async () => {
          await result.current.deleteTeam('team-1');
        });

        await waitFor(() => {
          expect(result.current.teams).toHaveLength(0);
        });
        expect(result.current.activeTeam).toBeNull();
        expect(localStorage.getItem('activeTeamId')).toBeNull();
      });

      it('handles delete error', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.delete).mockRejectedValue(
          new Error('Delete failed')
        );

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        // Wait for teams to load
        await waitFor(() => {
          expect(result.current.activeTeam?.id).toBe('team-1');
        });

        await act(async () => {
          await result.current.deleteTeam('team-1');
        });

        await waitFor(() => {
          expect(result.current.error).toBe('Delete failed');
        });
      });

      it('handles non-Error delete exception', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.delete).mockRejectedValue('string error');

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.activeTeam?.id).toBe('team-1');
        });

        await act(async () => {
          await result.current.deleteTeam('team-1');
        });

        await waitFor(() => {
          expect(result.current.error).toBe('Failed to delete team');
        });
      });

      it('does not change active team when deleting non-active team', async () => {
        const teams = [
          createMockTeam({ id: 'team-1', name: 'Team A' }),
          createMockTeam({ id: 'team-2', name: 'Team B' }),
        ];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.delete).mockResolvedValue(undefined);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.activeTeam?.id).toBe('team-1');
        });

        await act(async () => {
          await result.current.deleteTeam('team-2');
        });

        expect(result.current.activeTeam?.id).toBe('team-1');
        expect(result.current.teams).toHaveLength(1);
      });
    });

    describe('inviteMember', () => {
      it('sends invite for active team', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        const invite = createMockInvite();
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.createInvite).mockResolvedValue(invite);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.activeTeam).not.toBeNull();
        });

        let returnedInvite;
        await act(async () => {
          returnedInvite = await result.current.inviteMember('new@example.com');
        });

        expect(returnedInvite).toEqual(invite);
        expect(apiClient.teamApi.createInvite).toHaveBeenCalledWith(
          'team-1',
          'new@example.com'
        );
      });

      it('returns null when no active team', async () => {
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue([]);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        let returnedInvite;
        await act(async () => {
          returnedInvite = await result.current.inviteMember('new@example.com');
        });

        expect(returnedInvite).toBeNull();
        expect(apiClient.teamApi.createInvite).not.toHaveBeenCalled();
      });

      it('handles invite error', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.createInvite).mockRejectedValue(
          new Error('Invite failed')
        );

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.activeTeam).not.toBeNull();
        });

        let returnedInvite;
        await act(async () => {
          returnedInvite = await result.current.inviteMember('new@example.com');
        });

        expect(returnedInvite).toBeNull();
        expect(result.current.error).toBe('Invite failed');
      });

      it('handles non-Error invite exception', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.createInvite).mockRejectedValue(
          'string error'
        );

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.activeTeam).not.toBeNull();
        });

        await act(async () => {
          await result.current.inviteMember('new@example.com');
        });

        expect(result.current.error).toBe('Failed to send invite');
      });
    });

    describe('removeMember', () => {
      it('removes member from list', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        const members = [
          createMockMember({ id: 'member-1', userId: 'user-1', role: 'admin' }),
          createMockMember({
            id: 'member-2',
            userId: 'user-2',
            role: 'member',
          }),
        ];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.getMembers).mockResolvedValue(members);
        vi.mocked(apiClient.teamApi.removeMember).mockResolvedValue(undefined);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.members).toHaveLength(2);
        });

        await act(async () => {
          await result.current.removeMember('user-2');
        });

        expect(result.current.members).toHaveLength(1);
        expect(result.current.members[0].userId).toBe('user-1');
      });

      it('does nothing when no active team', async () => {
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue([]);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.removeMember('user-2');
        });

        expect(apiClient.teamApi.removeMember).not.toHaveBeenCalled();
      });

      it('handles remove error', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.removeMember).mockRejectedValue(
          new Error('Remove failed')
        );

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.activeTeam).not.toBeNull();
        });

        await act(async () => {
          await result.current.removeMember('user-2');
        });

        expect(result.current.error).toBe('Remove failed');
      });

      it('handles non-Error remove exception', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.removeMember).mockRejectedValue(
          'string error'
        );

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.activeTeam).not.toBeNull();
        });

        await act(async () => {
          await result.current.removeMember('user-2');
        });

        expect(result.current.error).toBe('Failed to remove member');
      });
    });

    describe('refreshTeams', () => {
      it('refetches teams from API', async () => {
        const initialTeams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        const updatedTeams = [
          createMockTeam({ id: 'team-1', name: 'Team A' }),
          createMockTeam({ id: 'team-2', name: 'Team B' }),
        ];
        vi.mocked(apiClient.teamApi.getAll)
          .mockResolvedValueOnce(initialTeams)
          .mockResolvedValueOnce(updatedTeams);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.teams).toHaveLength(1);
        });

        await act(async () => {
          await result.current.refreshTeams();
        });

        expect(result.current.teams).toHaveLength(2);
      });
    });

    describe('refreshMembers', () => {
      it('refetches members from API', async () => {
        const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
        const initialMembers = [
          createMockMember({ id: 'member-1', userId: 'user-1', role: 'admin' }),
        ];
        const updatedMembers = [
          createMockMember({ id: 'member-1', userId: 'user-1', role: 'admin' }),
          createMockMember({
            id: 'member-2',
            userId: 'user-2',
            role: 'member',
          }),
        ];
        vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
        vi.mocked(apiClient.teamApi.getMembers)
          .mockResolvedValueOnce(initialMembers)
          .mockResolvedValueOnce(updatedMembers);

        const { result } = renderHook(() => useTeam(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.members).toHaveLength(1);
        });

        await act(async () => {
          await result.current.refreshMembers();
        });

        expect(result.current.members).toHaveLength(2);
      });
    });

    it('handles getMembers error', async () => {
      const teams = [createMockTeam({ id: 'team-1', name: 'Team A' })];
      vi.mocked(apiClient.teamApi.getAll).mockResolvedValue(teams);
      vi.mocked(apiClient.teamApi.getMembers).mockRejectedValue(
        new Error('Members fetch failed')
      );

      const { result } = renderHook(() => useTeam(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Members fetch failed');
      });
    });
  });
});
