import { useState, useCallback, useMemo } from 'react';
import { Task, Block, TimeSession } from '../../types';
import { Editor, createBlock } from '../Editor';
import { BackButton } from '../BackButton';
import { TimeDisplay } from '../TimeDisplay';
import { EstimateGate } from '../EstimateGate';
import { useTimeTracking } from '../../hooks/useTimeTracking';

interface TaskDetailViewProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onSetEstimate: (id: string, estimate: number) => void;
  onAddSession: (id: string, session: TimeSession) => void;
  onBack: () => void;
}

export function TaskDetailView({
  task,
  onUpdateTask,
  onSetEstimate,
  onAddSession,
  onBack,
}: TaskDetailViewProps) {
  const [title, setTitle] = useState(task.title);

  const hasEstimate = task.estimate !== undefined;

  const handleSessionComplete = useCallback(
    (session: TimeSession) => {
      onAddSession(task.id, session);
    },
    [task.id, onAddSession]
  );

  const { elapsedMs, totalCompletedMs, isActive } = useTimeTracking({
    taskId: task.id,
    sessions: task.sessions ?? [],
    hasEstimate,
    onSessionComplete: handleSessionComplete,
  });

  const handleSetEstimate = useCallback(
    (minutes: number) => {
      onSetEstimate(task.id, minutes);
    },
    [task.id, onSetEstimate]
  );

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
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between mb-6">
        <BackButton onClick={onBack} />
        {hasEstimate && (
          <TimeDisplay
            elapsedMs={elapsedMs}
            totalCompletedMs={totalCompletedMs}
            estimateMinutes={task.estimate!}
            isActive={isActive}
          />
        )}
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

      {!hasEstimate && <EstimateGate onSubmit={handleSetEstimate} />}
    </div>
  );
}
