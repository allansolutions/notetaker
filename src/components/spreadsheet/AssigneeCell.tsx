import { useState, useRef, useEffect } from 'react';
import type { TaskUser } from '@/modules/tasks/types';
import { useTeam } from '@/modules/teams/context/TeamContext';

interface AssigneeCellProps {
  value?: string | null;
  assignee?: TaskUser | null;
  onChange: (userId: string | null) => void;
}

export function AssigneeCell({ value, assignee, onChange }: AssigneeCellProps) {
  const { members } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const displayName = assignee
    ? assignee.name || assignee.email.split('@')[0]
    : null;

  const handleSelect = (userId: string | null) => {
    onChange(userId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-hover transition-colors w-full text-left"
      >
        {assignee ? (
          <>
            {assignee.avatarUrl ? (
              <img
                src={assignee.avatarUrl}
                alt=""
                className="w-5 h-5 rounded-full shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-primary shrink-0">
                {displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="truncate text-sm">{displayName}</span>
          </>
        ) : (
          <span className="text-muted text-sm">-</span>
        )}
      </button>

      {isOpen && members.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] bg-surface border border-border rounded-md shadow-lg py-1">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-hover transition-colors ${
              !value ? 'bg-hover' : ''
            }`}
          >
            <span className="text-muted">Unassigned</span>
          </button>
          {members.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => handleSelect(member.userId)}
              className={`w-full px-3 py-2 text-left hover:bg-hover transition-colors flex items-center gap-2 ${
                value === member.userId ? 'bg-hover' : ''
              }`}
            >
              {member.user.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-primary">
                  {(member.user.name || member.user.email)[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm">
                {member.user.name || member.user.email}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
