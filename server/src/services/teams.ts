import { eq, and } from 'drizzle-orm';
import type { Database } from '../db';
import {
  teams,
  teamMembers,
  users,
  type DbTeam,
  type NewDbTeam,
  type DbTeamMember,
} from '../db/schema';

export function generateTeamId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `team-${timestamp}-${random}`;
}

export function generateMemberId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `member-${timestamp}-${random}`;
}

export async function getTeamsByUserId(
  db: Database,
  userId: string
): Promise<DbTeam[]> {
  const memberships = await db
    .select({ team: teams })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));

  return memberships.map((m) => m.team);
}

export async function getTeamById(
  db: Database,
  teamId: string
): Promise<DbTeam | undefined> {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return result[0];
}

export async function createTeam(
  db: Database,
  name: string,
  creatorUserId: string
): Promise<DbTeam> {
  const id = generateTeamId();
  const now = Date.now();

  const values: NewDbTeam = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(teams).values(values);

  // Add creator as admin
  await db.insert(teamMembers).values({
    id: generateMemberId(),
    teamId: id,
    userId: creatorUserId,
    role: 'admin',
    createdAt: now,
  });

  return values as DbTeam;
}

export async function updateTeam(
  db: Database,
  teamId: string,
  data: { name?: string }
): Promise<void> {
  await db
    .update(teams)
    .set({
      ...data,
      updatedAt: Date.now(),
    })
    .where(eq(teams.id, teamId));
}

export async function deleteTeam(db: Database, teamId: string): Promise<void> {
  await db.delete(teams).where(eq(teams.id, teamId));
}

export async function isTeamAdmin(
  db: Database,
  teamId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.role, 'admin')
      )
    )
    .limit(1);

  return result.length > 0;
}

export async function isTeamMember(
  db: Database,
  teamId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  return result.length > 0;
}

export async function getUserRole(
  db: Database,
  teamId: string,
  userId: string
): Promise<'admin' | 'member' | null> {
  const result = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  if (result.length === 0) return null;
  return result[0].role as 'admin' | 'member';
}

export type TeamMemberWithUser = DbTeamMember & {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
};

export async function getTeamMembers(
  db: Database,
  teamId: string
): Promise<TeamMemberWithUser[]> {
  const result = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,
      createdAt: teamMembers.createdAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  return result;
}

export async function addTeamMember(
  db: Database,
  teamId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<DbTeamMember> {
  const id = generateMemberId();
  const now = Date.now();

  const values = {
    id,
    teamId,
    userId,
    role,
    createdAt: now,
  };

  await db.insert(teamMembers).values(values);

  return values as DbTeamMember;
}

export async function removeTeamMember(
  db: Database,
  teamId: string,
  userId: string
): Promise<void> {
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
}
