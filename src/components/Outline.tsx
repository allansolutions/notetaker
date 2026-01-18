import { Block } from '../types';

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
    <div className="outline">
      <div className="outline-header">Outline</div>
      <div className="outline-content">
        {h1Blocks.length === 0 ? (
          <div className="outline-empty">No headings</div>
        ) : (
          h1Blocks.map(block => {
            const isVisible = !hiddenBlockIds.has(block.id);
            return (
              <div
                key={block.id}
                className={`outline-item outline-h1${isVisible ? '' : ' outline-item-hidden'}`}
              >
                <span
                  className="outline-item-text"
                  onClick={() => onNavigate(block.id)}
                >
                  {block.content || 'Untitled'}
                </span>
                <button
                  className="outline-visibility-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(block.id);
                  }}
                  title={isVisible ? 'Hide block' : 'Show block'}
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
