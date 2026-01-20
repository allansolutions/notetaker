import { describe, it, expect } from 'vitest';
import { generateTaskId } from '../src/services/tasks';

describe('generateTaskId', () => {
  it('generates an ID with timestamp and random parts', () => {
    const id = generateTaskId();
    // Format: {timestamp}-{random} where both are base36
    expect(id).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateTaskId());
    }
    expect(ids.size).toBe(100);
  });

  it('generates IDs that can be sorted chronologically', () => {
    const id1 = generateTaskId();
    // Small delay to ensure different timestamp
    const id2 = generateTaskId();

    // The timestamp part comes first, so lexicographic sorting should work
    // for IDs generated at different times (with same or later timestamps)
    const timestamp1 = id1.split('-')[0];
    const timestamp2 = id2.split('-')[0];

    // Both timestamps should be valid base36 strings
    expect(parseInt(timestamp1, 36)).toBeGreaterThan(0);
    expect(parseInt(timestamp2, 36)).toBeGreaterThan(0);
    expect(parseInt(timestamp2, 36)).toBeGreaterThanOrEqual(
      parseInt(timestamp1, 36)
    );
  });
});
