import { Block, BlockType } from '../types';

// Constants for indentation
export const MAX_INDENT_LEVEL = 2;
export const INDENT_BLOCK_TYPES: BlockType[] = ['bullet'];

/**
 * Gets the indentation level of a block.
 * Returns 0 for blocks without a level property.
 */
export function getBlockLevel(block: Block): number {
  return block.level ?? 0;
}

/**
 * Checks if a block can be indented based on validation rules:
 * - Must be a bullet block
 * - Cannot exceed MAX_INDENT_LEVEL
 * - Must have a bullet block before it
 * - Cannot be more than 1 level deeper than the previous bullet
 */
export function canIndentBlock(blocks: Block[], id: string): boolean {
  const index = blocks.findIndex((b) => b.id === id);
  if (index < 0) return false;

  const block = blocks[index];

  // Only bullet blocks can be indented
  if (!INDENT_BLOCK_TYPES.includes(block.type)) return false;

  const currentLevel = getBlockLevel(block);

  // Cannot exceed max level
  if (currentLevel >= MAX_INDENT_LEVEL) return false;

  // Find previous bullet block
  let prevBulletLevel = -1;
  for (let i = index - 1; i >= 0; i--) {
    if (blocks[i].type === 'bullet') {
      prevBulletLevel = getBlockLevel(blocks[i]);
      break;
    }
  }

  // Must have a previous bullet
  if (prevBulletLevel === -1) return false;

  // Cannot indent more than 1 level deeper than previous bullet
  if (currentLevel >= prevBulletLevel + 1) return false;

  return true;
}

/**
 * Indents a block by increasing its level.
 * Returns unchanged array if indentation is not valid.
 */
export function indentBlock(blocks: Block[], id: string): Block[] {
  if (!canIndentBlock(blocks, id)) return blocks;

  return blocks.map((block) => {
    if (block.id === id) {
      return { ...block, level: getBlockLevel(block) + 1 };
    }
    return block;
  });
}

/**
 * Unindents a block by decreasing its level.
 * Returns unchanged array if block is already at level 0.
 */
export function unindentBlock(blocks: Block[], id: string): Block[] {
  const index = blocks.findIndex((b) => b.id === id);
  if (index < 0) return blocks;

  const block = blocks[index];

  // Only bullet blocks can be unindented
  if (!INDENT_BLOCK_TYPES.includes(block.type)) return blocks;

  const currentLevel = getBlockLevel(block);

  // Already at base level
  if (currentLevel <= 0) return blocks;

  return blocks.map((b) => {
    if (b.id === id) {
      return { ...b, level: currentLevel - 1 };
    }
    return b;
  });
}

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

export type SplitInfo = {
  /** Content to keep in the current block (text before cursor) */
  contentBefore: string;
  /** Content to move to the new block (text after cursor) */
  contentAfter: string;
};

/**
 * Handles Enter key behavior:
 * - For empty list blocks: converts to paragraph (no new block)
 * - For non-empty list blocks: creates new block of same type (todo-checked -> todo)
 * - For other blocks: creates new paragraph
 * - If splitInfo is provided, splits content between current and new block
 *
 * Returns the updated blocks array and the ID of any newly created block.
 */
export function insertBlockAfter(
  blocks: Block[],
  id: string,
  createBlock: (type?: BlockType, content?: string) => Block,
  splitInfo?: SplitInfo
): InsertBlockResult {
  const index = blocks.findIndex((b) => b.id === id);
  if (index < 0) return { blocks, newBlockId: null };

  const currentBlock = blocks[index];

  // Determine effective content (use splitInfo if provided)
  const currentContent = splitInfo
    ? splitInfo.contentBefore
    : currentBlock.content;
  const newBlockContent = splitInfo ? splitInfo.contentAfter : '';

  // If it's a list type and both parts are empty, convert to paragraph
  if (
    LIST_TYPES.includes(currentBlock.type) &&
    currentContent === '' &&
    newBlockContent === ''
  ) {
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

  let newBlock = createBlock(newType, newBlockContent);

  // Inherit level for bullet blocks
  if (newType === 'bullet' && currentBlock.type === 'bullet') {
    const currentLevel = getBlockLevel(currentBlock);
    if (currentLevel > 0) {
      newBlock = { ...newBlock, level: currentLevel };
    }
  }

  // Update current block content if split, then insert new block
  const newBlocks = blocks.map((b) =>
    b.id === id ? { ...b, content: currentContent } : b
  );
  newBlocks.splice(index + 1, 0, newBlock);

  return { blocks: newBlocks, newBlockId: newBlock.id };
}

export type DeleteBlockResult = {
  blocks: Block[];
  focusBlockId: string | null;
};

export type MergeBlockResult = {
  blocks: Block[];
  focusBlockId: string | null;
  /** Cursor offset: position where the cursor should be placed in the merged block */
  cursorOffset: number;
};

/**
 * Merges a block with the previous block by appending its content.
 * Returns null if the block is the first one or previous block is a divider.
 */
export function mergeBlockWithPrevious(
  blocks: Block[],
  id: string
): MergeBlockResult | null {
  const index = blocks.findIndex((b) => b.id === id);
  if (index <= 0) return null;

  const currentBlock = blocks[index];
  const prevBlock = blocks[index - 1];

  // Can't merge into a divider
  if (prevBlock.type === 'divider') return null;

  const cursorOffset = prevBlock.content.length;
  const mergedContent = prevBlock.content + currentBlock.content;

  const newBlocks = blocks
    .map((b) => (b.id === prevBlock.id ? { ...b, content: mergedContent } : b))
    .filter((b) => b.id !== id);

  return {
    blocks: newBlocks,
    focusBlockId: prevBlock.id,
    cursorOffset,
  };
}

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
