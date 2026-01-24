import { describe, it, expect } from 'vitest';
import { buildTree } from './WikiContext';
import type { WikiPage } from '../types';

const createMockPage = (overrides: Partial<WikiPage> = {}): WikiPage => ({
  id: 'page-1',
  title: 'Test Page',
  slug: 'test-page',
  parentId: null,
  blocks: [],
  order: 0,
  icon: null,
  type: null,
  category: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('buildTree', () => {
  it('returns empty array for empty input', () => {
    const result = buildTree([]);
    expect(result).toEqual([]);
  });

  it('returns flat list as root nodes when no parents', () => {
    const pages = [
      createMockPage({ id: 'page-1', title: 'Page 1', order: 0 }),
      createMockPage({ id: 'page-2', title: 'Page 2', order: 1 }),
    ];

    const result = buildTree(pages);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('page-1');
    expect(result[0].depth).toBe(0);
    expect(result[0].children).toHaveLength(0);
    expect(result[1].id).toBe('page-2');
  });

  it('builds nested structure with parent-child relationships', () => {
    const pages = [
      createMockPage({ id: 'parent', title: 'Parent', order: 0 }),
      createMockPage({
        id: 'child',
        title: 'Child',
        parentId: 'parent',
        order: 0,
      }),
    ];

    const result = buildTree(pages);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('parent');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('child');
    expect(result[0].children[0].depth).toBe(1);
  });

  it('handles deeply nested structures', () => {
    const pages = [
      createMockPage({ id: 'level-0', title: 'Level 0', order: 0 }),
      createMockPage({
        id: 'level-1',
        title: 'Level 1',
        parentId: 'level-0',
        order: 0,
      }),
      createMockPage({
        id: 'level-2',
        title: 'Level 2',
        parentId: 'level-1',
        order: 0,
      }),
    ];

    const result = buildTree(pages);

    expect(result[0].depth).toBe(0);
    expect(result[0].children[0].depth).toBe(1);
    expect(result[0].children[0].children[0].depth).toBe(2);
  });

  it('sorts children by order', () => {
    const pages = [
      createMockPage({ id: 'parent', title: 'Parent', order: 0 }),
      createMockPage({
        id: 'child-b',
        title: 'Child B',
        parentId: 'parent',
        order: 2,
      }),
      createMockPage({
        id: 'child-a',
        title: 'Child A',
        parentId: 'parent',
        order: 1,
      }),
      createMockPage({
        id: 'child-c',
        title: 'Child C',
        parentId: 'parent',
        order: 0,
      }),
    ];

    const result = buildTree(pages);

    expect(result[0].children[0].id).toBe('child-c');
    expect(result[0].children[1].id).toBe('child-a');
    expect(result[0].children[2].id).toBe('child-b');
  });

  it('sorts root nodes by order', () => {
    const pages = [
      createMockPage({ id: 'page-c', title: 'Page C', order: 2 }),
      createMockPage({ id: 'page-a', title: 'Page A', order: 0 }),
      createMockPage({ id: 'page-b', title: 'Page B', order: 1 }),
    ];

    const result = buildTree(pages);

    expect(result[0].id).toBe('page-a');
    expect(result[1].id).toBe('page-b');
    expect(result[2].id).toBe('page-c');
  });

  it('treats orphaned children as root nodes', () => {
    const pages = [
      createMockPage({
        id: 'orphan',
        title: 'Orphan',
        parentId: 'non-existent',
        order: 0,
      }),
      createMockPage({ id: 'root', title: 'Root', order: 1 }),
    ];

    const result = buildTree(pages);

    // Orphan should be treated as root since parent doesn't exist
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('orphan');
    expect(result[1].id).toBe('root');
  });

  it('handles multiple root nodes with children', () => {
    const pages = [
      createMockPage({ id: 'root-1', title: 'Root 1', order: 0 }),
      createMockPage({ id: 'root-2', title: 'Root 2', order: 1 }),
      createMockPage({
        id: 'child-1',
        title: 'Child 1',
        parentId: 'root-1',
        order: 0,
      }),
      createMockPage({
        id: 'child-2',
        title: 'Child 2',
        parentId: 'root-2',
        order: 0,
      }),
    ];

    const result = buildTree(pages);

    expect(result).toHaveLength(2);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('child-1');
    expect(result[1].children).toHaveLength(1);
    expect(result[1].children[0].id).toBe('child-2');
  });
});
