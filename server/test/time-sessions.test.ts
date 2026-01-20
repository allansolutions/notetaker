import { describe, it, expect } from 'vitest';
import { generateTimeSessionId } from '../src/services/time-sessions';

describe('generateTimeSessionId', () => {
  it('generates an ID with ts- prefix', () => {
    const id = generateTimeSessionId();
    expect(id).toMatch(/^ts-[0-9a-z]+-[0-9a-z]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateTimeSessionId());
    }
    expect(ids.size).toBe(100);
  });

  it('contains a valid timestamp', () => {
    const id = generateTimeSessionId();
    const parts = id.split('-');
    // Format: ts-{timestamp}-{random}
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('ts');

    const timestamp = parseInt(parts[1], 36);
    expect(timestamp).toBeGreaterThan(0);
    // Should be a reasonable timestamp (within last few seconds)
    expect(timestamp).toBeLessThanOrEqual(Date.now());
    expect(timestamp).toBeGreaterThan(Date.now() - 10000);
  });
});
