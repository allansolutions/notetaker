import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTeam } from './TeamContext';

describe('TeamContext', () => {
  it('throws error when useTeam used outside provider', () => {
    // Suppress console.error for this test since React will log the error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTeam());
    }).toThrow('useTeam must be used within a TeamProvider');

    consoleSpy.mockRestore();
  });
});
