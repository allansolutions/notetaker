import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoHistory } from './useUndoHistory';
import { Block } from '../types';

function makeBlocks(...contents: string[]): Block[] {
  return contents.map((c, i) => ({ id: `b${i}`, type: 'paragraph' as const, content: c }));
}

function setup(initialBlocks: Block[] = makeBlocks('hello')) {
  const blocksRef = { current: initialBlocks };
  const focusedIdRef = { current: initialBlocks[0]?.id ?? null };
  const { result } = renderHook(() => useUndoHistory(blocksRef, focusedIdRef));
  return { result, blocksRef, focusedIdRef };
}

describe('useUndoHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns null when undo/redo stack is empty', () => {
    const { result } = setup();
    expect(result.current.undo()).toBeNull();
    expect(result.current.redo()).toBeNull();
  });

  it('basic undo restores previous state', () => {
    const { result, blocksRef, focusedIdRef } = setup(makeBlocks('a'));

    act(() => result.current.pushHistory('structural'));
    blocksRef.current = makeBlocks('b');
    focusedIdRef.current = 'b0';

    const entry = result.current.undo();
    expect(entry).not.toBeNull();
    expect(entry!.blocks[0].content).toBe('a');
  });

  it('basic redo restores after undo', () => {
    const { result, blocksRef, focusedIdRef } = setup(makeBlocks('a'));

    act(() => result.current.pushHistory('structural'));
    blocksRef.current = makeBlocks('b');
    focusedIdRef.current = 'b0';

    // Undo back to 'a'
    const undone = result.current.undo();
    // Simulate applying the undo
    blocksRef.current = undone!.blocks;

    const redone = result.current.redo();
    expect(redone).not.toBeNull();
    expect(redone!.blocks[0].content).toBe('b');
  });

  it('content grouping skips push within 500ms for same block', () => {
    const { result, blocksRef } = setup(makeBlocks('a'));

    act(() => result.current.pushHistory('content', 'b0'));
    blocksRef.current = makeBlocks('ab');
    vi.advanceTimersByTime(100);

    act(() => result.current.pushHistory('content', 'b0'));
    blocksRef.current = makeBlocks('abc');
    vi.advanceTimersByTime(100);

    act(() => result.current.pushHistory('content', 'b0'));
    blocksRef.current = makeBlocks('abcd');

    // Should only have 1 entry (the first push), subsequent grouped
    const entry = result.current.undo();
    expect(entry).not.toBeNull();
    expect(entry!.blocks[0].content).toBe('a');

    // No more entries
    expect(result.current.undo()).toBeNull();
  });

  it('content grouping resets after 500ms', () => {
    const { result, blocksRef } = setup(makeBlocks('a'));

    act(() => result.current.pushHistory('content', 'b0'));
    blocksRef.current = makeBlocks('ab');

    vi.advanceTimersByTime(600);

    act(() => result.current.pushHistory('content', 'b0'));
    blocksRef.current = makeBlocks('abc');

    // Should have 2 entries
    const entry1 = result.current.undo();
    expect(entry1!.blocks[0].content).toBe('ab');

    blocksRef.current = entry1!.blocks;
    const entry2 = result.current.undo();
    expect(entry2!.blocks[0].content).toBe('a');
  });

  it('content grouping resets for different block', () => {
    const blocks = makeBlocks('a', 'x');
    const { result, blocksRef } = setup(blocks);

    act(() => result.current.pushHistory('content', 'b0'));
    blocksRef.current = makeBlocks('ab', 'x');

    vi.advanceTimersByTime(100);

    act(() => result.current.pushHistory('content', 'b1'));
    blocksRef.current = makeBlocks('ab', 'xy');

    // 2 entries: one per block
    const e1 = result.current.undo();
    expect(e1!.blocks[1].content).toBe('x');

    blocksRef.current = e1!.blocks;
    const e2 = result.current.undo();
    expect(e2!.blocks[0].content).toBe('a');
  });

  it('structural push always creates new entry', () => {
    const { result, blocksRef } = setup(makeBlocks('a'));

    act(() => result.current.pushHistory('structural'));
    blocksRef.current = makeBlocks('a', 'b');

    act(() => result.current.pushHistory('structural'));
    blocksRef.current = makeBlocks('a', 'b', 'c');

    const e1 = result.current.undo();
    expect(e1!.blocks).toHaveLength(2);

    blocksRef.current = e1!.blocks;
    const e2 = result.current.undo();
    expect(e2!.blocks).toHaveLength(1);
  });

  it('new push clears redo stack', () => {
    const { result, blocksRef } = setup(makeBlocks('a'));

    act(() => result.current.pushHistory('structural'));
    blocksRef.current = makeBlocks('b');

    act(() => result.current.pushHistory('structural'));
    blocksRef.current = makeBlocks('c');

    // Undo twice
    result.current.undo();
    blocksRef.current = makeBlocks('b');
    result.current.undo();
    blocksRef.current = makeBlocks('a');

    // New push — redo should be empty
    act(() => result.current.pushHistory('structural'));
    blocksRef.current = makeBlocks('d');

    expect(result.current.redo()).toBeNull();
  });

  it('max 100 entries, oldest dropped', () => {
    const { result, blocksRef } = setup(makeBlocks('0'));

    for (let i = 1; i <= 105; i++) {
      act(() => result.current.pushHistory('structural'));
      blocksRef.current = makeBlocks(String(i));
    }

    // Should be able to undo 100 times
    let count = 0;
    while (result.current.undo() !== null) {
      count++;
      blocksRef.current = makeBlocks('x');
    }
    expect(count).toBe(100);
  });

  it('preserves focusedId in history', () => {
    const { result, blocksRef, focusedIdRef } = setup(makeBlocks('a'));
    focusedIdRef.current = 'b0';

    act(() => result.current.pushHistory('structural'));
    blocksRef.current = makeBlocks('a', 'b');
    focusedIdRef.current = 'b1';

    const entry = result.current.undo();
    expect(entry!.focusedId).toBe('b0');
  });
});
