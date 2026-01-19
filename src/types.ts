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

// Task-centric architecture types
export type TaskType =
  | 'admin'
  | 'operations'
  | 'business-dev'
  | 'jardin-casa'
  | 'jardin-finca'
  | 'personal'
  | 'fitness';

export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskImportance = 'high' | 'mid' | 'low';
export type ViewType = 'spreadsheet' | 'task-detail' | 'full-day-notes';

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  importance: TaskImportance;
  blocks: Block[];
  scheduled?: boolean;
  startTime?: number;
  duration?: number;
  createdAt: number;
  updatedAt: number;
}

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'operations', label: 'Operations' },
  { value: 'business-dev', label: 'Business Dev' },
  { value: 'jardin-casa', label: 'Jardin: Casa' },
  { value: 'jardin-finca', label: 'Jardin: Finca' },
  { value: 'personal', label: 'Personal' },
  { value: 'fitness', label: 'Fitness' },
];

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To-do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export const TASK_IMPORTANCE_OPTIONS: {
  value: TaskImportance;
  label: string;
}[] = [
  { value: 'high', label: 'High' },
  { value: 'mid', label: 'Mid' },
  { value: 'low', label: 'Low' },
];

// Agenda constants
export const AGENDA_START_HOUR = 6;
export const AGENDA_END_HOUR = 23;
export const SNAP_INTERVAL = 15;
export const DEFAULT_DURATION = 60;
export const MIN_DURATION = 15;
