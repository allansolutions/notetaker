interface TimeDisplayProps {
  elapsedMs: number;
  totalCompletedMs: number;
  estimateMinutes: number;
  isActive: boolean;
  onClick?: () => void;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatEstimate(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function TimeDisplay({
  elapsedMs,
  totalCompletedMs,
  estimateMinutes,
  isActive,
  onClick,
}: TimeDisplayProps) {
  const totalMs = totalCompletedMs + elapsedMs;
  const estimateMs = estimateMinutes * 60000;
  const isOverEstimate = totalMs > estimateMs;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-hover transition-colors"
    >
      <span
        className={`text-small font-medium ${isOverEstimate ? 'text-red-500' : 'text-muted'}`}
      >
        {formatDuration(totalMs)} / {formatEstimate(estimateMinutes)}
      </span>
      {isActive && (
        <span
          className="size-2 rounded-full bg-green-500 animate-pulse"
          title="Timer active"
        />
      )}
    </button>
  );
}
