import { useState, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import {
  Task,
  Block,
  TimeSession,
  TaskType,
  TASK_TYPE_OPTIONS,
  TASK_TYPE_COLORS,
} from '../../types';
import { Editor, createBlock } from '../Editor';
import { BackButton } from '../BackButton';
import { TimeDisplay } from '../TimeDisplay';
import { SessionsModal } from '../SessionsModal';
import { useTimeTracking } from '../../hooks/useTimeTracking';
import { useAuth } from '../../context/AuthContext';

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
  const { user } = useAuth();
  const [title, setTitle] = useState(task.title);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(
    new Set()
  );
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Determine if current user should auto-track time
  // - Team tasks: only the assignee auto-tracks
  // - Personal tasks (no team): only the creator (assigner) auto-tracks
  const shouldAutoTrack = useMemo(() => {
    if (!user) return false;
    if (task.teamId) {
      // Team task: only assignee auto-tracks
      return task.assigneeId === user.id;
    }
    // Personal task: only creator auto-tracks
    return task.assigner?.id === user.id;
  }, [user, task.teamId, task.assigneeId, task.assigner?.id]);

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
    hasEstimate: shouldAutoTrack, // Only auto-track if user is assignee/owner
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

      <div className="mb-2">
        <select
          value={task.type}
          onChange={(e) =>
            onUpdateTask(task.id, { type: e.target.value as TaskType })
          }
          className={`border-none outline-none cursor-pointer appearance-none rounded px-2 py-1 text-sm font-medium ${TASK_TYPE_COLORS[task.type].bg} ${TASK_TYPE_COLORS[task.type].text}`}
        >
          {TASK_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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

      {task.status === 'blocked' && task.blockedReason && (
        <div className="mb-6 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Blocked
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-300">
                {task.blockedReason}
              </div>
            </div>
          </div>
        </div>
      )}

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
