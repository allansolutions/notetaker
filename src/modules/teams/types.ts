export interface Team {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'admin' | 'member';
  createdAt: number;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  token: string;
  invitedBy: string;
  expiresAt: number;
  acceptedAt: number | null;
  createdAt: number;
}

export type TeamRole = 'admin' | 'member';
