interface SelectCellProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}

export function SelectCell<T extends string>({
  value,
  onChange,
  options,
}: SelectCellProps<T>): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full bg-transparent text-small text-primary border-none outline-none cursor-pointer appearance-none hover:bg-hover rounded px-2 py-1"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
