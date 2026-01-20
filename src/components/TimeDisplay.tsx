interface TimeDisplayProps {
  elapsedMs: number;
  totalCompletedMs: number;
  estimateMinutes: number;
  isActive: boolean;
  onClick?: () => void;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDuration(ms: number): string {
  return formatMinutes(Math.floor(ms / 60000));
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
  const percentage = Math.round((totalMs / estimateMs) * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-hover transition-colors"
    >
      <span
        className={`text-small font-medium ${isOverEstimate ? 'text-red-500' : 'text-muted'}`}
      >
        {formatDuration(totalMs)} / {formatMinutes(estimateMinutes)} (
        {percentage}%)
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
