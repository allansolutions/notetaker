import { TaskImportance, TASK_IMPORTANCE_OPTIONS } from '../../types';
import { SelectCell } from './SelectCell';

interface ImportanceCellProps {
  value: TaskImportance | undefined;
  onChange: (value: TaskImportance) => void;
}

export function ImportanceCell({ value, onChange }: ImportanceCellProps) {
  return (
    <SelectCell
      value={value ?? ''}
      onChange={onChange}
      options={TASK_IMPORTANCE_OPTIONS}
      placeholder="Set..."
    />
  );
}
