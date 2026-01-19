import { TaskStatus, TASK_STATUS_OPTIONS } from '../../types';
import { SelectCell } from './SelectCell';

interface StatusCellProps {
  value: TaskStatus;
  onChange: (value: TaskStatus) => void;
}

export function StatusCell({ value, onChange }: StatusCellProps) {
  return (
    <SelectCell
      value={value}
      onChange={onChange}
      options={TASK_STATUS_OPTIONS}
    />
  );
}
