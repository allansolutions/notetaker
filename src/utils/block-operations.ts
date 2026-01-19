import { Block, BlockType } from '../types';

/**
 * Swaps a block with the previous block in the array.
 * Returns the original array if the block is already first.
 */
export function moveBlockUp(blocks: Block[], id: string): Block[] {
  const index = blocks.findIndex((b) => b.id === id);
  if (index <= 0) return blocks;
  const newBlocks = [...blocks];
  [newBlocks[index - 1], newBlocks[index]] = [
    newBlocks[index],
    newBlocks[index - 1],
  ];
  return newBlocks;
}

/**
 * Swaps a block with the next block in the array.
 * Returns the original array if the block is already last.
 */
export function moveBlockDown(blocks: Block[], id: string): Block[] {
  const index = blocks.findIndex((b) => b.id === id);
  if (index < 0 || index >= blocks.length - 1) return blocks;
  const newBlocks = [...blocks];
  [newBlocks[index], newBlocks[index + 1]] = [
    newBlocks[index + 1],
    newBlocks[index],
  ];
  return newBlocks;
}

/**
 * Calculates the 1-based position within a consecutive run of numbered blocks.
 * Returns 0 for non-numbered blocks.
 */
export function getNumberedIndex(blocks: Block[], index: number): number {
  if (index < 0 || index >= blocks.length) return 0;
  if (blocks[index].type !== 'numbered') return 0;
  let count = 1;
  for (let i = index - 1; i >= 0 && blocks[i].type === 'numbered'; i--) {
    count++;
  }
  return count;
}

/**
 * Filters out blocks in hidden H1 sections.
 * Both the H1 and all content until the next H1 are completely hidden.
 */
export function getShownBlocks(
  blocks: Block[],
  hiddenBlockIds: Set<string> | undefined
): Block[] {
  if (!hiddenBlockIds || hiddenBlockIds.size === 0) return blocks;

  const result: Block[] = [];
  let isInHiddenSection = false;

  for (const block of blocks) {
    if (block.type === 'h1') {
      isInHiddenSection = hiddenBlockIds.has(block.id);
    }
    if (!isInHiddenSection) {
      result.push(block);
    }
  }

  return result;
}

/**
 * Filters out blocks in collapsed H1 sections.
 * The H1 itself is always visible, but content until the next H1 is hidden.
 */
export function getVisibleBlocks(
  blocks: Block[],
  collapsedBlockIds: Set<string> | undefined
): Block[] {
  if (!collapsedBlockIds || collapsedBlockIds.size === 0) return blocks;

  const result: Block[] = [];
  let isInCollapsedSection = false;

  for (const block of blocks) {
    if (block.type === 'h1') {
      result.push(block);
      isInCollapsedSection = collapsedBlockIds.has(block.id);
    } else if (!isInCollapsedSection) {
      result.push(block);
    }
  }

  return result;
}

const LIST_TYPES: BlockType[] = ['bullet', 'numbered', 'todo', 'todo-checked'];

export type InsertBlockResult = {
  blocks: Block[];
  newBlockId: string | null;
};

/**
 * Handles Enter key behavior:
 * - For empty list blocks: converts to paragraph (no new block)
 * - For non-empty list blocks: creates new block of same type (todo-checked -> todo)
 * - For other blocks: creates new paragraph
 *
 * Returns the updated blocks array and the ID of any newly created block.
 */
export function insertBlockAfter(
  blocks: Block[],
  id: string,
  createBlock: (type?: BlockType, content?: string) => Block
): InsertBlockResult {
  const index = blocks.findIndex((b) => b.id === id);
  if (index < 0) return { blocks, newBlockId: null };

  const currentBlock = blocks[index];

  // If it's a list type and empty, convert to paragraph instead of continuing list
  if (LIST_TYPES.includes(currentBlock.type) && currentBlock.content === '') {
    return {
      blocks: blocks.map((b) =>
        b.id === id ? { ...b, type: 'paragraph' as BlockType } : b
      ),
      newBlockId: null,
    };
  }

  // Continue list types, or create paragraph for others
  let newType: BlockType = 'paragraph';
  if (LIST_TYPES.includes(currentBlock.type)) {
    newType = currentBlock.type === 'todo-checked' ? 'todo' : currentBlock.type;
  }

  const newBlock = createBlock(newType);
  const newBlocks = [...blocks];
  newBlocks.splice(index + 1, 0, newBlock);

  return { blocks: newBlocks, newBlockId: newBlock.id };
}

export type DeleteBlockResult = {
  blocks: Block[];
  focusBlockId: string | null;
};

/**
 * Deletes a block and returns the updated array with the ID of the block to focus.
 * Prevents deletion of the last remaining block.
 */
export function deleteBlock(blocks: Block[], id: string): DeleteBlockResult {
  if (blocks.length <= 1) {
    return { blocks, focusBlockId: null };
  }

  const index = blocks.findIndex((b) => b.id === id);
  if (index < 0) return { blocks, focusBlockId: null };

  const newBlocks = blocks.filter((b) => b.id !== id);
  const prevBlock = newBlocks[Math.max(0, index - 1)];

  return {
    blocks: newBlocks,
    focusBlockId: prevBlock?.id || null,
  };
}
