/**
 * Wiki Module Types
 *
 * Types for knowledge base and documentation.
 */

import type { Block } from '@/modules/tasks/types';

export type WikiPageType =
  | 'call-notes'
  | 'sop'
  | 'meeting-notes'
  | 'reference'
  | 'template'
  | 'general';

export type WikiCategory =
  | 'admin'
  | 'operations'
  | 'business-dev'
  | 'jardin-casa'
  | 'jardin-finca'
  | 'personal'
  | 'fitness';

export interface WikiPage {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  blocks: Block[];
  order: number;
  icon: string | null;
  type: WikiPageType | null;
  category: WikiCategory | null;
  tags?: string[]; // User-defined tags for categorization
  createdAt: number;
  updatedAt: number;
}

export interface WikiPageTreeNode extends WikiPage {
  children: WikiPageTreeNode[];
  depth: number;
}

export interface WikiBreadcrumb {
  id: string;
  title: string;
  slug: string;
  icon: string | null;
}
