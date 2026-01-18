import { Block } from '../types';

interface OutlineProps {
  blocks: Block[];
  onNavigate: (id: string) => void;
  collapsedBlockIds: Set<string>;
  onToggleCollapse: (id: string) => void;
}

export function Outline({ blocks, onNavigate, collapsedBlockIds, onToggleCollapse }: OutlineProps) {
  const h1Blocks = blocks.filter(block => block.type === 'h1');

  return (
    <div className="outline">
      <div className="outline-header">Outline</div>
      <div className="outline-content">
        {h1Blocks.length === 0 ? (
          <div className="outline-empty">No headings</div>
        ) : (
          h1Blocks.map(block => {
            const isCollapsed = collapsedBlockIds.has(block.id);
            return (
              <div
                key={block.id}
                className={`outline-item outline-h1${isCollapsed ? ' outline-item-collapsed' : ''}`}
              >
                <button
                  className={`outline-collapse-toggle${isCollapsed ? ' collapsed' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse(block.id);
                  }}
                  title={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M4 2l4 4-4 4V2z" />
                  </svg>
                </button>
                <span
                  className="outline-item-text"
                  onClick={() => onNavigate(block.id)}
                >
                  {block.content || 'Untitled'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
