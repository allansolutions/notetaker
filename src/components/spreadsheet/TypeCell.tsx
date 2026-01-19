import { TaskType, TASK_TYPE_OPTIONS, TASK_TYPE_COLORS } from '../../types';

interface TypeCellProps {
  value: TaskType;
  onChange: (value: TaskType) => void;
}

export function TypeCell({ value, onChange }: TypeCellProps) {
  const colors = TASK_TYPE_COLORS[value];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TaskType)}
      className={`w-full border-none outline-none cursor-pointer appearance-none rounded px-2 py-1 text-small font-medium ${colors.bg} ${colors.text}`}
    >
      {TASK_TYPE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
