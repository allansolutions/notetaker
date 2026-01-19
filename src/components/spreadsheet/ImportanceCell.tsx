import { TaskImportance, TASK_IMPORTANCE_OPTIONS } from '../../types';

interface ImportanceCellProps {
  value: TaskImportance;
  onChange: (value: TaskImportance) => void;
}

export function ImportanceCell({ value, onChange }: ImportanceCellProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TaskImportance)}
      className="w-full bg-transparent text-small text-primary border-none outline-none cursor-pointer appearance-none hover:bg-hover rounded px-2 py-1"
    >
      {TASK_IMPORTANCE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
