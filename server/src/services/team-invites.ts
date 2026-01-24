import { eq, and, isNull } from 'drizzle-orm';
import type { Database } from '../db';
import { teamInvites, type DbTeamInvite } from '../db/schema';

export function generateInviteId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `invite-${timestamp}-${random}`;
}

export function generateInviteToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createInvite(
  db: Database,
  teamId: string,
  email: string,
  invitedBy: string
): Promise<DbTeamInvite> {
  const id = generateInviteId();
  const token = generateInviteToken();
  const now = Date.now();

  const values = {
    id,
    teamId,
    email: email.toLowerCase(),
    token,
    invitedBy,
    expiresAt: now + INVITE_EXPIRY_MS,
    createdAt: now,
  };

  await db.insert(teamInvites).values(values);

  return values as DbTeamInvite;
}

export async function getInviteByToken(
  db: Database,
  token: string
): Promise<DbTeamInvite | undefined> {
  const result = await db
    .select()
    .from(teamInvites)
    .where(eq(teamInvites.token, token))
    .limit(1);

  return result[0];
}

export async function getInviteById(
  db: Database,
  inviteId: string
): Promise<DbTeamInvite | undefined> {
  const result = await db
    .select()
    .from(teamInvites)
    .where(eq(teamInvites.id, inviteId))
    .limit(1);

  return result[0];
}

export async function getPendingInvitesByTeam(
  db: Database,
  teamId: string
): Promise<DbTeamInvite[]> {
  return db
    .select()
    .from(teamInvites)
    .where(and(eq(teamInvites.teamId, teamId), isNull(teamInvites.acceptedAt)));
}

export async function acceptInvite(
  db: Database,
  inviteId: string
): Promise<void> {
  await db
    .update(teamInvites)
    .set({ acceptedAt: Date.now() })
    .where(eq(teamInvites.id, inviteId));
}

export async function deleteInvite(
  db: Database,
  inviteId: string
): Promise<void> {
  await db.delete(teamInvites).where(eq(teamInvites.id, inviteId));
}

export function isInviteValid(invite: DbTeamInvite): boolean {
  // Not expired and not already accepted
  return invite.expiresAt > Date.now() && invite.acceptedAt === null;
}
