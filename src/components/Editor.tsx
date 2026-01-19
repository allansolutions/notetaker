import { useState, useCallback, useRef, useEffect } from 'react';
import { Block, BlockType } from '../types';
import { BlockInput } from './BlockInput';
import { generateId } from '../utils/markdown';
import {
  moveBlockUp as moveBlockUpUtil,
  moveBlockDown as moveBlockDownUtil,
  getNumberedIndex as getNumberedIndexUtil,
  getVisibleBlocks,
  insertBlockAfter as insertBlockAfterUtil,
  deleteBlock as deleteBlockUtil,
} from '../utils/block-operations';

export function createBlock(type: BlockType = 'paragraph', content: string = ''): Block {
  return {
    id: generateId(),
    type,
    content,
  };
}

interface EditorProps {
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  navigateToId?: string | null;
  onNavigateComplete?: () => void;
  collapsedBlockIds?: Set<string>;
  onToggleCollapse?: (id: string) => void;
}

export function Editor({ blocks, setBlocks, navigateToId, onNavigateComplete, collapsedBlockIds, onToggleCollapse }: EditorProps) {
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
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index > 0) {
        setFocusedId(prev[index - 1].id);
      }
      return prev;
    });
  }, [setBlocks]);

  const focusNextBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index < prev.length - 1) {
        setFocusedId(prev[index + 1].id);
      }
      return prev;
    });
  }, [setBlocks]);

  const selectBlock = useCallback((id: string) => {
    setSelectedId(id);
    setFocusedId(null);
  }, []);

  const enterEditMode = useCallback((id: string) => {
    setSelectedId(null);
    setFocusedId(id);
  }, []);

  // Clear selection when focusing any block for editing
  const handleBlockFocus = useCallback((id: string) => {
    setSelectedId(null);
    setFocusedId(id);
  }, []);

  const moveBlockUp = useCallback((id: string) => {
    setBlocks(prev => moveBlockUpUtil(prev, id));
  }, [setBlocks]);

  const moveBlockDown = useCallback((id: string) => {
    setBlocks(prev => moveBlockDownUtil(prev, id));
  }, [setBlocks]);

  const visibleBlocks = getVisibleBlocks(blocks, collapsedBlockIds);

  return (
    <div className="editor">
      {visibleBlocks.map((block) => {
        const originalIndex = blocks.findIndex(b => b.id === block.id);
        return (
          <BlockInput
            key={block.id}
            block={block}
            onUpdate={updateBlock}
            onEnter={insertBlockAfter}
            onBackspace={deleteBlock}
            onFocus={handleBlockFocus}
            onArrowUp={focusPreviousBlock}
            onArrowDown={focusNextBlock}
            isFocused={focusedId === block.id}
            isSelected={selectedId === block.id}
            onSelect={selectBlock}
            onEnterEdit={enterEditMode}
            onMoveUp={moveBlockUp}
            onMoveDown={moveBlockDown}
            numberedIndex={getNumberedIndexUtil(blocks, originalIndex)}
            isCollapsed={block.type === 'h1' && collapsedBlockIds?.has(block.id)}
            onToggleCollapse={onToggleCollapse}
          />
        );
      })}
    </div>
  );
}
