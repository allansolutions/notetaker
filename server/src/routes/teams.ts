import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  getTeamsByUserId,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  isTeamAdmin,
  isTeamMember,
  getTeamMembers,
  removeTeamMember,
} from '../services/teams';
import {
  createInvite,
  getPendingInvitesByTeam,
  getInviteById,
  getInviteByToken,
  acceptInvite,
  deleteInvite,
  isInviteValid,
} from '../services/team-invites';
import { addTeamMember } from '../services/teams';
import { getUserByEmail } from '../services/user';

export const teamRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

teamRoutes.use('*', requireAuth);

// Get all teams for current user
teamRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const db = c.get('db');
  const teams = await getTeamsByUserId(db, userId);

  return c.json({ teams });
});

// Create a new team (creator becomes admin)
teamRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const body = await c.req.json();
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return c.json({ error: 'Team name is required' }, 400);
  }

  const db = c.get('db');
  const team = await createTeam(db, body.name.trim(), userId);

  return c.json({ team }, 201);
});

// Get a specific team with members
teamRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const teamId = c.req.param('id');
  const db = c.get('db');

  // Check if user is a member
  const isMember = await isTeamMember(db, teamId, userId);
  if (!isMember) {
    return c.json({ error: 'Team not found' }, 404);
  }

  const team = await getTeamById(db, teamId);
  if (!team) {
    return c.json({ error: 'Team not found' }, 404);
  }

  const members = await getTeamMembers(db, teamId);

  return c.json({ team, members });
});

// Update team (admin only)
teamRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const teamId = c.req.param('id');
  const db = c.get('db');

  const isAdmin = await isTeamAdmin(db, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  const body = await c.req.json();
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return c.json({ error: 'Invalid team name' }, 400);
    }
  }

  await updateTeam(db, teamId, { name: body.name?.trim() });
  const team = await getTeamById(db, teamId);

  return c.json({ team });
});

// Delete team (admin only)
teamRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const teamId = c.req.param('id');
  const db = c.get('db');

  const isAdmin = await isTeamAdmin(db, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  await deleteTeam(db, teamId);

  return c.json({ success: true });
});

// Get team members
teamRoutes.get('/:id/members', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const teamId = c.req.param('id');
  const db = c.get('db');

  const isMember = await isTeamMember(db, teamId, userId);
  if (!isMember) {
    return c.json({ error: 'Team not found' }, 404);
  }

  const members = await getTeamMembers(db, teamId);

  return c.json({ members });
});

// Remove team member (admin only)
teamRoutes.delete('/:id/members/:memberId', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const teamId = c.req.param('id');
  const memberUserId = c.req.param('memberId');
  const db = c.get('db');

  const isAdmin = await isTeamAdmin(db, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  // Don't allow removing the last admin
  const members = await getTeamMembers(db, teamId);
  const admins = members.filter((m) => m.role === 'admin');
  if (admins.length === 1 && admins[0].userId === memberUserId) {
    return c.json({ error: 'Cannot remove the last admin' }, 400);
  }

  await removeTeamMember(db, teamId, memberUserId);

  return c.json({ success: true });
});

// Create invite (admin only)
teamRoutes.post('/:id/invites', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const teamId = c.req.param('id');
  const db = c.get('db');

  const isAdmin = await isTeamAdmin(db, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  const body = await c.req.json();
  if (!body.email || typeof body.email !== 'string') {
    return c.json({ error: 'Email is required' }, 400);
  }

  const email = body.email.toLowerCase().trim();

  // Check if user is already a member
  const existingUser = await getUserByEmail(db, email);
  if (existingUser) {
    const isMember = await isTeamMember(db, teamId, existingUser.id);
    if (isMember) {
      return c.json({ error: 'User is already a team member' }, 400);
    }
  }

  const invite = await createInvite(db, teamId, email, userId);

  return c.json({ invite }, 201);
});

// List pending invites (admin only)
teamRoutes.get('/:id/invites', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const teamId = c.req.param('id');
  const db = c.get('db');

  const isAdmin = await isTeamAdmin(db, teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  const invites = await getPendingInvitesByTeam(db, teamId);

  return c.json({ invites });
});

// Cancel invite (admin only)
teamRoutes.delete('/invites/:inviteId', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const inviteId = c.req.param('inviteId');
  const db = c.get('db');

  const invite = await getInviteById(db, inviteId);
  if (!invite) {
    return c.json({ error: 'Invite not found' }, 404);
  }

  const isAdmin = await isTeamAdmin(db, invite.teamId, userId);
  if (!isAdmin) {
    return c.json({ error: 'Not authorized' }, 403);
  }

  await deleteInvite(db, inviteId);

  return c.json({ success: true });
});

// Public invite routes (still require auth to accept)

// Get invite details by token
teamRoutes.get('/invites/token/:token', async (c) => {
  const token = c.req.param('token');
  const db = c.get('db');

  const invite = await getInviteByToken(db, token);
  if (!invite) {
    return c.json({ error: 'Invite not found' }, 404);
  }

  if (!isInviteValid(invite)) {
    return c.json({ error: 'Invite has expired or already been used' }, 400);
  }

  const team = await getTeamById(db, invite.teamId);

  return c.json({
    invite: {
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
    },
    team: team ? { id: team.id, name: team.name } : null,
  });
});

// Accept invite
teamRoutes.post('/invites/token/:token/accept', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not found' }, 401);
  }

  const token = c.req.param('token');
  const db = c.get('db');

  const invite = await getInviteByToken(db, token);
  if (!invite) {
    return c.json({ error: 'Invite not found' }, 404);
  }

  if (!isInviteValid(invite)) {
    return c.json({ error: 'Invite has expired or already been used' }, 400);
  }

  // Check if already a member
  const isMember = await isTeamMember(db, invite.teamId, userId);
  if (isMember) {
    return c.json({ error: 'You are already a member of this team' }, 400);
  }

  // Add user as member
  await addTeamMember(db, invite.teamId, userId, 'member');
  await acceptInvite(db, invite.id);

  const team = await getTeamById(db, invite.teamId);

  return c.json({ team });
});
