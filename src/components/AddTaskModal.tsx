import { useState, useEffect, useRef } from 'react';
import { useMemo } from 'react';
import {
  TaskType,
  TaskStatus,
  TaskImportance,
  TASK_TYPE_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_IMPORTANCE_OPTIONS,
} from '../types';
import { DatePickerModal } from './DatePickerModal';
import { KeyboardSelect } from './KeyboardSelect';
import { parseTimeInput } from '../utils/time-parsing';
import { formatMinutes } from '../utils/task-operations';
import { CalendarIcon } from './icons';

export interface AddTaskData {
  title: string;
  type: TaskType;
  status: TaskStatus;
  importance: TaskImportance;
  estimate: number;
  dueDate?: number;
}

interface AddTaskModalProps {
  onSubmit: (data: AddTaskData) => void;
  onClose: () => void;
}

function getTodayNoon(): number {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today.getTime();
}

export function AddTaskModal({ onSubmit, onClose }: AddTaskModalProps) {
  const [type, setType] = useState<TaskType | ''>('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [importance, setImportance] = useState<TaskImportance | ''>('');
  const [estimateInput, setEstimateInput] = useState('');
  const [estimate, setEstimate] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<number | undefined>(getTodayNoon());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Refs for focus management
  const typeRef = useRef<HTMLButtonElement>(null!);
  const titleRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLButtonElement>(null!);
  const importanceRef = useRef<HTMLButtonElement>(null!);
  const estimateRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLButtonElement>(null);

  // Filter out 'blocked' status - it only makes sense for existing tasks
  const addTaskStatusOptions = useMemo(
    () => TASK_STATUS_OPTIONS.filter((opt) => opt.value !== 'blocked'),
    []
  );

  const isValid =
    type !== '' &&
    title.trim() !== '' &&
    importance !== '' &&
    estimate !== null;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      title: title.trim(),
      type: type as TaskType,
      status,
      importance: importance as TaskImportance,
      estimate: estimate as number,
      dueDate,
    });
  };

  const handleEstimateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9hHmM\s]/g, '').toLowerCase();
    setEstimateInput(val);
    const parsed = parseTimeInput(val);
    setEstimate(parsed ?? null);
  };

  const handleEstimateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dateRef.current?.focus();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      statusRef.current?.focus();
    }
  };

  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showDatePicker) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onClose, showDatePicker]);

  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'Select date...';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-modal-title"
        className="relative bg-surface rounded-lg shadow-xl max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="add-task-modal-title"
            className="text-lg font-semibold text-primary"
          >
            Add Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type */}
          <div className="flex items-center gap-4">
            <span
              id="add-task-type-label"
              className="text-sm text-muted w-24 shrink-0"
            >
              Type
            </span>
            <KeyboardSelect
              value={type}
              onChange={setType}
              onAdvance={() => titleRef.current?.focus()}
              options={TASK_TYPE_OPTIONS}
              placeholder="Select type..."
              autoOpen
              triggerRef={typeRef}
              id="add-task-type"
              aria-labelledby="add-task-type-label"
            />
          </div>

          {/* Task (Title) */}
          <div className="flex items-center gap-4">
            <label
              htmlFor="add-task-title"
              className="text-sm text-muted w-24 shrink-0"
            >
              Task
            </label>
            <input
              id="add-task-title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              placeholder="Enter task title..."
              className="flex-1 px-3 py-2 text-sm rounded bg-surface border border-border text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <span
              id="add-task-status-label"
              className="text-sm text-muted w-24 shrink-0"
            >
              Status
            </span>
            <KeyboardSelect
              value={status}
              onChange={setStatus}
              onAdvance={() => importanceRef.current?.focus()}
              options={addTaskStatusOptions}
              placeholder="Select status..."
              triggerRef={statusRef}
              id="add-task-status"
              aria-labelledby="add-task-status-label"
            />
          </div>

          {/* Importance */}
          <div className="flex items-center gap-4">
            <span
              id="add-task-importance-label"
              className="text-sm text-muted w-24 shrink-0"
            >
              Importance
            </span>
            <KeyboardSelect
              value={importance}
              onChange={setImportance}
              onAdvance={() => estimateRef.current?.focus()}
              options={TASK_IMPORTANCE_OPTIONS}
              placeholder="Select importance..."
              triggerRef={importanceRef}
              id="add-task-importance"
              aria-labelledby="add-task-importance-label"
            />
          </div>

          {/* Estimate */}
          <div className="flex items-center gap-4">
            <label
              htmlFor="add-task-estimate"
              className="text-sm text-muted w-24 shrink-0"
            >
              Estimate
            </label>
            <div className="flex-1 flex items-center gap-2">
              <input
                id="add-task-estimate"
                ref={estimateRef}
                type="text"
                value={estimateInput}
                onChange={handleEstimateChange}
                onKeyDown={handleEstimateKeyDown}
                placeholder="e.g., 30m, 1h 30m"
                className="flex-1 px-3 py-2 text-sm rounded bg-surface border border-border text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {estimate !== null && (
                <span className="text-sm text-muted whitespace-nowrap">
                  = {formatMinutes(estimate)}
                </span>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-4">
            <span
              id="add-task-date-label"
              className="text-sm text-muted w-24 shrink-0"
            >
              Date
            </span>
            <button
              ref={dateRef}
              type="button"
              onClick={() => setShowDatePicker(true)}
              onKeyDown={handleDateKeyDown}
              aria-labelledby="add-task-date-label"
              className="flex-1 flex items-center justify-between px-3 py-2 text-sm rounded bg-surface border border-border text-left hover:border-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className={dueDate ? 'text-primary' : 'text-muted'}>
                {formatDate(dueDate)}
              </span>
              <span className="text-muted">
                <CalendarIcon />
              </span>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create
          </button>
        </div>
      </div>

      {showDatePicker && (
        <DatePickerModal
          value={dueDate}
          onChange={(date) => {
            setDueDate(date);
            setShowDatePicker(false);
          }}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
}
