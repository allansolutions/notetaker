import { describe, it, expect } from 'vitest';
import { generateUserId } from '../src/services/user';

describe('generateUserId', () => {
  it('generates a 32-character hex string', () => {
    const id = generateUserId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateUserId());
    }
    expect(ids.size).toBe(100);
  });
});
