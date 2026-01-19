import { useState, useCallback, useMemo } from 'react';
import { Task, Block } from '../../types';
import { Editor, createBlock } from '../Editor';
import { BackButton } from '../BackButton';

interface TaskDetailViewProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onBack: () => void;
}

export function TaskDetailView({
  task,
  onUpdateTask,
  onBack,
}: TaskDetailViewProps) {
  const [title, setTitle] = useState(task.title);

  // Ensure there's at least one block - memoize to keep stable reference
  const blocks = useMemo(
    () => (task.blocks.length > 0 ? task.blocks : [createBlock()]),
    [task.blocks]
  );

  const handleTitleBlur = useCallback(() => {
    if (title !== task.title) {
      onUpdateTask(task.id, { title });
    }
  }, [title, task.id, task.title, onUpdateTask]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  const setBlocks = useCallback(
    (blocksOrUpdater: Block[] | ((prev: Block[]) => Block[])) => {
      const newBlocks =
        typeof blocksOrUpdater === 'function'
          ? blocksOrUpdater(blocks)
          : blocksOrUpdater;
      onUpdateTask(task.id, { blocks: newBlocks });
    },
    [task.id, blocks, onUpdateTask]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <BackButton onClick={onBack} />
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={handleTitleKeyDown}
        placeholder="Task title"
        className="text-2xl font-bold text-primary bg-transparent border-none outline-none mb-6 w-full"
      />

      <div className="flex-1">
        <Editor blocks={blocks} setBlocks={setBlocks} />
      </div>
    </div>
  );
}
