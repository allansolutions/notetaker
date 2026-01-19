import { Task, Block, BlockType } from '../../types';
import { BackButton } from '../BackButton';
import { blockTypeClasses } from '../../utils/block-styles';

interface FullDayNotesViewProps {
  tasks: Task[];
  onSelectTask: (id: string) => void;
  onBack: () => void;
}

function getPrefix(type: BlockType, index: number): string {
  switch (type) {
    case 'bullet':
      return '\u2022';
    case 'numbered':
      return `${index + 1}.`;
    case 'todo':
      return '\u2610';
    case 'todo-checked':
      return '\u2611';
    default:
      return '';
  }
}

function ReadOnlyBlock({ block, index }: { block: Block; index: number }) {
  if (block.type === 'divider') {
    return <hr className="my-4 border-border" />;
  }

  const prefix = getPrefix(block.type, index);

  return (
    <div className="flex my-px">
      {prefix && <span className="w-6 shrink-0 text-muted">{prefix}</span>}
      <div className={blockTypeClasses[block.type]}>
        {block.content || '\u00A0'}
      </div>
    </div>
  );
}

function TaskSection({
  task,
  onSelectTask,
}: {
  task: Task;
  onSelectTask: (id: string) => void;
}) {
  let numberedIndex = 0;

  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={() => onSelectTask(task.id)}
        className="text-left w-full group"
      >
        <h2 className="text-h1 leading-tight font-bold text-primary group-hover:text-accent-fg group-hover:underline mb-2">
          {task.title || 'Untitled'}
        </h2>
      </button>

      {task.blocks.length > 0 && (
        <div className="pl-0">
          {task.blocks.map((block, i) => {
            if (block.type === 'numbered') {
              numberedIndex++;
            } else {
              numberedIndex = 0;
            }
            return (
              <ReadOnlyBlock
                key={block.id}
                block={block}
                index={block.type === 'numbered' ? numberedIndex - 1 : i}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FullDayNotesView({
  tasks,
  onSelectTask,
  onBack,
}: FullDayNotesViewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <BackButton onClick={onBack} />
        <h1 className="text-lg font-semibold text-primary">Full Day Notes</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-muted italic">No tasks yet.</p>
        ) : (
          tasks.map((task) => (
            <TaskSection
              key={task.id}
              task={task}
              onSelectTask={onSelectTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
