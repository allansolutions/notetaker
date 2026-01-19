interface TitleCellProps {
  value: string;
  onClick: () => void;
}

export function TitleCell({ value, onClick }: TitleCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-transparent border-none cursor-pointer text-small text-primary hover:text-accent-fg hover:underline truncate px-2 py-1"
    >
      {value || 'Untitled'}
    </button>
  );
}
