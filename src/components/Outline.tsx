import { Block } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface OutlineProps {
  blocks: Block[];
  onNavigate: (id: string) => void;
  hiddenBlockIds: Set<string>;
  onToggleVisibility: (id: string) => void;
}

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function Outline({ blocks, onNavigate, hiddenBlockIds, onToggleVisibility }: OutlineProps) {
  const h1Blocks = blocks.filter(block => block.type === 'h1');

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-muted uppercase tracking-wider">Outline</div>
        <ThemeToggle />
      </div>
      <div className="flex flex-col gap-1">
        {h1Blocks.length === 0 ? (
          <div className="text-small text-muted italic">No headings</div>
        ) : (
          h1Blocks.map(block => {
            const isVisible = !hiddenBlockIds.has(block.id);
            return (
              <div
                key={block.id}
                className={`group flex items-center gap-1 text-small text-primary py-1 px-2 rounded-md hover:bg-hover font-medium${isVisible ? '' : ' opacity-50'}`}
              >
                <span
                  className="flex-1 truncate cursor-pointer"
                  onClick={() => onNavigate(block.id)}
                >
                  {block.content || 'Untitled'}
                </span>
                <button
                  className={`shrink-0 size-6 flex items-center justify-center text-muted rounded-md hover:bg-hover hover:text-primary transition-opacity duration-normal${isVisible ? ' opacity-0 group-hover:opacity-100' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(block.id);
                  }}
                  title={isVisible ? 'Hide section' : 'Show section'}
                >
                  <EyeIcon visible={isVisible} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
