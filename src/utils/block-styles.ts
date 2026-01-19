import { BlockType } from '../types';

export const blockTypeClasses: Record<BlockType, string> = {
  paragraph: 'text-body',
  h1: 'text-h1 leading-tight font-bold',
  h2: 'text-h2 leading-tight font-semibold mt-6 mb-px',
  h3: 'text-h3 leading-tight font-semibold mt-4 mb-px',
  bullet: 'text-body',
  numbered: 'text-body',
  todo: 'text-body',
  'todo-checked': 'text-body line-through text-muted',
  quote: 'text-body',
  code: 'font-mono text-small bg-surface-raised py-3 px-4 rounded-sm whitespace-pre-wrap',
  divider: '',
};
