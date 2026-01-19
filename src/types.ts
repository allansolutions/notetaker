export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'todo-checked'
  | 'quote'
  | 'code'
  | 'divider';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
}

export interface Document {
  id: string;
  title: string;
  blocks: Block[];
  updatedAt: number;
}

export type TodoImportance = 'high' | 'mid' | 'low';

export interface TodoMetadata {
  importance?: TodoImportance;
  scheduled?: boolean;
  startTime?: number; // Minutes since midnight (0-1439)
  duration?: number; // Duration in minutes (min 15)
}

// Agenda constants
export const AGENDA_START_HOUR = 6;
export const AGENDA_END_HOUR = 23;
export const SNAP_INTERVAL = 15;
export const DEFAULT_DURATION = 60;
export const MIN_DURATION = 15;
