import {
  useState,
  useCallback,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from 'react';
import {
  Task,
  Block,
  BlockType,
  TaskType,
  TimeSession,
  TASK_TYPE_COLORS,
} from '../types';
import { BlockInput } from './BlockInput';
import { TypeSelectionModal } from './TypeSelectionModal';
import { generateId } from '../utils/markdown';
import {
  getNumberedIndex,
  indentBlock as indentBlockUtil,
  unindentBlock as unindentBlockUtil,
} from '../utils/block-operations';
import {
  formatMinutes,
  computeTimeSpentWithActive,
} from '../utils/task-operations';
import { PencilIcon } from './icons';
import { useMultiTaskTimeTracking } from '../hooks/useMultiTaskTimeTracking';

interface TaskNotesEditorProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddTask: (
    title: string,
    type: TaskType,
    insertAfterTaskId?: string | null
  ) => Promise<Task | null>;
  onSelectTask: (id: string) => void;
  onAddSession?: (taskId: string, session: TimeSession) => void;
  /** Called when the focused task changes (for context-aware commands) */
  onFocusedTaskChange?: (taskId: string | null) => void;
}

/**
 * Parse focusedItemId to extract kind and taskId.
 * Format: "header-{taskId}" or "block-{taskId}-{blockId}"
 */
function parseItemId(
  itemId: string | null
): { kind: 'header' | 'block'; taskId: string } | null {
  if (!itemId) return null;
  if (itemId.startsWith('header-')) {
    return { kind: 'header', taskId: itemId.slice(7) };
  }
  if (itemId.startsWith('block-')) {
    // Format: block-{taskId}-{blockId} - extract taskId (may contain dashes)
    const withoutPrefix = itemId.slice(6);
    const lastDash = withoutPrefix.lastIndexOf('-');
    if (lastDash === -1) return null;
    return { kind: 'block', taskId: withoutPrefix.slice(0, lastDash) };
  }
  return null;
}

// A unified item that can be either a task header or a block
type NotesItem =
  | { kind: 'task-header'; task: Task; itemId: string }
  | {
      kind: 'block';
      task: Task;
      block: Block;
      blockIndex: number;
      itemId: string;
    };

function createBlock(type: BlockType = 'paragraph', content = ''): Block {
  return { id: generateId(), type, content };
}

// Task header component - editable title with colored background
function TaskHeader({
  task,
  isFocused,
  isTracking,
  elapsedMs,
  onFocus,
  onArrowUp,
  onArrowDown,
  onTitleChange,
  onEnter,
  onSelectTask,
}: {
  task: Task;
  isFocused: boolean;
  isTracking: boolean;
  elapsedMs: number;
  onFocus: () => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
  onTitleChange: (title: string) => void;
  onEnter: () => void;
  onSelectTask: () => void;
}) {
  const inputRef = useRef<HTMLDivElement>(null);
  const colors = TASK_TYPE_COLORS[task.type];

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      if (inputRef.current.childNodes.length > 0) {
        range.selectNodeContents(inputRef.current);
        range.collapse(false);
      } else {
        range.setStart(inputRef.current, 0);
        range.collapse(true);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isFocused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onArrowUp();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onArrowDown();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    }
  };

  const handleInput = () => {
    const text = inputRef.current?.textContent || '';
    onTitleChange(text);
  };

  // Calculate time spent including current elapsed time if tracking
  const baseTimeSpentMs = computeTimeSpentWithActive(task.sessions);
  const totalTimeSpentMs = isTracking
    ? baseTimeSpentMs + elapsedMs
    : baseTimeSpentMs;
  const timeSpentMinutes = Math.floor(totalTimeSpentMs / 60000);
  const hasEstimate = task.estimate !== undefined && task.estimate > 0;
  const isOverEstimate =
    hasEstimate && totalTimeSpentMs > task.estimate! * 60000;
  const showTimeDisplay = isTracking && hasEstimate;

  return (
    <div className="group relative flex items-center gap-2 mb-2">
      {showTimeDisplay && (
        <span
          className={`absolute right-full mr-2 text-small whitespace-nowrap ${isOverEstimate ? 'text-red-500' : 'text-muted'}`}
          data-testid={`time-display-${task.id}`}
        >
          {formatMinutes(timeSpentMinutes)} / {formatMinutes(task.estimate!)}
        </span>
      )}
      <div
        ref={inputRef}
        role="textbox"
        tabIndex={0}
        contentEditable
        suppressContentEditableWarning
        className={`text-title leading-tight font-bold px-2 py-1 rounded outline-none flex-1 ${colors.bg} ${colors.text} ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        data-testid={`task-header-${task.id}`}
      >
        {task.title || 'Untitled'}
      </div>
      <button
        type="button"
        onClick={onSelectTask}
        className="text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity p-1"
        aria-label={`Edit ${task.title || 'task'}`}
      >
        <PencilIcon />
      </button>
    </div>
  );
}

export function TaskNotesEditor({
  tasks,
  onUpdateTask,
  onAddTask,
  onSelectTask,
  onAddSession,
  onFocusedTaskChange,
}: TaskNotesEditorProps) {
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [pendingTaskTitle, setPendingTaskTitle] = useState<string | null>(null);
  // Track where the new task should be inserted (task ID to insert after, or null for beginning)
  const [pendingInsertAfterTaskId, setPendingInsertAfterTaskId] = useState<
    string | null
  >(null);
  const pendingFocusRef = useRef<string | null>(null);

  // Derive activeTaskId from focusedItemId - only track when focus is on a block (not header)
  const activeTrackingTaskId = useMemo(() => {
    const parsed = parseItemId(focusedItemId);
    if (parsed?.kind === 'block') {
      return parsed.taskId;
    }
    return null;
  }, [focusedItemId]);

  // Derive focused task ID for context-aware commands (includes both headers and blocks)
  const focusedTaskId = useMemo(() => {
    const parsed = parseItemId(focusedItemId);
    return parsed?.taskId ?? null;
  }, [focusedItemId]);

  // Notify parent when focused task changes
  useEffect(() => {
    onFocusedTaskChange?.(focusedTaskId);
  }, [focusedTaskId, onFocusedTaskChange]);

  // Time tracking hook
  const { trackingTaskId, elapsedMs } = useMultiTaskTimeTracking({
    activeTaskId: activeTrackingTaskId,
    tasks,
    onAddSession: onAddSession || (() => {}),
  });

  // Build a flat list of all items (headers + blocks)
  const items = useMemo(() => {
    const result: NotesItem[] = [];

    tasks.forEach((task) => {
      // Task header
      result.push({
        kind: 'task-header',
        task,
        itemId: `header-${task.id}`,
      });

      // Task blocks
      task.blocks.forEach((block, blockIndex) => {
        result.push({
          kind: 'block',
          task,
          block,
          blockIndex,
          itemId: `block-${task.id}-${block.id}`,
        });
      });
    });

    return result;
  }, [tasks]);

  // Apply pending focus
  useEffect(() => {
    if (pendingFocusRef.current) {
      setFocusedItemId(pendingFocusRef.current);
      pendingFocusRef.current = null;
    }
  }, [items]);

  // Navigation helpers
  const focusPrevious = useCallback(
    (currentItemId: string) => {
      const index = items.findIndex((item) => item.itemId === currentItemId);
      if (index > 0) {
        setFocusedItemId(items[index - 1].itemId);
      }
    },
    [items]
  );

  const focusNext = useCallback(
    (currentItemId: string) => {
      const index = items.findIndex((item) => item.itemId === currentItemId);
      if (index < items.length - 1) {
        setFocusedItemId(items[index + 1].itemId);
      }
    },
    [items]
  );

  // Block operations
  const updateBlock = useCallback(
    (taskId: string, blockId: string, content: string, type: BlockType) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const newBlocks = task.blocks.map((b) =>
        b.id === blockId ? { ...b, content, type } : b
      );
      onUpdateTask(taskId, { blocks: newBlocks });
    },
    [tasks, onUpdateTask]
  );

  const insertBlockAfter = useCallback(
    (
      taskId: string,
      blockId: string,
      splitInfo?: { contentBefore: string; contentAfter: string }
    ) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const blockIndex = task.blocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      const currentBlock = task.blocks[blockIndex];
      const newBlock = createBlock('paragraph', splitInfo?.contentAfter || '');

      const newBlocks = [...task.blocks];
      if (splitInfo) {
        newBlocks[blockIndex] = {
          ...currentBlock,
          content: splitInfo.contentBefore,
        };
      }
      newBlocks.splice(blockIndex + 1, 0, newBlock);

      onUpdateTask(taskId, { blocks: newBlocks });
      pendingFocusRef.current = `block-${taskId}-${newBlock.id}`;
    },
    [tasks, onUpdateTask]
  );

  const deleteBlock = useCallback(
    (taskId: string, blockId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const blockIndex = task.blocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      // If it's the only block, just clear it
      if (task.blocks.length === 1) {
        onUpdateTask(taskId, {
          blocks: [createBlock('paragraph', '')],
        });
        return;
      }

      const newBlocks = task.blocks.filter((b) => b.id !== blockId);
      onUpdateTask(taskId, { blocks: newBlocks });

      // Focus previous block or header
      if (blockIndex > 0) {
        pendingFocusRef.current = `block-${taskId}-${task.blocks[blockIndex - 1].id}`;
      } else {
        pendingFocusRef.current = `header-${taskId}`;
      }
    },
    [tasks, onUpdateTask]
  );

  const mergeBlock = useCallback(
    (taskId: string, blockId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const blockIndex = task.blocks.findIndex((b) => b.id === blockId);
      if (blockIndex <= 0) return; // Can't merge first block

      const currentBlock = task.blocks[blockIndex];
      const prevBlock = task.blocks[blockIndex - 1];

      const mergedContent = prevBlock.content + currentBlock.content;
      const newBlocks = task.blocks
        .map((b, i) =>
          i === blockIndex - 1 ? { ...b, content: mergedContent } : b
        )
        .filter((_, i) => i !== blockIndex);

      onUpdateTask(taskId, { blocks: newBlocks });
      pendingFocusRef.current = `block-${taskId}-${prevBlock.id}`;
    },
    [tasks, onUpdateTask]
  );

  // Handle task creation from $ prefix in last block
  const handleTaskCreate = useCallback((taskId: string, title: string) => {
    setPendingInsertAfterTaskId(taskId);
    setPendingTaskTitle(title);
  }, []);

  // Handle indent/unindent for bullet blocks
  const indentBlock = useCallback(
    (taskId: string, blockId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const newBlocks = indentBlockUtil(task.blocks, blockId);
      if (newBlocks !== task.blocks) {
        onUpdateTask(taskId, { blocks: newBlocks });
      }
    },
    [tasks, onUpdateTask]
  );

  const unindentBlock = useCallback(
    (taskId: string, blockId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const newBlocks = unindentBlockUtil(task.blocks, blockId);
      if (newBlocks !== task.blocks) {
        onUpdateTask(taskId, { blocks: newBlocks });
      }
    },
    [tasks, onUpdateTask]
  );

  // Handle task type selection
  const handleTypeSelect = useCallback(
    async (type: TaskType) => {
      if (!pendingTaskTitle) return;

      const insertAfterTaskId = pendingInsertAfterTaskId;
      setPendingTaskTitle(null);
      setPendingInsertAfterTaskId(null);

      // Pass insertAfterTaskId so the task is created at the correct position
      const newTask = await onAddTask(
        pendingTaskTitle,
        type,
        insertAfterTaskId
      );

      if (newTask) {
        // Create a first block for the task and focus it
        const firstBlock = createBlock('paragraph', '');
        onUpdateTask(newTask.id, { blocks: [firstBlock] });
        pendingFocusRef.current = `block-${newTask.id}-${firstBlock.id}`;
      }
    },
    [pendingTaskTitle, pendingInsertAfterTaskId, onAddTask, onUpdateTask]
  );

  const handleTypeCancel = useCallback(() => {
    setPendingTaskTitle(null);
    setPendingInsertAfterTaskId(null);
  }, []);

  // Handle header title change
  const handleTitleChange = useCallback(
    (taskId: string, title: string) => {
      onUpdateTask(taskId, { title });
    },
    [onUpdateTask]
  );

  // Handle Enter on header - move to first block or create one
  const handleHeaderEnter = useCallback(
    (task: Task) => {
      if (task.blocks.length > 0) {
        setFocusedItemId(`block-${task.id}-${task.blocks[0].id}`);
      } else {
        // Create first block
        const newBlock = createBlock('paragraph', '');
        onUpdateTask(task.id, { blocks: [newBlock] });
        pendingFocusRef.current = `block-${task.id}-${newBlock.id}`;
      }
    },
    [onUpdateTask]
  );

  return (
    <div className="w-full pl-20">
      {items.map((item) => {
        if (item.kind === 'task-header') {
          return (
            <div key={item.itemId} className="mb-0 mt-6 first:mt-0">
              <TaskHeader
                task={item.task}
                isFocused={focusedItemId === item.itemId}
                isTracking={trackingTaskId === item.task.id}
                elapsedMs={trackingTaskId === item.task.id ? elapsedMs : 0}
                onFocus={() => setFocusedItemId(item.itemId)}
                onArrowUp={() => focusPrevious(item.itemId)}
                onArrowDown={() => focusNext(item.itemId)}
                onTitleChange={(title) =>
                  handleTitleChange(item.task.id, title)
                }
                onEnter={() => handleHeaderEnter(item.task)}
                onSelectTask={() => onSelectTask(item.task.id)}
              />
            </div>
          );
        }

        if (item.kind === 'block') {
          const { task, block, blockIndex } = item;
          const isLastBlock = blockIndex === task.blocks.length - 1;
          return (
            <BlockInput
              key={item.itemId}
              block={block}
              onUpdate={(id, content, type) =>
                updateBlock(task.id, id, content, type)
              }
              onEnter={(id, splitInfo) =>
                insertBlockAfter(task.id, id, splitInfo)
              }
              onBackspace={(id) => deleteBlock(task.id, id)}
              onMerge={(id) => mergeBlock(task.id, id)}
              onFocus={() => setFocusedItemId(item.itemId)}
              onArrowUp={() => focusPrevious(item.itemId)}
              onArrowDown={() => focusNext(item.itemId)}
              isFocused={focusedItemId === item.itemId}
              isSelected={false}
              onSelect={() => {}}
              onEnterEdit={() => setFocusedItemId(item.itemId)}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
              numberedIndex={getNumberedIndex(task.blocks, blockIndex)}
              isLastBlock={isLastBlock}
              onTaskCreate={(title) => handleTaskCreate(task.id, title)}
              onIndent={(id) => indentBlock(task.id, id)}
              onUnindent={(id) => unindentBlock(task.id, id)}
            />
          );
        }

        return null;
      })}

      {pendingTaskTitle && (
        <TypeSelectionModal
          onSelect={handleTypeSelect}
          onCancel={handleTypeCancel}
        />
      )}
    </div>
  );
}
