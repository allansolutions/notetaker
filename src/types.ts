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
}
