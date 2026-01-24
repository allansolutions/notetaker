import { describe, it, expect } from 'vitest';
import {
  generateWebhookTokenId,
  generateSecureToken,
} from '../src/services/webhook-tokens';

describe('generateWebhookTokenId', () => {
  it('generates an ID with wht- prefix', () => {
    const id = generateWebhookTokenId();
    expect(id).toMatch(/^wht-[a-z0-9]+-[a-z0-9]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateWebhookTokenId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('generateSecureToken', () => {
  it('generates a 64-character hex string', () => {
    const token = generateSecureToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSecureToken());
    }
    expect(tokens.size).toBe(100);
  });
});
