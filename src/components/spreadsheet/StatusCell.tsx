import { TaskStatus, TASK_STATUS_OPTIONS } from '../../types';

interface StatusCellProps {
  value: TaskStatus;
  onChange: (value: TaskStatus) => void;
}

export function StatusCell({ value, onChange }: StatusCellProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      className="w-full bg-transparent text-small text-primary border-none outline-none cursor-pointer appearance-none hover:bg-hover rounded px-2 py-1"
    >
      {TASK_STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
