import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Team, TeamMember, TeamInvite, TeamRole } from '../types';
import { teamApi } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

interface TeamContextType {
  teams: Team[];
  activeTeam: Team | null;
  members: TeamMember[];
  userRole: TeamRole | null;
  isLoading: boolean;
  error: string | null;
  setActiveTeam: (teamId: string | null) => void;
  createTeam: (name: string) => Promise<Team | null>;
  updateTeam: (teamId: string, name: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  inviteMember: (email: string) => Promise<TeamInvite | null>;
  removeMember: (userId: string) => Promise<void>;
  refreshTeams: () => Promise<void>;
  refreshMembers: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | null>(null);

const ACTIVE_TEAM_KEY = 'activeTeamId';

export function TeamProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute user's role in active team
  const userRole = members.find((m) => m.userId === user?.id)?.role ?? null;

  // Fetch all teams
  const fetchTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([]);
      setActiveTeamState(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const fetchedTeams = await teamApi.getAll();
      setTeams(fetchedTeams);

      // Restore active team from localStorage or use first team
      const savedTeamId = localStorage.getItem(ACTIVE_TEAM_KEY);
      const savedTeam = fetchedTeams.find((t) => t.id === savedTeamId);
      const defaultTeam = savedTeam || fetchedTeams[0] || null;

      if (defaultTeam) {
        setActiveTeamState(defaultTeam);
        localStorage.setItem(ACTIVE_TEAM_KEY, defaultTeam.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch members for active team
  const fetchMembers = useCallback(async () => {
    if (!activeTeam) {
      setMembers([]);
      return;
    }

    try {
      const fetchedMembers = await teamApi.getMembers(activeTeam.id);
      setMembers(fetchedMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    }
  }, [activeTeam]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const setActiveTeam = useCallback(
    (teamId: string | null) => {
      if (teamId === null) {
        setActiveTeamState(null);
        localStorage.removeItem(ACTIVE_TEAM_KEY);
        return;
      }

      const team = teams.find((t) => t.id === teamId);
      if (team) {
        setActiveTeamState(team);
        localStorage.setItem(ACTIVE_TEAM_KEY, team.id);
      }
    },
    [teams]
  );

  const createTeam = useCallback(async (name: string): Promise<Team | null> => {
    try {
      const team = await teamApi.create(name);
      setTeams((prev) => [...prev, team]);
      setActiveTeamState(team);
      localStorage.setItem(ACTIVE_TEAM_KEY, team.id);
      return team;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
      return null;
    }
  }, []);

  const updateTeam = useCallback(
    async (teamId: string, name: string): Promise<void> => {
      try {
        const updatedTeam = await teamApi.update(teamId, name);
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? updatedTeam : t))
        );
        if (activeTeam?.id === teamId) {
          setActiveTeamState(updatedTeam);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update team');
      }
    },
    [activeTeam]
  );

  const deleteTeam = useCallback(
    async (teamId: string): Promise<void> => {
      try {
        await teamApi.delete(teamId);
        setTeams((prev) => prev.filter((t) => t.id !== teamId));

        if (activeTeam?.id === teamId) {
          const remainingTeams = teams.filter((t) => t.id !== teamId);
          const nextTeam = remainingTeams[0] || null;
          setActiveTeamState(nextTeam);
          if (nextTeam) {
            localStorage.setItem(ACTIVE_TEAM_KEY, nextTeam.id);
          } else {
            localStorage.removeItem(ACTIVE_TEAM_KEY);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete team');
      }
    },
    [activeTeam, teams]
  );

  const inviteMember = useCallback(
    async (email: string): Promise<TeamInvite | null> => {
      if (!activeTeam) return null;

      try {
        const invite = await teamApi.createInvite(activeTeam.id, email);
        return invite;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send invite');
        return null;
      }
    },
    [activeTeam]
  );

  const removeMember = useCallback(
    async (userId: string): Promise<void> => {
      if (!activeTeam) return;

      try {
        await teamApi.removeMember(activeTeam.id, userId);
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to remove member'
        );
      }
    },
    [activeTeam]
  );

  return (
    <TeamContext.Provider
      value={{
        teams,
        activeTeam,
        members,
        userRole,
        isLoading,
        error,
        setActiveTeam,
        createTeam,
        updateTeam,
        deleteTeam,
        inviteMember,
        removeMember,
        refreshTeams: fetchTeams,
        refreshMembers: fetchMembers,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
