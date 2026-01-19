import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SetStateAction } from 'react';
import { Editor, createBlock } from './Editor';
import { Block } from '../types';

describe('createBlock', () => {
  it('creates a paragraph block by default', () => {
    const block = createBlock();
    expect(block.type).toBe('paragraph');
    expect(block.content).toBe('');
    expect(block.id).toBeDefined();
  });

  it('creates a block with specified type', () => {
    const block = createBlock('h1');
    expect(block.type).toBe('h1');
  });

  it('creates a block with specified content', () => {
    const block = createBlock('paragraph', 'Hello');
    expect(block.content).toBe('Hello');
  });

  it('generates unique ids', () => {
    const block1 = createBlock();
    const block2 = createBlock();
    expect(block1.id).not.toBe(block2.id);
  });
});

describe('Editor', () => {
  let blocks: Block[];
  let setBlocks: ReturnType<typeof vi.fn<(value: SetStateAction<Block[]>) => void>>;

  beforeEach(() => {
    blocks = [
      { id: '1', type: 'paragraph', content: 'First block' },
      { id: '2', type: 'paragraph', content: 'Second block' },
      { id: '3', type: 'paragraph', content: 'Third block' },
    ];
    setBlocks = vi.fn((updater: SetStateAction<Block[]>) => {
      if (typeof updater === 'function') {
        blocks = updater(blocks);
      } else {
        blocks = updater;
      }
    });
  });

  describe('moveBlockUp', () => {
    it('swaps block with previous block', async () => {
      const user = userEvent.setup();
      render(<Editor blocks={blocks} setBlocks={setBlocks} />);

      // Focus second block and move it up
      const secondBlock = screen.getByText('Second block');
      await user.click(secondBlock);
      await user.keyboard('{Meta>}{Shift>}{ArrowUp}{/Shift}{/Meta}');

      expect(setBlocks).toHaveBeenCalled();
      // Verify the updater was called and blocks were swapped
      const lastCall = setBlocks.mock.calls[setBlocks.mock.calls.length - 1][0];
      const result = typeof lastCall === 'function' ? lastCall(blocks) : lastCall;
      expect(result[0].content).toBe('Second block');
      expect(result[1].content).toBe('First block');
    });

    it('does nothing when first block tries to move up', async () => {
      const user = userEvent.setup();
      render(<Editor blocks={blocks} setBlocks={setBlocks} />);

      const firstBlock = screen.getByText('First block');
      await user.click(firstBlock);
      const callCountBefore = setBlocks.mock.calls.length;
      await user.keyboard('{Meta>}{Shift>}{ArrowUp}{/Shift}{/Meta}');

      // The updater function should return unchanged blocks
      const calls = setBlocks.mock.calls.slice(callCountBefore);
      if (calls.length > 0) {
        const lastCall = calls[calls.length - 1][0];
        const result = typeof lastCall === 'function' ? lastCall(blocks) : lastCall;
        expect(result).toEqual(blocks);
      }
    });
  });

  describe('moveBlockDown', () => {
    it('swaps block with next block', async () => {
      const user = userEvent.setup();
      render(<Editor blocks={blocks} setBlocks={setBlocks} />);

      const secondBlock = screen.getByText('Second block');
      await user.click(secondBlock);
      await user.keyboard('{Meta>}{Shift>}{ArrowDown}{/Shift}{/Meta}');

      expect(setBlocks).toHaveBeenCalled();
      const lastCall = setBlocks.mock.calls[setBlocks.mock.calls.length - 1][0];
      const result = typeof lastCall === 'function' ? lastCall(blocks) : lastCall;
      expect(result[1].content).toBe('Third block');
      expect(result[2].content).toBe('Second block');
    });

    it('does nothing when last block tries to move down', async () => {
      const user = userEvent.setup();
      render(<Editor blocks={blocks} setBlocks={setBlocks} />);

      const thirdBlock = screen.getByText('Third block');
      await user.click(thirdBlock);
      const callCountBefore = setBlocks.mock.calls.length;
      await user.keyboard('{Meta>}{Shift>}{ArrowDown}{/Shift}{/Meta}');

      const calls = setBlocks.mock.calls.slice(callCountBefore);
      if (calls.length > 0) {
        const lastCall = calls[calls.length - 1][0];
        const result = typeof lastCall === 'function' ? lastCall(blocks) : lastCall;
        expect(result).toEqual(blocks);
      }
    });
  });

  describe('deleteBlock', () => {
    it('prevents deletion of last remaining block', async () => {
      const singleBlock = [{ id: '1', type: 'paragraph' as const, content: 'Only block' }];
      const setSingleBlocks = vi.fn((updater) => {
        if (typeof updater === 'function') {
          return updater(singleBlock);
        }
        return updater;
      });

      const user = userEvent.setup();
      render(<Editor blocks={singleBlock} setBlocks={setSingleBlocks} />);

      const block = screen.getByText('Only block');
      await user.click(block);
      // Select all and delete
      await user.keyboard('{Backspace}');

      // Should not delete - verify updater returns same array
      const calls = setSingleBlocks.mock.calls;
      for (const call of calls) {
        const result = typeof call[0] === 'function' ? call[0](singleBlock) : call[0];
        expect(result.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('insertBlockAfter', () => {
    it('continues bullet list on Enter', async () => {
      const bulletBlocks = [
        { id: '1', type: 'bullet' as const, content: 'Item 1' },
      ];
      let currentBlocks = bulletBlocks;
      const setBulletBlocks = vi.fn((updater) => {
        if (typeof updater === 'function') {
          currentBlocks = updater(currentBlocks);
        }
        return currentBlocks;
      });

      const user = userEvent.setup();
      render(<Editor blocks={bulletBlocks} setBlocks={setBulletBlocks} />);

      const block = screen.getByText('Item 1');
      await user.click(block);
      await user.keyboard('{Enter}');

      // Should have added a new bullet block
      expect(setBulletBlocks).toHaveBeenCalled();
      expect(currentBlocks.length).toBe(2);
      expect(currentBlocks[1].type).toBe('bullet');
    });

    it('converts empty bullet to paragraph on Enter', async () => {
      const bulletBlocks = [
        { id: '1', type: 'bullet' as const, content: '' },
      ];
      let currentBlocks = bulletBlocks;
      const setBulletBlocks = vi.fn((updater) => {
        if (typeof updater === 'function') {
          currentBlocks = updater(currentBlocks);
        }
        return currentBlocks;
      });

      const user = userEvent.setup();
      render(<Editor blocks={bulletBlocks} setBlocks={setBulletBlocks} />);

      // Need to focus the contentEditable directly (not the wrapper)
      // since there's no text to click on in an empty block
      const contentEditable = document.querySelector('.block-input.block-bullet');
      expect(contentEditable).toBeTruthy();
      (contentEditable as HTMLElement).focus();
      await user.keyboard('{Enter}');

      // Should convert to paragraph, not add new block
      expect(currentBlocks.length).toBe(1);
      expect(currentBlocks[0].type).toBe('paragraph');
    });

    it('converts todo-checked to todo on Enter', async () => {
      const todoBlocks = [
        { id: '1', type: 'todo-checked' as const, content: 'Done task' },
      ];
      let currentBlocks = todoBlocks;
      const setTodoBlocks = vi.fn((updater) => {
        if (typeof updater === 'function') {
          currentBlocks = updater(currentBlocks);
        }
        return currentBlocks;
      });

      const user = userEvent.setup();
      render(<Editor blocks={todoBlocks} setBlocks={setTodoBlocks} />);

      const block = screen.getByText('Done task');
      await user.click(block);
      await user.keyboard('{Enter}');

      // New block should be todo (unchecked), not todo-checked
      expect(currentBlocks.length).toBe(2);
      expect(currentBlocks[1].type).toBe('todo');
    });
  });

  describe('getNumberedIndex', () => {
    it('displays correct numbering for consecutive numbered blocks', () => {
      const numberedBlocks = [
        { id: '1', type: 'numbered' as const, content: 'First' },
        { id: '2', type: 'numbered' as const, content: 'Second' },
        { id: '3', type: 'numbered' as const, content: 'Third' },
      ];

      render(<Editor blocks={numberedBlocks} setBlocks={vi.fn()} />);

      // Check that the numbered prefixes are rendered correctly
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('3.')).toBeInTheDocument();
    });

    it('restarts numbering after non-numbered block', () => {
      const mixedBlocks = [
        { id: '1', type: 'numbered' as const, content: 'First' },
        { id: '2', type: 'paragraph' as const, content: 'Break' },
        { id: '3', type: 'numbered' as const, content: 'New first' },
      ];

      render(<Editor blocks={mixedBlocks} setBlocks={vi.fn()} />);

      // Should have two "1." prefixes (one for each run)
      const ones = screen.getAllByText('1.');
      expect(ones.length).toBe(2);
    });
  });

  describe('visibleBlocks with collapsed sections', () => {
    it('hides content after collapsed H1 until next H1', () => {
      const sectionBlocks = [
        { id: 'h1-1', type: 'h1' as const, content: 'Section 1' },
        { id: 'p1', type: 'paragraph' as const, content: 'Content 1' },
        { id: 'h1-2', type: 'h1' as const, content: 'Section 2' },
        { id: 'p2', type: 'paragraph' as const, content: 'Content 2' },
      ];
      const collapsedIds = new Set(['h1-1']);

      render(
        <Editor
          blocks={sectionBlocks}
          setBlocks={vi.fn()}
          collapsedBlockIds={collapsedIds}
        />
      );

      // Section 1 heading should be visible
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      // Content 1 should be hidden (collapsed)
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      // Section 2 and its content should be visible
      expect(screen.getByText('Section 2')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('shows all blocks when nothing is collapsed', () => {
      const sectionBlocks = [
        { id: 'h1-1', type: 'h1' as const, content: 'Section 1' },
        { id: 'p1', type: 'paragraph' as const, content: 'Content 1' },
      ];

      render(
        <Editor
          blocks={sectionBlocks}
          setBlocks={vi.fn()}
          collapsedBlockIds={new Set()}
        />
      );

      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });
});
