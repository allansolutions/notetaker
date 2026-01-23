/**
 * Wiki Module Types
 *
 * Types for knowledge base and documentation.
 */

import type { Block } from '@/modules/tasks/types';

export interface WikiPage {
  id: string;
  title: string;
  slug: string;
  parentId?: string;
  blocks: Block[];
  tags?: string[];
  order: number;
  createdAt: number;
  updatedAt: number;
}
