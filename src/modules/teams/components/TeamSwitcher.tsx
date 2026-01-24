import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Settings } from 'lucide-react';
import { useTeam } from '../context/TeamContext';

interface TeamSwitcherProps {
  onOpenSettings?: () => void;
}

export function TeamSwitcher({ onOpenSettings }: TeamSwitcherProps) {
  const { teams, activeTeam, setActiveTeam, createTeam, userRole } = useTeam();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleValueChange = (value: string) => {
    if (value === '_create') {
      setIsCreateOpen(true);
      return;
    }
    if (value === '_settings') {
      onOpenSettings?.();
      return;
    }
    setActiveTeam(value);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setIsCreating(true);
    try {
      await createTeam(newTeamName.trim());
      setNewTeamName('');
      setIsCreateOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  // Close dialog on escape
  useEffect(() => {
    if (!isCreateOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateOpen(false);
        setNewTeamName('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCreateOpen]);

  // Shared modal component rendered in both cases
  const createModal = isCreateOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default"
        onClick={() => {
          setIsCreateOpen(false);
          setNewTeamName('');
        }}
        aria-label="Close modal"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-team-modal-title"
        className="relative bg-surface rounded-lg shadow-xl max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="create-team-modal-title"
            className="text-lg font-semibold text-primary"
          >
            Create New Team
          </h2>
          <button
            type="button"
            onClick={() => {
              setIsCreateOpen(false);
              setNewTeamName('');
            }}
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
          <div className="flex flex-col gap-2">
            <label htmlFor="team-name" className="text-sm text-muted">
              Team Name
            </label>
            <Input
              id="team-name"
              placeholder="e.g., Marketing Team"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) {
                  handleCreateTeam();
                }
              }}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={() => {
              setIsCreateOpen(false);
              setNewTeamName('');
            }}
            className="px-4 py-2 text-sm text-muted hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateTeam}
            disabled={!newTeamName.trim() || isCreating}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  );

  // Show create team button when no teams exist
  if (teams.length === 0 && !activeTeam) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="bg-surface border-border"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Team
        </Button>
        {createModal}
      </>
    );
  }

  return (
    <>
      <Select value={activeTeam?.id ?? ''} onValueChange={handleValueChange}>
        <SelectTrigger
          size="sm"
          className="bg-surface border-border min-w-[140px]"
          data-testid="team-switcher"
        >
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
          <SelectItem value="_create" className="text-muted-foreground">
            <span className="flex items-center gap-1">
              <Plus className="w-3 h-3" />
              New Team
            </span>
          </SelectItem>
          {userRole === 'admin' && onOpenSettings && (
            <SelectItem value="_settings" className="text-muted-foreground">
              <span className="flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Team Settings
              </span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {createModal}
    </>
  );
}
