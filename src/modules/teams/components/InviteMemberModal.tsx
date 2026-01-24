import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { useTeam } from '../context/TeamContext';

interface InviteMemberModalProps {
  onClose: () => void;
}

export function InviteMemberModal({ onClose }: InviteMemberModalProps) {
  const { inviteMember, activeTeam } = useTeam();
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Close dialog on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const invite = await inviteMember(email.trim());
      if (invite) {
        const link = `${window.location.origin}/invite/${invite.token}`;
        setInviteLink(link);
      } else {
        setError('Failed to create invite');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
        aria-labelledby="invite-modal-title"
        className="relative bg-surface rounded-lg shadow-xl max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="invite-modal-title"
            className="text-lg font-semibold text-primary"
          >
            Invite to {activeTeam?.name}
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
          {!inviteLink ? (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="invite-email" className="text-sm text-muted">
                  Email Address
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmitting) {
                      handleSubmit();
                    }
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <p className="text-xs text-muted">
                An invite link will be generated. Share it with your team member
                to grant them access.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-primary">
                Invite link created. Share this link with{' '}
                <span className="font-medium">{email}</span>:
              </p>

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="flex-1 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 rounded bg-surface-alt hover:bg-accent-subtle transition-colors"
                  title={copied ? 'Copied!' : 'Copy link'}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted" />
                  )}
                </button>
              </div>

              <p className="text-xs text-muted">
                This link expires in 7 days and can only be used once.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          {!inviteLink ? (
            <>
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
                disabled={!email.trim() || isSubmitting}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Invite'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
