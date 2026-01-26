import { useRef, useCallback, RefObject } from 'react';
import { Block } from '../types';

export interface HistoryEntry {
  blocks: Block[];
  focusedId: string | null;
}

const MAX_HISTORY = 100;
const CONTENT_GROUP_MS = 500;

interface ContentGroupState {
  blockId: string;
  timestamp: number;
}

export function useUndoHistory(
  blocksRef: RefObject<Block[]>,
  focusedIdRef: RefObject<string | null>
): {
  pushHistory: (type: 'content' | 'structural', blockId?: string) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
} {
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const contentGroupRef = useRef<ContentGroupState | null>(null);

  const snapshot = useCallback((): HistoryEntry => {
    return {
      blocks: blocksRef.current!.map((b) => ({ ...b })),
      focusedId: focusedIdRef.current,
    };
  }, [blocksRef, focusedIdRef]);

  const pushHistory = useCallback(
    (type: 'content' | 'structural', blockId?: string) => {
      const now = Date.now();

      if (type === 'content' && blockId) {
        const group = contentGroupRef.current;
        if (
          group &&
          group.blockId === blockId &&
          now - group.timestamp < CONTENT_GROUP_MS
        ) {
          // Same block within grouping window — update timestamp, skip push
          group.timestamp = now;
          return;
        }
        // Start new content group
        contentGroupRef.current = { blockId, timestamp: now };
      } else {
        // Structural change resets content grouping
        contentGroupRef.current = null;
      }

      pastRef.current.push(snapshot());
      if (pastRef.current.length > MAX_HISTORY) {
        pastRef.current.shift();
      }
      // New push clears redo stack
      futureRef.current = [];
    },
    [snapshot]
  );

  const undo = useCallback((): HistoryEntry | null => {
    if (pastRef.current.length === 0) return null;
    contentGroupRef.current = null;

    const current = snapshot();
    futureRef.current.push(current);

    const entry = pastRef.current.pop()!;
    return entry;
  }, [snapshot]);

  const redo = useCallback((): HistoryEntry | null => {
    if (futureRef.current.length === 0) return null;
    contentGroupRef.current = null;

    const current = snapshot();
    pastRef.current.push(current);

    const entry = futureRef.current.pop()!;
    return entry;
  }, [snapshot]);

  return { pushHistory, undo, redo };
}
