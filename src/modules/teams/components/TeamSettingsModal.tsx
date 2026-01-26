import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { UserMinus } from 'lucide-react';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '@/context/AuthContext';
import { InviteMemberModal } from './InviteMemberModal';

interface TeamSettingsModalProps {
  onClose: () => void;
}

export function TeamSettingsModal({ onClose }: TeamSettingsModalProps) {
  const { user } = useAuth();
  const {
    activeTeam,
    members,
    updateTeam,
    deleteTeam,
    removeMember,
    userRole,
  } = useTeam();
  const [teamName, setTeamName] = useState(activeTeam?.name ?? '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close dialog on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showInviteModal && !showDeleteConfirm) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showInviteModal, showDeleteConfirm]);

  const handleUpdateName = async () => {
    if (!activeTeam || !teamName.trim() || teamName === activeTeam.name) return;

    setIsUpdating(true);
    setError(null);

    try {
      await updateTeam(activeTeam.id, teamName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!activeTeam) return;

    setIsDeleting(true);
    try {
      await deleteTeam(activeTeam.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  if (!activeTeam || userRole !== 'admin') return null;

  const admins = members.filter((m) => m.role === 'admin');
  const canRemoveAdmin = admins.length > 1;

  return (
    <>
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
          aria-labelledby="team-settings-title"
          className="relative bg-surface rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2
              id="team-settings-title"
              className="text-lg font-semibold text-primary"
            >
              Team Settings
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

          <div className="p-4 space-y-6 overflow-y-auto flex-1">
            {/* Team Name */}
            <div className="space-y-2">
              <label
                htmlFor="team-name"
                className="text-sm font-medium text-primary"
              >
                Team Name
              </label>
              <div className="flex gap-2">
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateName();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleUpdateName}
                  disabled={
                    isUpdating ||
                    !teamName.trim() ||
                    teamName === activeTeam.name
                  }
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-primary">Members</h3>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
                >
                  + Invite
                </button>
              </div>

              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded bg-surface-alt"
                  >
                    <div className="flex items-center gap-3">
                      {member.user.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm text-primary">
                          {(member.user.name ||
                            member.user.email)[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-primary">
                          {member.user.name || member.user.email}
                        </div>
                        {member.user.name && (
                          <div className="text-xs text-muted">
                            {member.user.email}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          member.role === 'admin'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {member.role}
                      </span>

                      {member.userId !== user?.id &&
                        (member.role !== 'admin' || canRemoveAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1 text-muted hover:text-red-500 transition-colors"
                            title="Remove member"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Danger Zone */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-red-500">Danger Zone</h3>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm text-red-500 border border-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete Team
                </button>
              ) : (
                <div className="p-3 rounded border border-red-500 bg-red-50 dark:bg-red-900/20 space-y-3">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Are you sure you want to delete this team? All team tasks
                    will be permanently deleted. This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-sm text-muted hover:text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Team'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end p-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-primary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <InviteMemberModal onClose={() => setShowInviteModal(false)} />
      )}
    </>
  );
}
