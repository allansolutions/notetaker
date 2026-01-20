import { describe, it, expect } from 'vitest';
import { generateSessionId, isTokenExpired } from '../src/services/session';
import type { Session } from '../src/db/schema';

describe('generateSessionId', () => {
  it('generates a 64-character hex string', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSessionId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('isTokenExpired', () => {
  it('returns true when token expiry is in the past', () => {
    const session: Session = {
      id: 'test-session',
      userId: null,
      googleAccessToken: 'token',
      googleRefreshToken: null,
      googleTokenExpiry: Date.now() - 1000,
      googleEmail: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(isTokenExpired(session)).toBe(true);
  });

  it('returns false when token expiry is in the future', () => {
    const session: Session = {
      id: 'test-session',
      userId: null,
      googleAccessToken: 'token',
      googleRefreshToken: null,
      googleTokenExpiry: Date.now() + 3600000,
      googleEmail: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(isTokenExpired(session)).toBe(false);
  });

  it('returns true when token expiry is null', () => {
    const session: Session = {
      id: 'test-session',
      userId: null,
      googleAccessToken: 'token',
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleEmail: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(isTokenExpired(session)).toBe(true);
  });

  it('returns true when token expiry is exactly now', () => {
    const now = Date.now();
    const session: Session = {
      id: 'test-session',
      userId: null,
      googleAccessToken: 'token',
      googleRefreshToken: null,
      googleTokenExpiry: now,
      googleEmail: null,
      createdAt: now,
      updatedAt: now,
    };

    expect(isTokenExpired(session)).toBe(true);
  });
});
