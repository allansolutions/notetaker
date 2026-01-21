import { useState, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Task, Block, TimeSession } from '../../types';
import { Editor, createBlock } from '../Editor';
import { BackButton } from '../BackButton';
import { TimeDisplay } from '../TimeDisplay';
import { SessionsModal } from '../SessionsModal';
import { useTimeTracking } from '../../hooks/useTimeTracking';

interface TaskDetailViewProps {
  task: Task;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddSession: (id: string, session: TimeSession) => void;
  onUpdateSession: (
    taskId: string,
    sessionId: string,
    updates: Partial<TimeSession>
  ) => void;
  onDeleteSession: (taskId: string, sessionId: string) => void;
  onBack: () => void;
}

export function TaskDetailView({
  task,
  onUpdateTask,
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onBack,
}: TaskDetailViewProps) {
  const [title, setTitle] = useState(task.title);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(
    new Set()
  );
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize title textarea
  useLayoutEffect(() => {
    const textarea = titleRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [title]);

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const hasEstimate = task.estimate != null && task.estimate > 0;
  const estimateMinutes = hasEstimate ? task.estimate! : 0;

  const handleSessionComplete = useCallback(
    (session: TimeSession) => {
      onAddSession(task.id, session);
    },
    [task.id, onAddSession]
  );

  const { elapsedMs, totalCompletedMs, isActive } = useTimeTracking({
    taskId: task.id,
    sessions: task.sessions ?? [],
    hasEstimate: true, // Always track time
    onSessionComplete: handleSessionComplete,
  });

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
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

  const handleUpdateSession = useCallback(
    (sessionId: string, updates: Partial<TimeSession>) => {
      onUpdateSession(task.id, sessionId, updates);
    },
    [task.id, onUpdateSession]
  );

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      onDeleteSession(task.id, sessionId);
    },
    [task.id, onDeleteSession]
  );

  const handleUpdateEstimate = useCallback(
    (estimate: number) => {
      onUpdateTask(task.id, { estimate });
    },
    [task.id, onUpdateTask]
  );

  const handleAddManualSession = useCallback(
    (session: TimeSession) => {
      onAddSession(task.id, session);
    },
    [task.id, onAddSession]
  );

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between mb-6">
        <BackButton onClick={onBack} />
        <TimeDisplay
          elapsedMs={elapsedMs}
          totalCompletedMs={totalCompletedMs}
          estimateMinutes={estimateMinutes}
          isActive={isActive}
          onClick={() => setShowSessionsModal(true)}
        />
      </div>

      <textarea
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={handleTitleKeyDown}
        placeholder="Task title"
        rows={1}
        className="text-2xl font-bold text-primary bg-transparent border-none outline-none mb-6 w-full resize-none overflow-hidden"
      />

      <div className="flex-1">
        <Editor
          blocks={blocks}
          setBlocks={setBlocks}
          collapsedBlockIds={collapsedBlockIds}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {showSessionsModal && hasEstimate && (
        <SessionsModal
          sessions={task.sessions ?? []}
          estimateMinutes={task.estimate!}
          onUpdateSession={handleUpdateSession}
          onDeleteSession={handleDeleteSession}
          onAddSession={handleAddManualSession}
          onUpdateEstimate={handleUpdateEstimate}
          onClose={() => setShowSessionsModal(false)}
        />
      )}
    </div>
  );
}
