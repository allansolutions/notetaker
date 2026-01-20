import {
  useState,
  useCallback,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
} from 'react';
import { Task, Block, BlockType, TaskType, TASK_TYPE_COLORS } from '../types';
import { BlockInput } from './BlockInput';
import { TypeSelectionModal } from './TypeSelectionModal';
import { detectBlockType, stripPrefix, generateId } from '../utils/markdown';
import { blockTypeClasses } from '../utils/block-styles';
import { getNumberedIndex } from '../utils/block-operations';
import { PencilIcon } from './icons';

interface TaskNotesEditorProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddTask: (
    title: string,
    type: TaskType,
    insertAfterTaskId?: string | null
  ) => Promise<Task | null>;
  onSelectTask: (id: string) => void;
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
    }
  | { kind: 'new-line'; itemId: string };

function createBlock(type: BlockType = 'paragraph', content = ''): Block {
  return { id: generateId(), type, content };
}

// Task header component - editable title with colored background
function TaskHeader({
  task,
  isFocused,
  onFocus,
  onArrowUp,
  onArrowDown,
  onTitleChange,
  onEnter,
  onSelectTask,
}: {
  task: Task;
  isFocused: boolean;
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
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onArrowUp();
        break;
      case 'ArrowDown':
        e.preventDefault();
        onArrowDown();
        break;
      case 'Enter':
        e.preventDefault();
        onEnter();
        break;
    }
  };

  const handleInput = () => {
    const text = inputRef.current?.textContent || '';
    onTitleChange(text);
  };

  return (
    <div className="group flex items-center gap-2 mb-2">
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

// New line input for creating new content or tasks
function NewLineInput({
  isFocused,
  onFocus,
  onArrowUp,
  onEnter,
  onBlur,
  itemId,
}: {
  isFocused: boolean;
  onFocus: () => void;
  onArrowUp: () => void;
  onEnter: (content: string) => void;
  onBlur: (content: string) => void;
  itemId: string;
}) {
  const inputRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef('');

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onArrowUp();
        break;
      case 'Enter': {
        e.preventDefault();
        // Use the tracked content, not textContent (more reliable)
        const text = contentRef.current;
        onEnter(text);
        if (inputRef.current) {
          inputRef.current.textContent = '';
        }
        contentRef.current = '';
        break;
      }
    }
  };

  const handleInput = () => {
    const text = inputRef.current?.textContent || '';
    contentRef.current = text;
  };

  const handleBlur = () => {
    const text = contentRef.current.trim();
    if (text && !text.startsWith('$ ')) {
      // Save non-task content on blur
      onBlur(text);
      if (inputRef.current) {
        inputRef.current.textContent = '';
      }
      contentRef.current = '';
    }
  };

  return (
    <div className="flex items-center my-px">
      <div
        ref={inputRef}
        role="textbox"
        tabIndex={0}
        contentEditable
        suppressContentEditableWarning
        className={`block-input w-full outline-none border-none py-[3px] px-0.5 min-h-[1.5em] whitespace-pre-wrap break-words focus:bg-focus-bg focus:rounded-sm ${blockTypeClasses.paragraph}`}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={handleBlur}
        data-placeholder="Type $ to create a new task..."
        data-testid={`new-line-${itemId}`}
      />
    </div>
  );
}

export function TaskNotesEditor({
  tasks,
  onUpdateTask,
  onAddTask,
  onSelectTask,
}: TaskNotesEditorProps) {
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [pendingTaskTitle, setPendingTaskTitle] = useState<string | null>(null);
  // Track where the new task should be inserted (task ID to insert after, or null for beginning)
  const [pendingInsertAfterTaskId, setPendingInsertAfterTaskId] = useState<
    string | null
  >(null);
  const pendingFocusRef = useRef<string | null>(null);

  // Build a flat list of all items (headers + blocks + new lines between tasks)
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

      // New line after each task's blocks (for adding content to this task)
      result.push({
        kind: 'new-line',
        itemId: `newline-after-${task.id}`,
      });
    });

    // Final new line for creating new tasks
    result.push({
      kind: 'new-line',
      itemId: 'newline-end',
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

  // Find task associated with a new-line item
  const getTaskForNewLine = useCallback(
    (itemId: string): Task | null => {
      if (itemId === 'newline-end') return null;
      const match = itemId.match(/^newline-after-(.+)$/);
      if (match) {
        return tasks.find((t) => t.id === match[1]) || null;
      }
      return null;
    },
    [tasks]
  );

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

  // Add a block to a task (shared logic for Enter and Blur)
  const addBlockToTask = useCallback(
    (task: Task, content: string, setFocus: boolean = true) => {
      const detectedType = detectBlockType(content);
      const blockContent =
        detectedType !== 'paragraph'
          ? stripPrefix(content, detectedType)
          : content;
      const newBlock = createBlock(detectedType, blockContent);
      const newBlocks = [...task.blocks, newBlock];
      onUpdateTask(task.id, { blocks: newBlocks });
      if (setFocus) {
        pendingFocusRef.current = `block-${task.id}-${newBlock.id}`;
      }
    },
    [onUpdateTask]
  );

  // Handle adding new block to a task from new-line input (on Enter)
  const handleNewLineEnter = useCallback(
    async (itemId: string, content: string) => {
      // Check for $ prefix (task creation)
      if (content.startsWith('$ ')) {
        const title = content.slice(2).trim();
        if (title) {
          // Determine where to insert the new task
          // If itemId is 'newline-end', insert at end (after last task)
          // If itemId is 'newline-after-{taskId}', insert after that task
          const insertAfterTask = getTaskForNewLine(itemId);
          setPendingInsertAfterTaskId(insertAfterTask?.id ?? null);
          setPendingTaskTitle(title);
        }
        return;
      }

      // Adding block to existing task
      const task = getTaskForNewLine(itemId);
      if (task && content.trim()) {
        addBlockToTask(task, content.trim(), true);
      }
      // At the very end - ignore non-$ content (user must use $ prefix to create a task)
    },
    [getTaskForNewLine, addBlockToTask]
  );

  // Handle saving content when new-line input loses focus (on blur)
  const handleNewLineBlur = useCallback(
    (itemId: string, content: string) => {
      // Only save to existing tasks (not at the very end where $ is required)
      const task = getTaskForNewLine(itemId);
      if (task && content.trim()) {
        addBlockToTask(task, content.trim(), false);
      }
    },
    [getTaskForNewLine, addBlockToTask]
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
    <div className="w-full">
      {items.map((item) => {
        if (item.kind === 'task-header') {
          return (
            <div key={item.itemId} className="mb-0 mt-6 first:mt-0">
              <TaskHeader
                task={item.task}
                isFocused={focusedItemId === item.itemId}
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
            />
          );
        }

        if (item.kind === 'new-line') {
          return (
            <NewLineInput
              key={item.itemId}
              isFocused={focusedItemId === item.itemId}
              onFocus={() => setFocusedItemId(item.itemId)}
              onArrowUp={() => focusPrevious(item.itemId)}
              onEnter={(content) => handleNewLineEnter(item.itemId, content)}
              onBlur={(content) => handleNewLineBlur(item.itemId, content)}
              itemId={item.itemId}
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
