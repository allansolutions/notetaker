import { describe, it, expect } from 'vitest';
import {
  generateInviteId,
  generateInviteToken,
  isInviteValid,
} from '../src/services/team-invites';
import type { DbTeamInvite } from '../src/db/schema';

describe('generateInviteId', () => {
  it('generates an ID with invite prefix and timestamp-random parts', () => {
    const id = generateInviteId();
    expect(id).toMatch(/^invite-[0-9a-z]+-[0-9a-z]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateInviteId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('generateInviteToken', () => {
  it('generates a 64-character hex token', () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateInviteToken());
    }
    expect(tokens.size).toBe(100);
  });
});

describe('isInviteValid', () => {
  const baseInvite: DbTeamInvite = {
    id: 'invite-123',
    teamId: 'team-123',
    email: 'test@example.com',
    token: 'abc123',
    invitedBy: 'user-123',
    expiresAt: Date.now() + 86400000, // 1 day from now
    acceptedAt: null,
    createdAt: Date.now(),
  };

  it('returns true for a valid unexpired invite', () => {
    expect(isInviteValid(baseInvite)).toBe(true);
  });

  it('returns false for an expired invite', () => {
    const expiredInvite: DbTeamInvite = {
      ...baseInvite,
      expiresAt: Date.now() - 1000, // Already expired
    };
    expect(isInviteValid(expiredInvite)).toBe(false);
  });

  it('returns false for an already accepted invite', () => {
    const acceptedInvite: DbTeamInvite = {
      ...baseInvite,
      acceptedAt: Date.now() - 1000,
    };
    expect(isInviteValid(acceptedInvite)).toBe(false);
  });

  it('returns false for an expired and accepted invite', () => {
    const expiredAndAccepted: DbTeamInvite = {
      ...baseInvite,
      expiresAt: Date.now() - 1000,
      acceptedAt: Date.now() - 2000,
    };
    expect(isInviteValid(expiredAndAccepted)).toBe(false);
  });
});
