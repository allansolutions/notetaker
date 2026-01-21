import { useState, useEffect, useRef } from 'react';
import { TimeSession } from '../types';
import { parseTimeInput } from '../utils/time-parsing';

interface SessionsModalProps {
  sessions: TimeSession[];
  estimateMinutes: number;
  onUpdateSession: (sessionId: string, updates: Partial<TimeSession>) => void;
  onDeleteSession: (sessionId: string) => void;
  onAddSession: (session: TimeSession) => void;
  onUpdateEstimate: (estimate: number) => void;
  onClose: () => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function msToMinutes(ms: number): number {
  return Math.round(ms / 60000);
}

function minutesToMs(minutes: number): number {
  return minutes * 60000;
}

interface EditingState {
  sessionId: string;
  minutes: string;
}

function EditInput({
  value,
  onChange,
  onKeyDown,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <input
      ref={inputRef}
      type="number"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className="w-16 px-2 py-1 text-sm rounded bg-surface border border-border text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

const ESTIMATE_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
];

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function SessionsModal({
  sessions,
  estimateMinutes,
  onUpdateSession,
  onDeleteSession,
  onAddSession,
  onUpdateEstimate,
  onClose,
}: SessionsModalProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [estimateValue, setEstimateValue] = useState(String(estimateMinutes));
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newEntryValue, setNewEntryValue] = useState('');
  const [addEntryError, setAddEntryError] = useState(false);
  const estimateInputRef = useRef<HTMLInputElement>(null);
  const addEntryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingEstimate) {
      estimateInputRef.current?.focus();
      estimateInputRef.current?.select();
    }
  }, [editingEstimate]);

  useEffect(() => {
    if (isAddingEntry) {
      addEntryInputRef.current?.focus();
    }
  }, [isAddingEntry]);

  const handleAddEntrySave = () => {
    const trimmed = newEntryValue.trim();
    if (!trimmed) {
      setIsAddingEntry(false);
      setNewEntryValue('');
      setAddEntryError(false);
      return;
    }
    const minutes = parseTimeInput(trimmed);
    if (minutes === undefined) {
      setAddEntryError(true);
      return;
    }
    const endTime = Date.now();
    const startTime = endTime - minutesToMs(minutes);
    const session: TimeSession = {
      id: generateSessionId(),
      startTime,
      endTime,
    };
    onAddSession(session);
    setIsAddingEntry(false);
    setNewEntryValue('');
    setAddEntryError(false);
  };

  const handleAddEntryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddEntrySave();
    } else if (e.key === 'Escape') {
      setIsAddingEntry(false);
      setNewEntryValue('');
      setAddEntryError(false);
    }
  };

  const handleAddEntryChange = (value: string) => {
    setNewEntryValue(value);
    if (addEntryError) {
      setAddEntryError(false);
    }
  };

  const handleEstimateSave = () => {
    const newEstimate = parseInt(estimateValue, 10);
    if (!isNaN(newEstimate) && newEstimate > 0) {
      onUpdateEstimate(newEstimate);
    } else {
      setEstimateValue(String(estimateMinutes));
    }
    setEditingEstimate(false);
  };

  const handleEstimateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEstimateSave();
    } else if (e.key === 'Escape') {
      setEstimateValue(String(estimateMinutes));
      setEditingEstimate(false);
    }
  };

  const handlePresetClick = (minutes: number) => {
    onUpdateEstimate(minutes);
    setEstimateValue(String(minutes));
    setEditingEstimate(false);
  };

  const totalMs = sessions.reduce((sum, s) => {
    if (s.endTime) {
      return sum + (s.endTime - s.startTime);
    }
    return sum;
  }, 0);

  const handleEditStart = (session: TimeSession) => {
    if (!session.endTime) return;
    const duration = session.endTime - session.startTime;
    setEditing({
      sessionId: session.id,
      minutes: String(msToMinutes(duration)),
    });
  };

  const handleEditSave = (session: TimeSession) => {
    if (!editing || !session.endTime) return;
    const newMinutes = parseInt(editing.minutes, 10);
    if (isNaN(newMinutes) || newMinutes < 0) {
      setEditing(null);
      return;
    }
    const newDuration = minutesToMs(newMinutes);
    const newEndTime = session.startTime + newDuration;
    onUpdateSession(session.id, { endTime: newEndTime });
    setEditing(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, session: TimeSession) => {
    if (e.key === 'Enter') {
      handleEditSave(session);
    } else if (e.key === 'Escape') {
      setEditing(null);
    }
  };

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop button - closes modal when clicked */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />
      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sessions-modal-title"
        className="relative bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="sessions-modal-title"
            className="text-lg font-semibold text-primary"
          >
            Time Sessions
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

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {sessions.length === 0 && !isAddingEntry && (
              <p className="text-muted text-center py-8">
                No sessions recorded yet
              </p>
            )}
            {sessions.map((session) => {
              const isComplete = session.endTime !== undefined;
              // Only show duration for completed sessions
              const duration = isComplete
                ? session.endTime! - session.startTime
                : 0;
              const isEditing = editing?.sessionId === session.id;

              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-hover"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-small text-muted truncate">
                      {formatDate(session.startTime)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <EditInput
                        value={editing.minutes}
                        onChange={(value) =>
                          setEditing({ ...editing, minutes: value })
                        }
                        onKeyDown={(e) => handleKeyDown(e, session)}
                        onBlur={() => handleEditSave(session)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEditStart(session)}
                        disabled={!isComplete}
                        className={`px-2 py-1 text-sm rounded font-medium ${
                          isComplete
                            ? 'text-primary hover:bg-surface cursor-pointer'
                            : 'text-muted cursor-default'
                        }`}
                        title={isComplete ? 'Click to edit' : 'Active session'}
                      >
                        {isComplete ? formatDuration(duration) : 'Active'}
                        {!isComplete && (
                          <span className="ml-1 inline-block size-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                      </button>
                    )}

                    {isComplete && (
                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        className="p-1 text-muted hover:text-red-500 transition-colors"
                        title="Delete session"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Entry Form */}
            {isAddingEntry && (
              <div
                className={`flex items-center gap-3 p-3 rounded-md bg-hover border border-dashed ${addEntryError ? 'border-red-500' : 'border-border'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-small text-muted">Manual entry</div>
                  {addEntryError && (
                    <div className="text-xs text-red-500 mt-1">
                      Invalid format (e.g., 30, 1h, 1h 30m)
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={addEntryInputRef}
                    type="text"
                    placeholder="e.g., 30m"
                    value={newEntryValue}
                    onChange={(e) => handleAddEntryChange(e.target.value)}
                    onKeyDown={handleAddEntryKeyDown}
                    onBlur={handleAddEntrySave}
                    className={`w-20 px-2 py-1 text-sm rounded bg-surface border text-primary focus:outline-none focus:ring-2 ${addEntryError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-blue-500'}`}
                  />
                </div>
              </div>
            )}

            {/* Add Entry Button */}
            {!isAddingEntry && (
              <button
                type="button"
                onClick={() => setIsAddingEntry(true)}
                className="flex items-center gap-2 w-full p-3 rounded-md text-muted hover:bg-hover hover:text-primary transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M8 3v10M3 8h10" />
                </svg>
                <span className="text-sm">Add entry</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Total</span>
            <span className="text-primary font-medium">
              {formatDuration(totalMs)}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Estimate</span>
              {editingEstimate ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={estimateInputRef}
                    type="number"
                    min="1"
                    value={estimateValue}
                    onChange={(e) => setEstimateValue(e.target.value)}
                    onKeyDown={handleEstimateKeyDown}
                    onBlur={handleEstimateSave}
                    className="w-16 px-2 py-1 text-sm rounded bg-surface border border-border text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-muted">min</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingEstimate(true)}
                  className="text-sm text-primary font-medium hover:underline"
                  title="Click to edit estimate"
                >
                  {estimateMinutes}m
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {ESTIMATE_PRESETS.map(({ label, minutes }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handlePresetClick(minutes)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    estimateMinutes === minutes
                      ? 'bg-primary text-white'
                      : 'bg-hover text-primary hover:bg-primary/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
