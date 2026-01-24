import type { TaskUser } from '@/modules/tasks/types';

interface AssigneeCellProps {
  assignee?: TaskUser | null;
}

export function AssigneeCell({ assignee }: AssigneeCellProps) {
  if (!assignee) {
    return <span className="text-muted">-</span>;
  }

  const displayName = assignee.name || assignee.email.split('@')[0];

  return (
    <div className="flex items-center gap-2">
      {assignee.avatarUrl ? (
        <img
          src={assignee.avatarUrl}
          alt=""
          className="w-5 h-5 rounded-full shrink-0"
        />
      ) : (
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-primary shrink-0">
          {displayName[0].toUpperCase()}
        </div>
      )}
      <span className="truncate text-sm">{displayName}</span>
    </div>
  );
}
