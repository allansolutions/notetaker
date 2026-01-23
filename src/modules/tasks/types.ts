/**
 * Task module types
 *
 * These types define the core data structures for task management.
 */

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
  level?: number; // 0, 1, or 2 - only for bullet type
}

export interface TimeSession {
  id: string;
  startTime: number; // Unix timestamp (ms)
  endTime?: number; // Unix timestamp (ms), undefined if active
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

export type TaskType =
  | 'admin'
  | 'operations'
  | 'business-dev'
  | 'jardin-casa'
  | 'jardin-finca'
  | 'personal'
  | 'fitness';

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';
export type TaskImportance = 'high' | 'mid' | 'low';
export type ViewType =
  | 'spreadsheet'
  | 'task-detail'
  | 'full-day-details'
  | 'archive'
  | 'crm-list'
  | 'crm-new'
  | 'crm-detail';

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  importance?: TaskImportance;
  blocks: Block[];
  scheduled?: boolean;
  startTime?: number;
  duration?: number;
  estimate?: number; // Estimated time in minutes
  sessions?: TimeSession[]; // Log of all work sessions
  dueDate?: number; // Unix timestamp (ms) - optional due date
  blockedReason?: string; // Reason why task is blocked (required when status is 'blocked')
  createdAt: number;
  updatedAt: number;
}

export const TASK_TYPE_COLORS: Record<TaskType, { bg: string; text: string }> =
  {
    admin: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-200',
    },
    operations: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-700 dark:text-blue-200',
    },
    'business-dev': {
      bg: 'bg-purple-100 dark:bg-purple-900',
      text: 'text-purple-700 dark:text-purple-200',
    },
    'jardin-casa': {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-700 dark:text-green-200',
    },
    'jardin-finca': {
      bg: 'bg-amber-100 dark:bg-amber-900',
      text: 'text-amber-700 dark:text-amber-200',
    },
    personal: {
      bg: 'bg-pink-100 dark:bg-pink-900',
      text: 'text-pink-700 dark:text-pink-200',
    },
    fitness: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-700 dark:text-red-200',
    },
  };

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
  { value: 'blocked', label: 'Blocked' },
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

// Calendar integration types
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: number; // Minutes since midnight (matches Task)
  duration: number; // Minutes
  isAllDay: boolean;
  htmlLink?: string;
}

export interface DateRange {
  start: number;
  end: number;
}

export interface GoogleAuthState {
  isConnected: boolean;
  isLoading: boolean;
  email?: string;
  error?: string;
}

// Date filter preset types
export type DateFilterPreset =
  | 'all'
  | 'today'
  | 'tomorrow'
  | 'yesterday'
  | 'this-week'
  | 'specific-date'
  | 'date-range';

export const DATE_FILTER_PRESET_OPTIONS: {
  value: DateFilterPreset;
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This Week' },
];
