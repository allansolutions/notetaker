import { useState, useEffect, useRef } from 'react';

interface BlockedReasonModalProps {
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}

export function BlockedReasonModal({
  onSubmit,
  onCancel,
}: BlockedReasonModalProps) {
  const [reason, setReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isValid = reason.trim().length > 0;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(reason.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && isValid) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default"
        onClick={onCancel}
        aria-label="Close modal"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-reason-modal-title"
        className="relative bg-surface rounded-lg shadow-xl max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="blocked-reason-modal-title"
            className="text-lg font-semibold text-primary"
          >
            Why is this task blocked?
          </h2>
          <button
            type="button"
            onClick={onCancel}
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

        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter the reason this task is blocked..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded bg-surface border border-border text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="px-4 py-2 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Set as Blocked
          </button>
        </div>
      </div>
    </div>
  );
}
