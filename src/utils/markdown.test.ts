import { describe, it, expect } from 'vitest';
import {
  detectBlockType,
  getPrefix,
  stripPrefix,
  generateId,
} from './markdown';

describe('detectBlockType', () => {
  describe('headers', () => {
    it('detects h1 from "# "', () => {
      expect(detectBlockType('# Hello')).toBe('h1');
    });

    it('detects h2 from "## "', () => {
      expect(detectBlockType('## Hello')).toBe('h2');
    });

    it('detects h3 from "### "', () => {
      expect(detectBlockType('### Hello')).toBe('h3');
    });

    it('requires space after hash for headers', () => {
      expect(detectBlockType('#Hello')).toBe('paragraph');
      expect(detectBlockType('##Hello')).toBe('paragraph');
    });
  });

  describe('lists', () => {
    it('detects bullet list from "- "', () => {
      expect(detectBlockType('- Item')).toBe('bullet');
    });

    it('detects bullet list from "* "', () => {
      expect(detectBlockType('* Item')).toBe('bullet');
    });

    it('detects numbered list from "1. "', () => {
      expect(detectBlockType('1. First')).toBe('numbered');
    });

    it('detects numbered list with multi-digit numbers', () => {
      expect(detectBlockType('10. Tenth')).toBe('numbered');
      expect(detectBlockType('123. Item')).toBe('numbered');
    });
  });

  describe('todos', () => {
    it('detects unchecked todo from "[] "', () => {
      expect(detectBlockType('[] Task')).toBe('todo');
    });

    it('detects unchecked todo from "[ ] "', () => {
      expect(detectBlockType('[ ] Task')).toBe('todo');
    });

    it('detects checked todo from "[x] "', () => {
      expect(detectBlockType('[x] Done')).toBe('todo-checked');
    });

    it('detects checked todo from "[X] "', () => {
      expect(detectBlockType('[X] Done')).toBe('todo-checked');
    });
  });

  describe('other block types', () => {
    it('detects quote from "> "', () => {
      expect(detectBlockType('> Quote')).toBe('quote');
    });

    it('detects code from "```"', () => {
      expect(detectBlockType('```js')).toBe('code');
    });

    it('detects divider from "---"', () => {
      expect(detectBlockType('---')).toBe('divider');
    });

    it('returns paragraph for plain text', () => {
      expect(detectBlockType('Hello world')).toBe('paragraph');
      expect(detectBlockType('')).toBe('paragraph');
    });
  });
});

describe('getPrefix', () => {
  it('returns correct prefix for each block type', () => {
    expect(getPrefix('h1')).toBe('# ');
    expect(getPrefix('h2')).toBe('## ');
    expect(getPrefix('h3')).toBe('### ');
    expect(getPrefix('bullet')).toBe('- ');
    expect(getPrefix('numbered')).toBe('1. ');
    expect(getPrefix('todo')).toBe('[] ');
    expect(getPrefix('todo-checked')).toBe('[x] ');
    expect(getPrefix('quote')).toBe('> ');
    expect(getPrefix('code')).toBe('```');
    expect(getPrefix('divider')).toBe('---');
    expect(getPrefix('paragraph')).toBe('');
  });
});

describe('stripPrefix', () => {
  describe('headers', () => {
    it('strips h1 prefix', () => {
      expect(stripPrefix('# Hello', 'h1')).toBe('Hello');
    });

    it('strips h2 prefix', () => {
      expect(stripPrefix('## Hello', 'h2')).toBe('Hello');
    });

    it('strips h3 prefix', () => {
      expect(stripPrefix('### Hello', 'h3')).toBe('Hello');
    });
  });

  describe('lists', () => {
    it('strips bullet prefix with dash', () => {
      expect(stripPrefix('- Item', 'bullet')).toBe('Item');
    });

    it('strips bullet prefix with asterisk', () => {
      expect(stripPrefix('* Item', 'bullet')).toBe('Item');
    });

    it('strips numbered prefix', () => {
      expect(stripPrefix('1. First', 'numbered')).toBe('First');
      expect(stripPrefix('10. Tenth', 'numbered')).toBe('Tenth');
    });
  });

  describe('todos', () => {
    it('strips todo prefix', () => {
      expect(stripPrefix('[] Task', 'todo')).toBe('Task');
      expect(stripPrefix('[ ] Task', 'todo')).toBe('Task');
    });

    it('strips checked todo prefix', () => {
      expect(stripPrefix('[x] Done', 'todo-checked')).toBe('Done');
      expect(stripPrefix('[X] Done', 'todo-checked')).toBe('Done');
    });
  });

  describe('other types', () => {
    it('strips quote prefix', () => {
      expect(stripPrefix('> Quote', 'quote')).toBe('Quote');
    });

    it('returns empty string for divider', () => {
      expect(stripPrefix('---', 'divider')).toBe('');
    });

    it('returns text unchanged for paragraph', () => {
      expect(stripPrefix('Hello', 'paragraph')).toBe('Hello');
    });
  });
});

describe('generateId', () => {
  it('generates a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('generates non-empty strings', () => {
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
