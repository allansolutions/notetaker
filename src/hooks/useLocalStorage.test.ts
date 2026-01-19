import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  const STORAGE_KEY = 'test-key';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEY, 'initial')
    );
    expect(result.current[0]).toBe('initial');
  });

  it('returns stored value from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('stored-value'));
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEY, 'initial')
    );
    expect(result.current[0]).toBe('stored-value');
  });

  it('updates value when setValue is called', () => {
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEY, 'initial')
    );

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
  });

  it('updates value with function updater', () => {
    const { result } = renderHook(() => useLocalStorage(STORAGE_KEY, 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it('saves to localStorage after debounce', async () => {
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEY, 'initial')
    );

    act(() => {
      result.current[1]('new-value');
    });

    // Value should be updated immediately in state
    expect(result.current[0]).toBe('new-value');

    // But localStorage should not be updated yet (debounce)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // Advance timers past debounce period
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Now localStorage should be updated
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify('new-value'));
  });

  it('cancels previous save on rapid updates', () => {
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEY, 'initial')
    );

    // Make rapid updates
    act(() => {
      result.current[1]('first');
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current[1]('second');
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current[1]('third');
    });

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Only the last value should be saved
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify('third'));
  });

  it('handles objects and arrays', () => {
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEY, { count: 0, items: [] as string[] })
    );

    act(() => {
      result.current[1]({ count: 5, items: ['a', 'b'] });
    });

    expect(result.current[0]).toEqual({ count: 5, items: ['a', 'b'] });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      count: 5,
      items: ['a', 'b'],
    });
  });

  it('returns initial value when localStorage has invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-json{');
    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEY, 'fallback')
    );
    expect(result.current[0]).toBe('fallback');
  });

  it('handles localStorage setItem errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock setItem to throw using Object.defineProperty
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('Storage full');
    });

    const { result } = renderHook(() =>
      useLocalStorage(STORAGE_KEY, 'initial')
    );

    act(() => {
      result.current[1]('new-value');
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Should log error but not crash
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to save to localStorage:',
      expect.any(Error)
    );

    // Restore
    Storage.prototype.setItem = originalSetItem;
    consoleSpy.mockRestore();
  });

  it('cleans up timeout on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useLocalStorage(STORAGE_KEY, 'initial')
    );

    act(() => {
      result.current[1]('new-value');
    });

    // Unmount before debounce completes
    unmount();

    // Advance time - should not throw or update localStorage
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Value should not have been saved
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
