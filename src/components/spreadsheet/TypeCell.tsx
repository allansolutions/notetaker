import { TaskType, TASK_TYPE_OPTIONS } from '../../types';
import { SelectCell } from './SelectCell';

interface TypeCellProps {
  value: TaskType;
  onChange: (value: TaskType) => void;
}

export function TypeCell({ value, onChange }: TypeCellProps) {
  return (
    <SelectCell value={value} onChange={onChange} options={TASK_TYPE_OPTIONS} />
  );
}
