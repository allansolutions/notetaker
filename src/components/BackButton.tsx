import { ChevronLeftIcon } from './icons';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export function BackButton({ onClick, label = 'Back' }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-small text-muted hover:text-primary flex items-center gap-1"
    >
      <ChevronLeftIcon />
      {label}
    </button>
  );
}
