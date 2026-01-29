import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

import { Block, BlockType } from '../types';
import { BlockInput } from './BlockInput';
import { BlockCommandMenu } from './BlockCommandMenu';
import { WikiPageEmbed } from './WikiPageEmbed';
import { useUndoHistory } from '../hooks/useUndoHistory';
import {
  deleteBlock as deleteBlockUtil,
  deleteBlocks as deleteBlocksUtil,
  getNumberedIndex,
  getShownBlocks,
  getVisibleBlocks,
  insertBlockAfter as insertBlockAfterUtil,
  mergeBlockWithPrevious as mergeBlockWithPreviousUtil,
  moveBlockDown,
  moveBlockUp,
  moveBlocksUp,
  moveBlocksDown,
  indentBlock as indentBlockUtil,
  unindentBlock as unindentBlockUtil,
  SplitInfo,
} from '../utils/block-operations';
import {
  generateId,
  getPrefix,
  detectBlockType,
  stripPrefix,
} from '../utils/markdown';

export function createBlock(
  type: BlockType = 'paragraph',
  content = ''
): Block {
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
  onNavigateToPage?: (pageId: string) => void;
}

export function Editor({
  blocks,
  setBlocks,
  navigateToId,
  onNavigateComplete,
  collapsedBlockIds,
  onToggleCollapse,
  hiddenBlockIds,
  onNavigateToPage,
}: EditorProps): JSX.Element {
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const [focusedId, setFocusedId] = useState<string | null>(
    blocks[0]?.id || null
  );
  const focusedIdRef = useRef(focusedId);
  focusedIdRef.current = focusedId;

  const { pushHistory, undo, redo } = useUndoHistory(blocksRef, focusedIdRef);
  const [undoGeneration, setUndoGeneration] = useState(0);
  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Anchor is the block where selection started (for Shift+Arrow extension)
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  // The block that should receive keyboard focus in multi-selection (boundary block)
  const [selectionFocusId, setSelectionFocusId] = useState<string | null>(null);
  // Block command menu state
  const [isBlockCommandMenuOpen, setIsBlockCommandMenuOpen] = useState(false);
  const blockCommandAnchorRef = useRef<HTMLElement | null>(null);
  const pendingFocusRef = useRef<string | null>(null);
  const [pendingCursorOffset, setPendingCursorOffset] = useState<{
    blockId: string;
    offset: number;
  } | null>(null);
  const [pendingCursorX, setPendingCursorX] = useState<{
    blockId: string;
    x: number;
    fromTop: boolean;
  } | null>(null);

  // Apply pending focus after blocks update
  useEffect(() => {
    if (pendingFocusRef.current) {
      setFocusedId(pendingFocusRef.current);
      pendingFocusRef.current = null;
    }
  }, [blocks]);

  // Clear pending cursor offset after it's been consumed
  useEffect(() => {
    if (pendingCursorOffset) {
      const timer = setTimeout(() => setPendingCursorOffset(null), 50);
      return () => clearTimeout(timer);
    }
  }, [pendingCursorOffset]);

  // Clear pending cursor X after it's been consumed
  useEffect(() => {
    if (pendingCursorX) {
      const timer = setTimeout(() => setPendingCursorX(null), 50);
      return () => clearTimeout(timer);
    }
  }, [pendingCursorX]);

  // Compute visible blocks for navigation and rendering
  const shownBlocks = useMemo(
    () => getShownBlocks(blocks, hiddenBlockIds),
    [blocks, hiddenBlockIds]
  );
  const visibleBlocks = useMemo(
    () => getVisibleBlocks(shownBlocks, collapsedBlockIds),
    [shownBlocks, collapsedBlockIds]
  );

  // Handle navigation from outline
  useEffect(() => {
    if (navigateToId) {
      setFocusedId(navigateToId);
      setSelectedIds(new Set());
      setSelectionAnchor(null);
      setSelectionFocusId(null);
      // Scroll the block into view
      const element = document.querySelector(
        `[data-block-id="${navigateToId}"]`
      );
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      onNavigateComplete?.();
    }
  }, [navigateToId, onNavigateComplete]);

  const updateBlock = useCallback(
    (id: string, content: string, type: BlockType) => {
      const existing = blocksRef.current!.find((b) => b.id === id);
      if (existing && existing.type !== type) {
        pushHistory('structural');
      } else {
        pushHistory('content', id);
      }
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === id ? { ...block, content, type } : block
        )
      );
    },
    [setBlocks, pushHistory]
  );

  const insertBlockAfter = useCallback(
    (id: string, splitInfo?: SplitInfo) => {
      pushHistory('structural');
      setBlocks((prev) => {
        const result = insertBlockAfterUtil(prev, id, createBlock, splitInfo);
        if (result.newBlockId) {
          pendingFocusRef.current = result.newBlockId;
          // Position cursor at start of new block
          setPendingCursorOffset({
            blockId: result.newBlockId,
            offset: 0,
          });
        }
        return result.blocks;
      });
    },
    [setBlocks, pushHistory]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      pushHistory('structural');
      setBlocks((prev) => {
        const result = deleteBlockUtil(prev, id);
        if (result.focusBlockId) {
          setFocusedId(result.focusBlockId);
        }
        return result.blocks;
      });
    },
    [setBlocks, pushHistory]
  );

  const mergeBlock = useCallback(
    (id: string) => {
      pushHistory('structural');
      setBlocks((prev) => {
        const result = mergeBlockWithPreviousUtil(prev, id);
        if (!result) return prev;
        if (result.focusBlockId) {
          setFocusedId(result.focusBlockId);
          setPendingCursorOffset({
            blockId: result.focusBlockId,
            offset: result.cursorOffset,
          });
        }
        return result.blocks;
      });
    },
    [setBlocks, pushHistory]
  );

  const focusPreviousBlock = useCallback(
    (id: string, cursorX?: number) => {
      const index = visibleBlocks.findIndex((b) => b.id === id);
      if (index > 0) {
        const targetId = visibleBlocks[index - 1].id;
        setFocusedId(targetId);
        if (cursorX !== undefined) {
          // Coming from below, position cursor on the last line
          setPendingCursorX({ blockId: targetId, x: cursorX, fromTop: false });
        }
      }
    },
    [visibleBlocks]
  );

  const focusNextBlock = useCallback(
    (id: string, cursorX?: number) => {
      const index = visibleBlocks.findIndex((b) => b.id === id);
      if (index < visibleBlocks.length - 1) {
        const targetId = visibleBlocks[index + 1].id;
        setFocusedId(targetId);
        if (cursorX !== undefined) {
          // Coming from above, position cursor on the first line
          setPendingCursorX({ blockId: targetId, x: cursorX, fromTop: true });
        }
      }
    },
    [visibleBlocks]
  );

  // Select a single block (clears any existing selection)
  const selectBlock = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
    setSelectionAnchor(id);
    setSelectionFocusId(id);
    setFocusedId(null);
  }, []);

  // Clear selection and enter edit mode
  const enterEditMode = useCallback((id: string) => {
    setSelectedIds(new Set());
    setSelectionAnchor(null);
    setSelectionFocusId(null);
    setFocusedId(id);
  }, []);

  // Extend selection from anchor to target block (for Shift+Arrow)
  const extendSelection = useCallback(
    (targetId: string) => {
      if (!selectionAnchor) return;

      const anchorIndex = visibleBlocks.findIndex(
        (b) => b.id === selectionAnchor
      );
      const targetIndex = visibleBlocks.findIndex((b) => b.id === targetId);

      if (anchorIndex < 0 || targetIndex < 0) return;

      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);

      const newSelection = new Set<string>();
      for (let i = start; i <= end; i++) {
        newSelection.add(visibleBlocks[i].id);
      }
      setSelectedIds(newSelection);
      // Move focus to the target block (boundary of selection)
      setSelectionFocusId(targetId);
    },
    [selectionAnchor, visibleBlocks]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionAnchor(null);
    setSelectionFocusId(null);
  }, []);

  // Convert selected blocks to a new type
  const convertBlocksType = useCallback(
    (newType: BlockType) => {
      if (selectedIds.size === 0) return;
      pushHistory('structural');
      setBlocks((prev) =>
        prev.map((block) =>
          selectedIds.has(block.id) ? { ...block, type: newType } : block
        )
      );
      clearSelection();
    },
    [selectedIds, pushHistory, setBlocks, clearSelection]
  );

  // Duplicate selected blocks (insert copies after the last selected block)
  const duplicateBlocks = useCallback(() => {
    if (selectedIds.size === 0) return;
    pushHistory('structural');
    setBlocks((prev) => {
      // Find the last selected block index
      let lastSelectedIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (selectedIds.has(prev[i].id)) {
          lastSelectedIndex = i;
          break;
        }
      }
      if (lastSelectedIndex === -1) return prev;

      // Collect selected blocks in order and create duplicates
      const selectedInOrder = prev.filter((b) => selectedIds.has(b.id));
      const duplicates = selectedInOrder.map((b) => ({
        ...b,
        id: generateId(),
      }));

      // Insert duplicates after the last selected block
      const result = [...prev];
      result.splice(lastSelectedIndex + 1, 0, ...duplicates);
      return result;
    });
    clearSelection();
  }, [selectedIds, pushHistory, setBlocks, clearSelection]);

  // Open block command menu
  const openBlockCommandMenu = useCallback(() => {
    if (selectedIds.size === 0) return;

    // Find the first selected block element to anchor the menu
    const firstSelectedId = visibleBlocks.find((b) =>
      selectedIds.has(b.id)
    )?.id;
    if (firstSelectedId) {
      const element = document.querySelector(
        `[data-block-id="${firstSelectedId}"]`
      );
      if (element) {
        blockCommandAnchorRef.current = element as HTMLElement;
        setIsBlockCommandMenuOpen(true);
      }
    }
  }, [selectedIds, visibleBlocks]);

  // Close block command menu
  const closeBlockCommandMenu = useCallback(() => {
    setIsBlockCommandMenuOpen(false);
  }, []);

  const handleUndo = useCallback(() => {
    const entry = undo();
    if (!entry) return;
    setBlocks(entry.blocks);
    setFocusedId(entry.focusedId);
    setSelectedIds(new Set());
    setSelectionAnchor(null);
    setSelectionFocusId(null);
    setUndoGeneration((g) => g + 1);
  }, [undo, setBlocks]);

  const handleRedo = useCallback(() => {
    const entry = redo();
    if (!entry) return;
    setBlocks(entry.blocks);
    setFocusedId(entry.focusedId);
    setSelectedIds(new Set());
    setSelectionAnchor(null);
    setSelectionFocusId(null);
    setUndoGeneration((g) => g + 1);
  }, [redo, setBlocks]);

  // Select the previous block (for Up arrow in selection mode)
  const selectPreviousBlock = useCallback(
    (id: string) => {
      const index = visibleBlocks.findIndex((b) => b.id === id);
      if (index > 0) {
        const targetId = visibleBlocks[index - 1].id;
        setSelectedIds(new Set([targetId]));
        setSelectionAnchor(targetId);
        setSelectionFocusId(targetId);
      }
    },
    [visibleBlocks]
  );

  // Select the next block (for Down arrow in selection mode)
  const selectNextBlock = useCallback(
    (id: string) => {
      const index = visibleBlocks.findIndex((b) => b.id === id);
      if (index < visibleBlocks.length - 1) {
        const targetId = visibleBlocks[index + 1].id;
        setSelectedIds(new Set([targetId]));
        setSelectionAnchor(targetId);
        setSelectionFocusId(targetId);
      }
    },
    [visibleBlocks]
  );

  // Get the previous block id (for extending selection upward)
  const getPreviousBlockId = useCallback(
    (id: string) => {
      const index = visibleBlocks.findIndex((b) => b.id === id);
      if (index > 0) {
        return visibleBlocks[index - 1].id;
      }
      return null;
    },
    [visibleBlocks]
  );

  // Get the next block id (for extending selection downward)
  const getNextBlockId = useCallback(
    (id: string) => {
      const index = visibleBlocks.findIndex((b) => b.id === id);
      if (index < visibleBlocks.length - 1) {
        return visibleBlocks[index + 1].id;
      }
      return null;
    },
    [visibleBlocks]
  );

  const handleMoveUp = useCallback(
    (id: string) => {
      pushHistory('structural');
      if (selectedIds.size > 1) {
        setBlocks((prev) => moveBlocksUp(prev, selectedIds));
      } else {
        setBlocks((prev) => moveBlockUp(prev, id));
      }
    },
    [setBlocks, selectedIds, pushHistory]
  );

  const handleMoveDown = useCallback(
    (id: string) => {
      pushHistory('structural');
      if (selectedIds.size > 1) {
        setBlocks((prev) => moveBlocksDown(prev, selectedIds));
      } else {
        setBlocks((prev) => moveBlockDown(prev, id));
      }
    },
    [setBlocks, selectedIds, pushHistory]
  );

  // Delete all selected blocks
  const deleteSelectedBlocks = useCallback(() => {
    if (selectedIds.size === 0) return;

    pushHistory('structural');
    setBlocks((prev) => {
      const result = deleteBlocksUtil(prev, selectedIds);
      if (result.focusBlockId) {
        setFocusedId(result.focusBlockId);
      }
      return result.blocks;
    });
    setSelectedIds(new Set());
    setSelectionAnchor(null);
  }, [setBlocks, selectedIds, pushHistory]);

  // Convert selected blocks to markdown text
  const selectedBlocksToMarkdown = useCallback(
    (ids: Set<string>) => {
      const selectedInOrder = blocks.filter((b) => ids.has(b.id));
      return selectedInOrder
        .map((block) => {
          if (block.type === 'divider') return '---';
          const indent =
            block.type === 'bullet' && block.level
              ? '  '.repeat(block.level)
              : '';
          return indent + getPrefix(block.type) + block.content;
        })
        .join('\n');
    },
    [blocks]
  );

  // Copy selected blocks as markdown
  const copySelectedBlocks = useCallback(() => {
    if (selectedIds.size === 0) return;
    const markdown = selectedBlocksToMarkdown(selectedIds);
    navigator.clipboard.writeText(markdown);
  }, [selectedIds, selectedBlocksToMarkdown]);

  // Cut selected blocks (copy + delete)
  const cutSelectedBlocks = useCallback(() => {
    if (selectedIds.size === 0) return;
    const markdown = selectedBlocksToMarkdown(selectedIds);
    navigator.clipboard.writeText(markdown);
    deleteSelectedBlocks();
  }, [selectedIds, selectedBlocksToMarkdown, deleteSelectedBlocks]);

  // Parse clipboard text into block definitions
  const parseClipboardBlocks = useCallback(
    (
      text: string
    ): Array<{ type: BlockType; content: string; level?: number }> => {
      const lines = text.split('\n');
      return lines.map((line) => {
        // Check for indented bullets (2 spaces per level)
        const indentMatch = line.match(/^( {2,})(- |\* )/);
        if (indentMatch) {
          const level = Math.min(Math.floor(indentMatch[1].length / 2), 2);
          const content = line.slice(indentMatch[0].length);
          return { type: 'bullet' as BlockType, content, level };
        }

        const type = detectBlockType(line);
        const content = stripPrefix(line, type);
        return { type, content };
      });
    },
    []
  );

  // Handle paste in edit mode (multi-line text splits into blocks)
  const handlePasteInBlock = useCallback(
    (blockId: string, text: string, cursorOffset: number) => {
      const parsed = parseClipboardBlocks(text);
      if (parsed.length === 0) return;

      pushHistory('structural');
      setBlocks((prev) => {
        const blockIndex = prev.findIndex((b) => b.id === blockId);
        if (blockIndex < 0) return prev;

        const block = prev[blockIndex];
        const beforeCursor = block.content.slice(0, cursorOffset);
        const afterCursor = block.content.slice(cursorOffset);

        const result = [...prev];
        const newBlocks: Block[] = [];
        let startIndex: number;

        if (beforeCursor === '') {
          // Cursor at start: replace current block with first parsed block.
          // Use a new block (new ID) so React remounts the component and
          // the contentEditable div picks up the new content on mount.
          const replacement = createBlock(parsed[0].type, parsed[0].content);
          if (parsed[0].level !== undefined)
            replacement.level = parsed[0].level;
          result[blockIndex] = replacement;
          startIndex = 1;
        } else {
          // Cursor in middle/end: keep current block with content before cursor,
          // insert all parsed blocks as new blocks after it
          result[blockIndex] = { ...block, content: beforeCursor };
          startIndex = 0;
        }

        for (let i = startIndex; i < parsed.length; i++) {
          const nb = createBlock(parsed[i].type, parsed[i].content);
          if (parsed[i].level !== undefined) nb.level = parsed[i].level;
          newBlocks.push(nb);
        }

        // If there's content after the cursor, add it as a trailing block
        if (afterCursor) {
          newBlocks.push(createBlock(block.type, afterCursor));
        }

        result.splice(blockIndex + 1, 0, ...newBlocks);

        // Focus the last pasted block (not the trailing afterCursor block)
        const lastPastedIndex = afterCursor
          ? newBlocks.length - 2
          : newBlocks.length - 1;
        if (lastPastedIndex >= 0) {
          const focusBlock = newBlocks[lastPastedIndex];
          pendingFocusRef.current = focusBlock.id;
          setPendingCursorOffset({
            blockId: focusBlock.id,
            offset: focusBlock.content.length,
          });
        } else {
          // Single parsed line replaced the current block
          const replacedBlock = result[blockIndex];
          pendingFocusRef.current = replacedBlock.id;
          setPendingCursorOffset({
            blockId: replacedBlock.id,
            offset: parsed[0].content.length,
          });
        }

        return result;
      });
    },
    [setBlocks, parseClipboardBlocks, pushHistory]
  );

  // Handle paste when blocks are selected (replace selection with pasted blocks)
  const handlePasteOverSelection = useCallback(
    (text: string) => {
      if (selectedIds.size === 0) return;

      const parsed = parseClipboardBlocks(text);
      if (parsed.length === 0) return;

      pushHistory('structural');
      setBlocks((prev) => {
        const firstSelectedIndex = prev.findIndex((b) => selectedIds.has(b.id));
        if (firstSelectedIndex < 0) return prev;

        const newBlocks = parsed.map((pb) => {
          const b = createBlock(pb.type, pb.content);
          if (pb.level !== undefined) b.level = pb.level;
          return b;
        });

        const without = prev.filter((b) => !selectedIds.has(b.id));
        without.splice(firstSelectedIndex, 0, ...newBlocks);

        // Focus last new block
        const lastBlock = newBlocks[newBlocks.length - 1];
        setFocusedId(lastBlock.id);

        return without;
      });

      setSelectedIds(new Set());
      setSelectionAnchor(null);
      setSelectionFocusId(null);
    },
    [setBlocks, selectedIds, parseClipboardBlocks, pushHistory]
  );

  const handleIndent = useCallback(
    (id: string) => {
      pushHistory('structural');
      setBlocks((prev) => indentBlockUtil(prev, id));
    },
    [setBlocks, pushHistory]
  );

  const handleUnindent = useCallback(
    (id: string) => {
      pushHistory('structural');
      setBlocks((prev) => unindentBlockUtil(prev, id));
    },
    [setBlocks, pushHistory]
  );

  // Convert a block to a wiki page embed
  const convertToEmbed = useCallback(
    (blockId: string, pageId: string) => {
      pushHistory('structural');
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? { ...b, type: 'wiki-page-embed' as const, pageId, content: '' }
            : b
        )
      );
    },
    [setBlocks, pushHistory]
  );

  // Handle unlinking an embed (delete the block)
  const handleUnlinkEmbed = useCallback(
    (blockId: string) => {
      deleteBlock(blockId);
    },
    [deleteBlock]
  );

  // Handle page navigation from embed
  const handleNavigateToPage = useCallback(
    (pageId: string) => {
      onNavigateToPage?.(pageId);
    },
    [onNavigateToPage]
  );

  return (
    <div className="w-full">
      {visibleBlocks.map((block) => {
        const originalIndex = blocks.findIndex((b) => b.id === block.id);

        // Render wiki page embed blocks
        if (block.type === 'wiki-page-embed' && block.pageId) {
          return (
            <WikiPageEmbed
              key={block.id}
              block={block}
              pageId={block.pageId}
              isSelected={selectedIds.has(block.id)}
              onUnlink={handleUnlinkEmbed}
              onNavigateToPage={handleNavigateToPage}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          );
        }

        return (
          <BlockInput
            key={block.id}
            block={block}
            onUpdate={updateBlock}
            onEnter={insertBlockAfter}
            onBackspace={deleteBlock}
            onMerge={mergeBlock}
            onFocus={enterEditMode}
            onArrowUp={focusPreviousBlock}
            onArrowDown={focusNextBlock}
            isFocused={focusedId === block.id}
            isSelected={selectedIds.has(block.id)}
            isSelectionFocused={selectionFocusId === block.id}
            isMultiSelected={selectedIds.size > 1}
            onSelect={selectBlock}
            onEnterEdit={enterEditMode}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onExtendSelection={extendSelection}
            onDeleteSelected={deleteSelectedBlocks}
            onCopySelected={copySelectedBlocks}
            onCutSelected={cutSelectedBlocks}
            onPasteBlocks={handlePasteInBlock}
            onPasteSelected={handlePasteOverSelection}
            onClearSelection={clearSelection}
            onSelectPrevious={selectPreviousBlock}
            onSelectNext={selectNextBlock}
            getPreviousBlockId={getPreviousBlockId}
            getNextBlockId={getNextBlockId}
            numberedIndex={getNumberedIndex(blocks, originalIndex)}
            isCollapsed={
              block.type === 'h1' && collapsedBlockIds?.has(block.id)
            }
            onToggleCollapse={onToggleCollapse}
            pendingCursorOffset={
              pendingCursorOffset?.blockId === block.id
                ? pendingCursorOffset.offset
                : null
            }
            pendingCursorX={
              pendingCursorX?.blockId === block.id
                ? { x: pendingCursorX.x, fromTop: pendingCursorX.fromTop }
                : null
            }
            onIndent={handleIndent}
            onUnindent={handleUnindent}
            undoGeneration={undoGeneration}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onConvertToEmbed={convertToEmbed}
            onOpenBlockCommandMenu={openBlockCommandMenu}
          />
        );
      })}
      {isBlockCommandMenuOpen && (
        <BlockCommandMenu
          onConvertType={convertBlocksType}
          onDelete={deleteSelectedBlocks}
          onDuplicate={duplicateBlocks}
          onClose={closeBlockCommandMenu}
          anchorRef={blockCommandAnchorRef}
        />
      )}
    </div>
  );
}
