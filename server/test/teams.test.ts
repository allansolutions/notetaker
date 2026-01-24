import { describe, it, expect } from 'vitest';
import { generateTeamId, generateMemberId } from '../src/services/teams';

describe('generateTeamId', () => {
  it('generates an ID with team prefix and timestamp-random parts', () => {
    const id = generateTeamId();
    expect(id).toMatch(/^team-[0-9a-z]+-[0-9a-z]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateTeamId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('generateMemberId', () => {
  it('generates an ID with member prefix and timestamp-random parts', () => {
    const id = generateMemberId();
    expect(id).toMatch(/^member-[0-9a-z]+-[0-9a-z]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateMemberId());
    }
    expect(ids.size).toBe(100);
  });
});
