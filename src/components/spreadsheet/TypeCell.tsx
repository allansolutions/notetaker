import { TaskType, TASK_TYPE_OPTIONS } from '../../types';

interface TypeCellProps {
  value: TaskType;
  onChange: (value: TaskType) => void;
}

export function TypeCell({ value, onChange }: TypeCellProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TaskType)}
      className="w-full bg-transparent text-small text-primary border-none outline-none cursor-pointer appearance-none hover:bg-hover rounded px-2 py-1"
    >
      {TASK_TYPE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
