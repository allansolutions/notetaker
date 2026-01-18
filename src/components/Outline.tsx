import { Block } from '../types';

interface OutlineProps {
  blocks: Block[];
  onNavigate: (id: string) => void;
}

export function Outline({ blocks, onNavigate }: OutlineProps) {
  const h1Blocks = blocks.filter(block => block.type === 'h1');

  return (
    <div className="outline">
      <div className="outline-header">Outline</div>
      <div className="outline-content">
        {h1Blocks.length === 0 ? (
          <div className="outline-empty">No headings</div>
        ) : (
          h1Blocks.map(block => (
            <div
              key={block.id}
              className="outline-item outline-h1"
              onClick={() => onNavigate(block.id)}
            >
              {block.content || 'Untitled'}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
