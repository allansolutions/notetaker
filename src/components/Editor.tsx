import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { Block, BlockType } from '../types';
import { BlockInput } from './BlockInput';
import {
  deleteBlock as deleteBlockUtil,
  getNumberedIndex,
  getShownBlocks,
  getVisibleBlocks,
  insertBlockAfter as insertBlockAfterUtil,
  moveBlockDown,
  moveBlockUp,
} from '../utils/block-operations';
import { generateId } from '../utils/markdown';

export function createBlock(type: BlockType = 'paragraph', content = ''): Block {
  return { id: generateId(), type, content };
}

interface EditorProps {
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  navigateToId?: string | null;
  onNavigateComplete?: () => void;
  collapsedBlockIds?: Set<string>;
  onToggleCollapse?: (id: string) => void;
  hiddenBlockIds?: Set<string>;
}

export function Editor({ blocks, setBlocks, navigateToId, onNavigateComplete, collapsedBlockIds, onToggleCollapse, hiddenBlockIds }: EditorProps): JSX.Element {
  const [focusedId, setFocusedId] = useState<string | null>(blocks[0]?.id || null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pendingFocusRef = useRef<string | null>(null);

  // Apply pending focus after blocks update
  useEffect(() => {
    if (pendingFocusRef.current) {
      setFocusedId(pendingFocusRef.current);
      pendingFocusRef.current = null;
    }
  }, [blocks]);

  // Compute visible blocks for navigation and rendering
  const shownBlocks = useMemo(() => getShownBlocks(blocks, hiddenBlockIds), [blocks, hiddenBlockIds]);
  const visibleBlocks = useMemo(() => getVisibleBlocks(shownBlocks, collapsedBlockIds), [shownBlocks, collapsedBlockIds]);

  // Handle navigation from outline
  useEffect(() => {
    if (navigateToId) {
      setFocusedId(navigateToId);
      setSelectedId(null);
      // Scroll the block into view
      const element = document.querySelector(`[data-block-id="${navigateToId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      onNavigateComplete?.();
    }
  }, [navigateToId, onNavigateComplete]);

  const updateBlock = useCallback((id: string, content: string, type: BlockType) => {
    setBlocks(prev =>
      prev.map(block =>
        block.id === id ? { ...block, content, type } : block
      )
    );
  }, [setBlocks]);

  const insertBlockAfter = useCallback((id: string) => {
    setBlocks(prev => {
      const result = insertBlockAfterUtil(prev, id, createBlock);
      if (result.newBlockId) {
        pendingFocusRef.current = result.newBlockId;
      }
      return result.blocks;
    });
  }, [setBlocks]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const result = deleteBlockUtil(prev, id);
      if (result.focusBlockId) {
        setFocusedId(result.focusBlockId);
      }
      return result.blocks;
    });
  }, [setBlocks]);

  const focusPreviousBlock = useCallback((id: string) => {
    const index = visibleBlocks.findIndex(b => b.id === id);
    if (index > 0) {
      setFocusedId(visibleBlocks[index - 1].id);
    }
  }, [visibleBlocks]);

  const focusNextBlock = useCallback((id: string) => {
    const index = visibleBlocks.findIndex(b => b.id === id);
    if (index < visibleBlocks.length - 1) {
      setFocusedId(visibleBlocks[index + 1].id);
    }
  }, [visibleBlocks]);

  const selectBlock = useCallback((id: string) => {
    setSelectedId(id);
    setFocusedId(null);
  }, []);

  const enterEditMode = useCallback((id: string) => {
    setSelectedId(null);
    setFocusedId(id);
  }, []);

  const handleMoveUp = useCallback((id: string) => {
    setBlocks(prev => moveBlockUp(prev, id));
  }, [setBlocks]);

  const handleMoveDown = useCallback((id: string) => {
    setBlocks(prev => moveBlockDown(prev, id));
  }, [setBlocks]);

  return (
    <div className="w-full">
      {visibleBlocks.map((block) => {
        const originalIndex = blocks.findIndex(b => b.id === block.id);
        return (
          <BlockInput
            key={block.id}
            block={block}
            onUpdate={updateBlock}
            onEnter={insertBlockAfter}
            onBackspace={deleteBlock}
            onFocus={enterEditMode}
            onArrowUp={focusPreviousBlock}
            onArrowDown={focusNextBlock}
            isFocused={focusedId === block.id}
            isSelected={selectedId === block.id}
            onSelect={selectBlock}
            onEnterEdit={enterEditMode}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            numberedIndex={getNumberedIndex(blocks, originalIndex)}
            isCollapsed={block.type === 'h1' && collapsedBlockIds?.has(block.id)}
            onToggleCollapse={onToggleCollapse}
          />
        );
      })}
    </div>
  );
}
