import { useState, useEffect } from 'react';
import {
  TaskType,
  TaskStatus,
  TaskImportance,
  TASK_TYPE_OPTIONS,
  TASK_STATUS_OPTIONS,
  TASK_IMPORTANCE_OPTIONS,
} from '../types';
import { DatePickerModal } from './DatePickerModal';

export interface AddTaskData {
  title: string;
  type: TaskType;
  status: TaskStatus;
  importance: TaskImportance;
  estimate: number;
  dueDate?: number;
}

const ESTIMATE_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
];

interface AddTaskModalProps {
  onSubmit: (data: AddTaskData) => void;
  onClose: () => void;
}

export function AddTaskModal({ onSubmit, onClose }: AddTaskModalProps) {
  const [type, setType] = useState<TaskType | ''>('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [importance, setImportance] = useState<TaskImportance | ''>('');
  const [estimate, setEstimate] = useState<number | null>(null);
  const [customEstimate, setCustomEstimate] = useState('');
  const [dueDate, setDueDate] = useState<number | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const handleCustomEstimateSubmit = () => {
    const minutes = parseInt(customEstimate, 10);
    if (!isNaN(minutes) && minutes > 0) {
      setEstimate(minutes);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
            <label
              htmlFor="add-task-type"
              className="text-sm text-muted w-24 shrink-0"
            >
              Type
            </label>
            <select
              id="add-task-type"
              value={type}
              onChange={(e) => setType(e.target.value as TaskType | '')}
              className="flex-1 px-3 py-2 text-sm rounded bg-surface border border-border text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>
                Select type...
              </option>
              {TASK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
              ref={(el) => el?.focus()}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter task title..."
              className="flex-1 px-3 py-2 text-sm rounded bg-surface border border-border text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <label
              htmlFor="add-task-status"
              className="text-sm text-muted w-24 shrink-0"
            >
              Status
            </label>
            <select
              id="add-task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="flex-1 px-3 py-2 text-sm rounded bg-surface border border-border text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TASK_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Importance */}
          <div className="flex items-center gap-4">
            <label
              htmlFor="add-task-importance"
              className="text-sm text-muted w-24 shrink-0"
            >
              Importance
            </label>
            <select
              id="add-task-importance"
              value={importance}
              onChange={(e) =>
                setImportance(e.target.value as TaskImportance | '')
              }
              className="flex-1 px-3 py-2 text-sm rounded bg-surface border border-border text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>
                Select importance...
              </option>
              {TASK_IMPORTANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estimate */}
          <div className="flex items-start gap-4">
            <span className="text-sm text-muted w-24 shrink-0 pt-2">
              Estimate
            </span>
            <div className="flex-1">
              <div className="flex gap-2 flex-wrap mb-2">
                {ESTIMATE_PRESETS.map(({ label, minutes }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setEstimate(minutes);
                      setCustomEstimate('');
                    }}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      estimate === minutes
                        ? 'bg-blue-500 text-white'
                        : 'bg-hover text-primary hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="1"
                  placeholder="Custom (min)"
                  value={customEstimate}
                  onChange={(e) => {
                    setCustomEstimate(e.target.value);
                    // Clear preset selection when typing custom
                    const parsed = parseInt(e.target.value, 10);
                    if (!isNaN(parsed) && parsed > 0) {
                      setEstimate(parsed);
                    } else {
                      setEstimate(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCustomEstimateSubmit();
                    }
                  }}
                  className="w-28 px-3 py-1.5 text-sm rounded bg-surface border border-border text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-muted">minutes</span>
              </div>
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
              type="button"
              onClick={() => setShowDatePicker(true)}
              aria-labelledby="add-task-date-label"
              className="flex-1 px-3 py-2 text-sm rounded bg-surface border border-border text-left hover:border-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className={dueDate ? 'text-primary' : 'text-muted'}>
                {formatDate(dueDate)}
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
