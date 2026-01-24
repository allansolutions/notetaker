import { ChevronRight, Home } from 'lucide-react';
import type { WikiBreadcrumb } from '../types';

interface WikiBreadcrumbsProps {
  ancestors: WikiBreadcrumb[];
  currentPage: { title: string; icon: string | null } | null;
  onNavigate: (id: string) => void;
  onNavigateHome: () => void;
}

export function WikiBreadcrumbs({
  ancestors,
  currentPage,
  onNavigate,
  onNavigateHome,
}: WikiBreadcrumbsProps): JSX.Element {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {/* Home/Wiki root */}
      <button
        type="button"
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-primary"
        onClick={onNavigateHome}
      >
        <Home className="w-3.5 h-3.5" />
        <span>Wiki</span>
      </button>

      {/* Ancestor pages */}
      {ancestors.map((ancestor) => (
        <div key={ancestor.id} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          <button
            type="button"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted hover:text-primary max-w-[150px] truncate"
            onClick={() => onNavigate(ancestor.id)}
          >
            {ancestor.icon && <span className="shrink-0">{ancestor.icon}</span>}
            <span className="truncate">{ancestor.title || 'Untitled'}</span>
          </button>
        </div>
      ))}

      {/* Current page (not clickable) */}
      {currentPage && (
        <div className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          <span className="flex items-center gap-1 px-1.5 py-0.5 text-primary max-w-[200px] truncate">
            {currentPage.icon && (
              <span className="shrink-0">{currentPage.icon}</span>
            )}
            <span className="truncate">{currentPage.title || 'Untitled'}</span>
          </span>
        </div>
      )}
    </nav>
  );
}
