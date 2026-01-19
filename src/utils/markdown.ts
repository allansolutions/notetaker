import { BlockType } from '../types';

interface PatternMatch {
  pattern: string | RegExp;
  type: BlockType;
}

const BLOCK_PATTERNS: PatternMatch[] = [
  // Headers (must check longer patterns first)
  { pattern: '### ', type: 'h3' },
  { pattern: '## ', type: 'h2' },
  { pattern: '# ', type: 'h1' },
  // Divider
  { pattern: '---', type: 'divider' },
  // Todo items
  { pattern: '[x] ', type: 'todo-checked' },
  { pattern: '[X] ', type: 'todo-checked' },
  { pattern: '[] ', type: 'todo' },
  { pattern: '[ ] ', type: 'todo' },
  // Lists
  { pattern: '- ', type: 'bullet' },
  { pattern: '* ', type: 'bullet' },
  { pattern: /^\d+\.\s/, type: 'numbered' },
  // Quote
  { pattern: '> ', type: 'quote' },
  // Code
  { pattern: '```', type: 'code' },
];

export function detectBlockType(text: string): BlockType {
  for (const { pattern, type } of BLOCK_PATTERNS) {
    if (typeof pattern === 'string') {
      if (text.startsWith(pattern)) {
        return type;
      }
    } else if (pattern.test(text)) {
      return type;
    }
  }
  return 'paragraph';
}

export function getPrefix(type: BlockType): string {
  switch (type) {
    case 'h1':
      return '# ';
    case 'h2':
      return '## ';
    case 'h3':
      return '### ';
    case 'bullet':
      return '- ';
    case 'numbered':
      return '1. ';
    case 'todo':
      return '[] ';
    case 'todo-checked':
      return '[x] ';
    case 'quote':
      return '> ';
    case 'code':
      return '```';
    case 'divider':
      return '---';
    default:
      return '';
  }
}

export function stripPrefix(text: string, type: BlockType): string {
  if (type === 'numbered') {
    return text.replace(/^\d+\.\s/, '');
  }
  if (type === 'divider') {
    return '';
  }
  const prefix = getPrefix(type);
  if (prefix && text.startsWith(prefix)) {
    return text.slice(prefix.length);
  }
  // Handle alternate patterns
  if (type === 'bullet' && text.startsWith('* ')) {
    return text.slice(2);
  }
  if (type === 'todo' && text.startsWith('[ ] ')) {
    return text.slice(4);
  }
  if (type === 'todo-checked' && text.startsWith('[X] ')) {
    return text.slice(4);
  }
  return text;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
