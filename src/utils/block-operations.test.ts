import { describe, it, expect } from 'vitest';
import {
  moveBlockUp,
  moveBlockDown,
  getNumberedIndex,
  getShownBlocks,
  getVisibleBlocks,
  insertBlockAfter,
  deleteBlock,
  mergeBlockWithPrevious,
  getBlockLevel,
  canIndentBlock,
  indentBlock,
  unindentBlock,
  MAX_INDENT_LEVEL,
} from './block-operations';
import { Block, BlockType } from '../types';

const makeBlock = (
  id: string,
  type: Block['type'] = 'paragraph',
  content = ''
): Block => ({
  id,
  type,
  content,
});

describe('moveBlockUp', () => {
  it('swaps block with previous block', () => {
    const blocks = [makeBlock('1'), makeBlock('2'), makeBlock('3')];
    const result = moveBlockUp(blocks, '2');
    expect(result.map((b) => b.id)).toEqual(['2', '1', '3']);
  });

  it('returns same array when first block tries to move up', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    const result = moveBlockUp(blocks, '1');
    expect(result).toBe(blocks);
  });

  it('returns same array when block not found', () => {
    const blocks = [makeBlock('1')];
    const result = moveBlockUp(blocks, 'nonexistent');
    expect(result).toBe(blocks);
  });

  it('works with single block array', () => {
    const blocks = [makeBlock('1')];
    const result = moveBlockUp(blocks, '1');
    expect(result).toBe(blocks);
  });

  it('handles moving second block to first position', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    const result = moveBlockUp(blocks, '2');
    expect(result.map((b) => b.id)).toEqual(['2', '1']);
  });

  it('does not mutate original array', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    const original = [...blocks];
    moveBlockUp(blocks, '2');
    expect(blocks.map((b) => b.id)).toEqual(original.map((b) => b.id));
  });
});

describe('moveBlockDown', () => {
  it('swaps block with next block', () => {
    const blocks = [makeBlock('1'), makeBlock('2'), makeBlock('3')];
    const result = moveBlockDown(blocks, '2');
    expect(result.map((b) => b.id)).toEqual(['1', '3', '2']);
  });

  it('returns same array when last block tries to move down', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    const result = moveBlockDown(blocks, '2');
    expect(result).toBe(blocks);
  });

  it('returns same array when block not found', () => {
    const blocks = [makeBlock('1')];
    const result = moveBlockDown(blocks, 'nonexistent');
    expect(result).toBe(blocks);
  });

  it('works with single block array', () => {
    const blocks = [makeBlock('1')];
    const result = moveBlockDown(blocks, '1');
    expect(result).toBe(blocks);
  });

  it('handles moving first block to second position', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    const result = moveBlockDown(blocks, '1');
    expect(result.map((b) => b.id)).toEqual(['2', '1']);
  });

  it('does not mutate original array', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    const original = [...blocks];
    moveBlockDown(blocks, '1');
    expect(blocks.map((b) => b.id)).toEqual(original.map((b) => b.id));
  });
});

describe('getNumberedIndex', () => {
  it('returns 1 for first numbered block', () => {
    const blocks = [makeBlock('1', 'numbered')];
    expect(getNumberedIndex(blocks, 0)).toBe(1);
  });

  it('counts consecutive numbered blocks', () => {
    const blocks = [
      makeBlock('1', 'numbered'),
      makeBlock('2', 'numbered'),
      makeBlock('3', 'numbered'),
    ];
    expect(getNumberedIndex(blocks, 0)).toBe(1);
    expect(getNumberedIndex(blocks, 1)).toBe(2);
    expect(getNumberedIndex(blocks, 2)).toBe(3);
  });

  it('restarts counting after non-numbered block', () => {
    const blocks = [
      makeBlock('1', 'numbered'),
      makeBlock('2', 'paragraph'),
      makeBlock('3', 'numbered'),
      makeBlock('4', 'numbered'),
    ];
    expect(getNumberedIndex(blocks, 0)).toBe(1);
    expect(getNumberedIndex(blocks, 2)).toBe(1);
    expect(getNumberedIndex(blocks, 3)).toBe(2);
  });

  it('returns 0 for non-numbered blocks', () => {
    const blocks = [makeBlock('1', 'paragraph'), makeBlock('2', 'bullet')];
    expect(getNumberedIndex(blocks, 0)).toBe(0);
    expect(getNumberedIndex(blocks, 1)).toBe(0);
  });

  it('returns 0 for out of bounds index', () => {
    const blocks = [makeBlock('1', 'numbered')];
    expect(getNumberedIndex(blocks, -1)).toBe(0);
    expect(getNumberedIndex(blocks, 5)).toBe(0);
  });

  it('handles numbered blocks interspersed with h1', () => {
    const blocks = [
      makeBlock('1', 'numbered'),
      makeBlock('2', 'numbered'),
      makeBlock('3', 'h1'),
      makeBlock('4', 'numbered'),
    ];
    expect(getNumberedIndex(blocks, 1)).toBe(2);
    expect(getNumberedIndex(blocks, 3)).toBe(1);
  });
});

describe('getShownBlocks', () => {
  it('returns all blocks when nothing is hidden', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    expect(getShownBlocks(blocks, new Set())).toBe(blocks);
  });

  it('returns all blocks when hiddenBlockIds is undefined', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    expect(getShownBlocks(blocks, undefined)).toBe(blocks);
  });

  it('completely hides H1 and its content until next H1', () => {
    const blocks = [
      makeBlock('h1-1', 'h1', 'Section 1'),
      makeBlock('p1', 'paragraph', 'Content 1'),
      makeBlock('h1-2', 'h1', 'Section 2'),
      makeBlock('p2', 'paragraph', 'Content 2'),
    ];
    const result = getShownBlocks(blocks, new Set(['h1-1']));
    expect(result.map((b) => b.id)).toEqual(['h1-2', 'p2']);
  });

  it('hides the H1 block itself when hidden', () => {
    const blocks = [makeBlock('h1-1', 'h1'), makeBlock('p1', 'paragraph')];
    const result = getShownBlocks(blocks, new Set(['h1-1']));
    expect(result).toEqual([]);
  });

  it('handles multiple hidden sections', () => {
    const blocks = [
      makeBlock('h1-1', 'h1'),
      makeBlock('p1', 'paragraph'),
      makeBlock('h1-2', 'h1'),
      makeBlock('p2', 'paragraph'),
      makeBlock('h1-3', 'h1'),
      makeBlock('p3', 'paragraph'),
    ];
    const result = getShownBlocks(blocks, new Set(['h1-1', 'h1-3']));
    expect(result.map((b) => b.id)).toEqual(['h1-2', 'p2']);
  });

  it('shows blocks before first H1 when first H1 is hidden', () => {
    const blocks = [
      makeBlock('p0', 'paragraph'),
      makeBlock('h1-1', 'h1'),
      makeBlock('p1', 'paragraph'),
    ];
    const result = getShownBlocks(blocks, new Set(['h1-1']));
    expect(result.map((b) => b.id)).toEqual(['p0']);
  });

  it('handles consecutive H1s with first hidden', () => {
    const blocks = [
      makeBlock('h1-1', 'h1'),
      makeBlock('h1-2', 'h1'),
      makeBlock('p1', 'paragraph'),
    ];
    const result = getShownBlocks(blocks, new Set(['h1-1']));
    expect(result.map((b) => b.id)).toEqual(['h1-2', 'p1']);
  });
});

describe('getVisibleBlocks', () => {
  it('returns all blocks when nothing is collapsed', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    expect(getVisibleBlocks(blocks, new Set())).toBe(blocks);
  });

  it('returns all blocks when collapsedBlockIds is undefined', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    expect(getVisibleBlocks(blocks, undefined)).toBe(blocks);
  });

  it('hides content after collapsed H1 until next H1', () => {
    const blocks = [
      makeBlock('h1-1', 'h1', 'Section 1'),
      makeBlock('p1', 'paragraph', 'Content 1'),
      makeBlock('h1-2', 'h1', 'Section 2'),
      makeBlock('p2', 'paragraph', 'Content 2'),
    ];
    const result = getVisibleBlocks(blocks, new Set(['h1-1']));
    expect(result.map((b) => b.id)).toEqual(['h1-1', 'h1-2', 'p2']);
  });

  it('always shows the H1 block itself', () => {
    const blocks = [makeBlock('h1-1', 'h1'), makeBlock('p1', 'paragraph')];
    const result = getVisibleBlocks(blocks, new Set(['h1-1']));
    expect(result.map((b) => b.id)).toEqual(['h1-1']);
  });

  it('handles multiple collapsed sections', () => {
    const blocks = [
      makeBlock('h1-1', 'h1'),
      makeBlock('p1', 'paragraph'),
      makeBlock('h1-2', 'h1'),
      makeBlock('p2', 'paragraph'),
      makeBlock('h1-3', 'h1'),
      makeBlock('p3', 'paragraph'),
    ];
    const result = getVisibleBlocks(blocks, new Set(['h1-1', 'h1-3']));
    expect(result.map((b) => b.id)).toEqual(['h1-1', 'h1-2', 'p2', 'h1-3']);
  });

  it('handles blocks before first H1', () => {
    const blocks = [
      makeBlock('p0', 'paragraph'),
      makeBlock('h1-1', 'h1'),
      makeBlock('p1', 'paragraph'),
    ];
    const result = getVisibleBlocks(blocks, new Set(['h1-1']));
    expect(result.map((b) => b.id)).toEqual(['p0', 'h1-1']);
  });

  it('handles consecutive H1s', () => {
    const blocks = [
      makeBlock('h1-1', 'h1'),
      makeBlock('h1-2', 'h1'),
      makeBlock('p1', 'paragraph'),
    ];
    const result = getVisibleBlocks(blocks, new Set(['h1-1']));
    expect(result.map((b) => b.id)).toEqual(['h1-1', 'h1-2', 'p1']);
  });
});

describe('insertBlockAfter', () => {
  const createBlock = (type: BlockType = 'paragraph', content = ''): Block => ({
    id: `new-${Date.now()}`,
    type,
    content,
  });

  it('converts empty bullet to paragraph', () => {
    const blocks = [makeBlock('1', 'bullet', '')];
    const result = insertBlockAfter(blocks, '1', createBlock);
    expect(result.blocks.length).toBe(1);
    expect(result.blocks[0].type).toBe('paragraph');
    expect(result.newBlockId).toBeNull();
  });

  it('converts empty todo to paragraph', () => {
    const blocks = [makeBlock('1', 'todo', '')];
    const result = insertBlockAfter(blocks, '1', createBlock);
    expect(result.blocks[0].type).toBe('paragraph');
  });

  it('converts empty numbered to paragraph', () => {
    const blocks = [makeBlock('1', 'numbered', '')];
    const result = insertBlockAfter(blocks, '1', createBlock);
    expect(result.blocks[0].type).toBe('paragraph');
  });

  it('continues bullet list when not empty', () => {
    const blocks = [makeBlock('1', 'bullet', 'item')];
    const result = insertBlockAfter(blocks, '1', createBlock);
    expect(result.blocks.length).toBe(2);
    expect(result.blocks[1].type).toBe('bullet');
    expect(result.newBlockId).toBeTruthy();
  });

  it('continues numbered list when not empty', () => {
    const blocks = [makeBlock('1', 'numbered', 'item')];
    const result = insertBlockAfter(blocks, '1', createBlock);
    expect(result.blocks[1].type).toBe('numbered');
  });

  it('converts todo-checked to todo on continuation', () => {
    const blocks = [makeBlock('1', 'todo-checked', 'done')];
    const result = insertBlockAfter(blocks, '1', createBlock);
    expect(result.blocks[1].type).toBe('todo');
  });

  it('creates paragraph after non-list blocks', () => {
    const blocks = [makeBlock('1', 'h1', 'heading')];
    const result = insertBlockAfter(blocks, '1', createBlock);
    expect(result.blocks[1].type).toBe('paragraph');
  });

  it('inserts at correct position in middle of list', () => {
    const blocks = [makeBlock('1'), makeBlock('2'), makeBlock('3')];
    const result = insertBlockAfter(blocks, '2', createBlock);
    expect(result.blocks.length).toBe(4);
    expect(result.blocks[0].id).toBe('1');
    expect(result.blocks[1].id).toBe('2');
    expect(result.blocks[2].id).toBe(result.newBlockId);
    expect(result.blocks[3].id).toBe('3');
  });

  it('returns unchanged blocks when id not found', () => {
    const blocks = [makeBlock('1')];
    const result = insertBlockAfter(blocks, 'nonexistent', createBlock);
    expect(result.blocks).toBe(blocks);
    expect(result.newBlockId).toBeNull();
  });

  it('does not mutate original array', () => {
    const blocks = [makeBlock('1', 'paragraph', 'content')];
    const original = [...blocks];
    insertBlockAfter(blocks, '1', createBlock);
    expect(blocks).toEqual(original);
  });

  it('splits content between blocks when splitInfo provided', () => {
    const blocks = [makeBlock('1', 'paragraph', 'Hello World')];
    const result = insertBlockAfter(blocks, '1', createBlock, {
      contentBefore: 'Hello ',
      contentAfter: 'World',
    });
    expect(result.blocks.length).toBe(2);
    expect(result.blocks[0].content).toBe('Hello ');
    expect(result.blocks[1].content).toBe('World');
  });

  it('creates empty new block when cursor at end', () => {
    const blocks = [makeBlock('1', 'paragraph', 'Hello')];
    const result = insertBlockAfter(blocks, '1', createBlock, {
      contentBefore: 'Hello',
      contentAfter: '',
    });
    expect(result.blocks[0].content).toBe('Hello');
    expect(result.blocks[1].content).toBe('');
  });

  it('moves all content to new block when cursor at start', () => {
    const blocks = [makeBlock('1', 'paragraph', 'World')];
    const result = insertBlockAfter(blocks, '1', createBlock, {
      contentBefore: '',
      contentAfter: 'World',
    });
    expect(result.blocks[0].content).toBe('');
    expect(result.blocks[1].content).toBe('World');
  });

  it('continues list type with split content', () => {
    const blocks = [makeBlock('1', 'bullet', 'First Second')];
    const result = insertBlockAfter(blocks, '1', createBlock, {
      contentBefore: 'First ',
      contentAfter: 'Second',
    });
    expect(result.blocks[0].type).toBe('bullet');
    expect(result.blocks[0].content).toBe('First ');
    expect(result.blocks[1].type).toBe('bullet');
    expect(result.blocks[1].content).toBe('Second');
  });

  it('converts to paragraph when split leaves list empty', () => {
    const blocks = [makeBlock('1', 'bullet', 'item')];
    const result = insertBlockAfter(blocks, '1', createBlock, {
      contentBefore: '',
      contentAfter: '',
    });
    expect(result.blocks.length).toBe(1);
    expect(result.blocks[0].type).toBe('paragraph');
    expect(result.newBlockId).toBeNull();
  });
});

describe('deleteBlock', () => {
  it('removes block and returns previous block id to focus', () => {
    const blocks = [makeBlock('1'), makeBlock('2'), makeBlock('3')];
    const result = deleteBlock(blocks, '2');
    expect(result.blocks.map((b) => b.id)).toEqual(['1', '3']);
    expect(result.focusBlockId).toBe('1');
  });

  it('prevents deletion of last remaining block', () => {
    const blocks = [makeBlock('1')];
    const result = deleteBlock(blocks, '1');
    expect(result.blocks).toBe(blocks);
    expect(result.focusBlockId).toBeNull();
  });

  it('focuses first block when deleting first block', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    const result = deleteBlock(blocks, '1');
    expect(result.blocks.map((b) => b.id)).toEqual(['2']);
    expect(result.focusBlockId).toBe('2');
  });

  it('focuses previous block when deleting last block', () => {
    const blocks = [makeBlock('1'), makeBlock('2'), makeBlock('3')];
    const result = deleteBlock(blocks, '3');
    expect(result.blocks.map((b) => b.id)).toEqual(['1', '2']);
    expect(result.focusBlockId).toBe('2');
  });

  it('returns unchanged when block not found', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    const result = deleteBlock(blocks, 'nonexistent');
    expect(result.blocks).toBe(blocks);
    expect(result.focusBlockId).toBeNull();
  });

  it('does not mutate original array', () => {
    const blocks = [makeBlock('1'), makeBlock('2')];
    const original = [...blocks];
    deleteBlock(blocks, '2');
    expect(blocks.map((b) => b.id)).toEqual(original.map((b) => b.id));
  });
});

describe('mergeBlockWithPrevious', () => {
  it('merges block content with previous block', () => {
    const blocks = [
      makeBlock('1', 'paragraph', 'Hello '),
      makeBlock('2', 'paragraph', 'World'),
    ];
    const result = mergeBlockWithPrevious(blocks, '2');
    expect(result).not.toBeNull();
    expect(result!.blocks.length).toBe(1);
    expect(result!.blocks[0].content).toBe('Hello World');
    expect(result!.focusBlockId).toBe('1');
    expect(result!.cursorOffset).toBe(6); // Length of "Hello "
  });

  it('returns null for first block', () => {
    const blocks = [makeBlock('1', 'paragraph', 'Hello')];
    const result = mergeBlockWithPrevious(blocks, '1');
    expect(result).toBeNull();
  });

  it('returns null when block not found', () => {
    const blocks = [makeBlock('1')];
    const result = mergeBlockWithPrevious(blocks, 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when previous block is a divider', () => {
    const blocks = [
      makeBlock('1', 'divider', ''),
      makeBlock('2', 'paragraph', 'content'),
    ];
    const result = mergeBlockWithPrevious(blocks, '2');
    expect(result).toBeNull();
  });

  it('merges bullet into paragraph', () => {
    const blocks = [
      makeBlock('1', 'paragraph', 'Text '),
      makeBlock('2', 'bullet', 'item'),
    ];
    const result = mergeBlockWithPrevious(blocks, '2');
    expect(result!.blocks[0].content).toBe('Text item');
    expect(result!.blocks[0].type).toBe('paragraph');
  });

  it('merges into h1 block', () => {
    const blocks = [
      makeBlock('1', 'h1', 'Heading'),
      makeBlock('2', 'paragraph', ' text'),
    ];
    const result = mergeBlockWithPrevious(blocks, '2');
    expect(result!.blocks[0].content).toBe('Heading text');
    expect(result!.blocks[0].type).toBe('h1');
  });

  it('handles merging empty block', () => {
    const blocks = [
      makeBlock('1', 'paragraph', 'Hello'),
      makeBlock('2', 'paragraph', ''),
    ];
    const result = mergeBlockWithPrevious(blocks, '2');
    expect(result!.blocks[0].content).toBe('Hello');
    expect(result!.cursorOffset).toBe(5);
  });

  it('handles merging into empty block', () => {
    const blocks = [
      makeBlock('1', 'paragraph', ''),
      makeBlock('2', 'paragraph', 'World'),
    ];
    const result = mergeBlockWithPrevious(blocks, '2');
    expect(result!.blocks[0].content).toBe('World');
    expect(result!.cursorOffset).toBe(0);
  });

  it('preserves other blocks in array', () => {
    const blocks = [
      makeBlock('1', 'paragraph', 'First'),
      makeBlock('2', 'paragraph', 'Second'),
      makeBlock('3', 'paragraph', 'Third'),
    ];
    const result = mergeBlockWithPrevious(blocks, '2');
    expect(result!.blocks.length).toBe(2);
    expect(result!.blocks[0].content).toBe('FirstSecond');
    expect(result!.blocks[1].id).toBe('3');
  });

  it('does not mutate original array', () => {
    const blocks = [
      makeBlock('1', 'paragraph', 'Hello'),
      makeBlock('2', 'paragraph', 'World'),
    ];
    const original = blocks.map((b) => ({ ...b }));
    mergeBlockWithPrevious(blocks, '2');
    expect(blocks.length).toBe(2);
    expect(blocks[0].content).toBe(original[0].content);
    expect(blocks[1].content).toBe(original[1].content);
  });
});

describe('getBlockLevel', () => {
  it('returns 0 for block without level property', () => {
    const block = makeBlock('1', 'bullet', 'item');
    expect(getBlockLevel(block)).toBe(0);
  });

  it('returns the level when defined', () => {
    const block: Block = { id: '1', type: 'bullet', content: 'item', level: 2 };
    expect(getBlockLevel(block)).toBe(2);
  });

  it('returns 0 for level: 0', () => {
    const block: Block = { id: '1', type: 'bullet', content: 'item', level: 0 };
    expect(getBlockLevel(block)).toBe(0);
  });
});

describe('canIndentBlock', () => {
  it('returns false for non-bullet blocks', () => {
    const blocks = [makeBlock('1', 'paragraph', 'text')];
    expect(canIndentBlock(blocks, '1')).toBe(false);
  });

  it('returns false for first bullet (no parent)', () => {
    const blocks = [makeBlock('1', 'bullet', 'item')];
    expect(canIndentBlock(blocks, '1')).toBe(false);
  });

  it('returns true for second bullet at level 0', () => {
    const blocks = [
      makeBlock('1', 'bullet', 'first'),
      makeBlock('2', 'bullet', 'second'),
    ];
    expect(canIndentBlock(blocks, '2')).toBe(true);
  });

  it('returns false when already at max level', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'first', level: MAX_INDENT_LEVEL },
      { id: '2', type: 'bullet', content: 'second', level: MAX_INDENT_LEVEL },
    ];
    expect(canIndentBlock(blocks, '2')).toBe(false);
  });

  it('returns false when would be more than 1 level deeper than parent', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'first', level: 0 },
      { id: '2', type: 'bullet', content: 'second', level: 1 },
    ];
    // Block at level 1 cannot indent further because parent is at level 0
    expect(canIndentBlock(blocks, '2')).toBe(false);
  });

  it('returns true when previous bullet is at same level', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'first', level: 1 },
      { id: '2', type: 'bullet', content: 'second', level: 1 },
    ];
    expect(canIndentBlock(blocks, '2')).toBe(true);
  });

  it('returns false for numbered blocks', () => {
    const blocks = [
      makeBlock('1', 'numbered', 'first'),
      makeBlock('2', 'numbered', 'second'),
    ];
    expect(canIndentBlock(blocks, '2')).toBe(false);
  });

  it('returns false for todo blocks', () => {
    const blocks = [
      makeBlock('1', 'todo', 'first'),
      makeBlock('2', 'todo', 'second'),
    ];
    expect(canIndentBlock(blocks, '2')).toBe(false);
  });

  it('returns false when block not found', () => {
    const blocks = [makeBlock('1', 'bullet', 'first')];
    expect(canIndentBlock(blocks, 'nonexistent')).toBe(false);
  });

  it('finds previous bullet across non-bullet blocks', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'first', level: 0 },
      { id: '2', type: 'paragraph', content: 'text' },
      { id: '3', type: 'bullet', content: 'second', level: 0 },
    ];
    expect(canIndentBlock(blocks, '3')).toBe(true);
  });
});

describe('indentBlock', () => {
  it('increases level by 1', () => {
    const blocks = [
      makeBlock('1', 'bullet', 'first'),
      makeBlock('2', 'bullet', 'second'),
    ];
    const result = indentBlock(blocks, '2');
    expect(result[1].level).toBe(1);
  });

  it('returns unchanged array when cannot indent', () => {
    const blocks = [makeBlock('1', 'bullet', 'first')];
    const result = indentBlock(blocks, '1');
    expect(result).toBe(blocks);
  });

  it('does not mutate original array', () => {
    const blocks = [
      makeBlock('1', 'bullet', 'first'),
      makeBlock('2', 'bullet', 'second'),
    ];
    const original = blocks.map((b) => ({ ...b }));
    indentBlock(blocks, '2');
    expect(blocks[1].level).toBe(original[1].level);
  });

  it('preserves other block properties', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'first', level: 0 },
      { id: '2', type: 'bullet', content: 'second', level: 0 },
    ];
    const result = indentBlock(blocks, '2');
    expect(result[1].id).toBe('2');
    expect(result[1].content).toBe('second');
    expect(result[1].type).toBe('bullet');
  });

  it('increments existing level', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'first', level: 1 },
      { id: '2', type: 'bullet', content: 'second', level: 1 },
    ];
    const result = indentBlock(blocks, '2');
    expect(result[1].level).toBe(2);
  });
});

describe('unindentBlock', () => {
  it('decreases level by 1', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'first', level: 0 },
      { id: '2', type: 'bullet', content: 'second', level: 1 },
    ];
    const result = unindentBlock(blocks, '2');
    expect(result[1].level).toBe(0);
  });

  it('returns unchanged array when already at level 0', () => {
    const blocks = [makeBlock('1', 'bullet', 'first')];
    const result = unindentBlock(blocks, '1');
    expect(result).toBe(blocks);
  });

  it('returns unchanged array for non-bullet blocks', () => {
    const blocks: Block[] = [
      { id: '1', type: 'paragraph', content: 'text', level: 1 },
    ];
    const result = unindentBlock(blocks, '1');
    expect(result).toBe(blocks);
  });

  it('returns unchanged array when block not found', () => {
    const blocks = [makeBlock('1', 'bullet', 'first')];
    const result = unindentBlock(blocks, 'nonexistent');
    expect(result).toBe(blocks);
  });

  it('does not mutate original array', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'first', level: 0 },
      { id: '2', type: 'bullet', content: 'second', level: 1 },
    ];
    const originalLevel = blocks[1].level;
    unindentBlock(blocks, '2');
    expect(blocks[1].level).toBe(originalLevel);
  });

  it('preserves other block properties', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'first', level: 0 },
      { id: '2', type: 'bullet', content: 'second', level: 2 },
    ];
    const result = unindentBlock(blocks, '2');
    expect(result[1].id).toBe('2');
    expect(result[1].content).toBe('second');
    expect(result[1].type).toBe('bullet');
    expect(result[1].level).toBe(1);
  });
});

describe('insertBlockAfter with level inheritance', () => {
  const createBlockWithLevel = (
    type: BlockType = 'paragraph',
    content = ''
  ): Block => ({
    id: `new-level-${Date.now()}`,
    type,
    content,
  });

  it('inherits level from bullet block', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'item', level: 2 },
    ];
    const result = insertBlockAfter(blocks, '1', createBlockWithLevel);
    expect(result.blocks[1].type).toBe('bullet');
    expect(result.blocks[1].level).toBe(2);
  });

  it('creates bullet at level 0 when current block has no level', () => {
    const blocks = [makeBlock('1', 'bullet', 'item')];
    const result = insertBlockAfter(blocks, '1', createBlockWithLevel);
    expect(result.blocks[1].type).toBe('bullet');
    expect(result.blocks[1].level).toBeUndefined();
  });

  it('does not inherit level for non-bullet blocks', () => {
    const blocks: Block[] = [
      { id: '1', type: 'numbered', content: 'item', level: 1 },
    ];
    const result = insertBlockAfter(blocks, '1', createBlockWithLevel);
    expect(result.blocks[1].type).toBe('numbered');
    expect(result.blocks[1].level).toBeUndefined();
  });

  it('inherits level 1', () => {
    const blocks: Block[] = [
      { id: '1', type: 'bullet', content: 'item', level: 1 },
    ];
    const result = insertBlockAfter(blocks, '1', createBlockWithLevel);
    expect(result.blocks[1].level).toBe(1);
  });
});
