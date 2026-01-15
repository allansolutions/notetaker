import { useState, useCallback, useRef, useEffect } from 'react';
import { Block, BlockType } from '../types';
import { BlockInput } from './BlockInput';
import { generateId } from '../utils/markdown';
import { useLocalStorage } from '../hooks/useLocalStorage';

const STORAGE_KEY = 'notetaker-blocks';

function createBlock(type: BlockType = 'paragraph', content: string = ''): Block {
  return {
    id: generateId(),
    type,
    content,
  };
}

export function Editor() {
  const [blocks, setBlocks] = useLocalStorage<Block[]>(STORAGE_KEY, [
    createBlock(),
  ]);
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

  const updateBlock = useCallback((id: string, content: string, type: BlockType) => {
    setBlocks(prev =>
      prev.map(block =>
        block.id === id ? { ...block, content, type } : block
      )
    );
  }, [setBlocks]);

  const LIST_TYPES: BlockType[] = ['bullet', 'numbered', 'todo', 'todo-checked'];

  const insertBlockAfter = useCallback((id: string) => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      const currentBlock = prev[index];

      // If it's a list type and empty, convert to paragraph instead of continuing list
      if (LIST_TYPES.includes(currentBlock.type) && currentBlock.content === '') {
        return prev.map(b =>
          b.id === id ? { ...b, type: 'paragraph' as BlockType } : b
        );
      }

      // Continue list types, or create paragraph for others
      const newType = LIST_TYPES.includes(currentBlock.type)
        ? (currentBlock.type === 'todo-checked' ? 'todo' : currentBlock.type)
        : 'paragraph';

      const newBlock = createBlock(newType);
      // Store the ID to focus after this update completes
      pendingFocusRef.current = newBlock.id;

      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
  }, [setBlocks]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      if (prev.length <= 1) return prev; // Keep at least one block
      const index = prev.findIndex(b => b.id === id);
      const newBlocks = prev.filter(b => b.id !== id);
      // Focus previous block
      const prevBlock = newBlocks[Math.max(0, index - 1)];
      if (prevBlock) {
        setFocusedId(prevBlock.id);
      }
      return newBlocks;
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
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index <= 0) return prev;
      const newBlocks = [...prev];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  }, [setBlocks]);

  const moveBlockDown = useCallback((id: string) => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index >= prev.length - 1) return prev;
      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  }, [setBlocks]);

  // Calculate numbered list positions (1-based within consecutive runs)
  const getNumberedIndex = (index: number): number => {
    if (blocks[index].type !== 'numbered') return 0;
    let count = 1;
    for (let i = index - 1; i >= 0 && blocks[i].type === 'numbered'; i--) {
      count++;
    }
    return count;
  };

  return (
    <div className="editor">
      {blocks.map((block, index) => (
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
          numberedIndex={getNumberedIndex(index)}
        />
      ))}
    </div>
  );
}
