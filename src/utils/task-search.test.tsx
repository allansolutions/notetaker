import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Block } from '../types';
import {
  getSnippetForBlocks,
  highlightSnippet,
  tokenizeQuery,
} from './task-search';

describe('task search utils', () => {
  it('tokenizes and deduplicates query terms', () => {
    expect(tokenizeQuery('Alpha alpha beta')).toEqual(['alpha', 'beta']);
  });

  it('builds snippets from the best matching block', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'paragraph', content: 'First block about apples.' },
      { id: 'b2', type: 'paragraph', content: 'Second block about bananas.' },
    ];

    const snippet = getSnippetForBlocks(blocks, ['bananas']);
    expect(snippet).toContain('bananas');
    expect(snippet).not.toContain('apples');
  });

  it('returns empty snippets when no blocks exist', () => {
    expect(getSnippetForBlocks([], ['alpha'])).toBe('');
  });

  it('returns empty when blocks are all whitespace and query is empty', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'paragraph', content: '   ' },
      { id: 'b2', type: 'paragraph', content: '\n' },
    ];

    expect(getSnippetForBlocks(blocks, [])).toBe('');
  });

  it('falls back to first block when no token matches', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'paragraph', content: 'First block content.' },
      { id: 'b2', type: 'paragraph', content: 'Second block content.' },
    ];

    const snippet = getSnippetForBlocks(blocks, ['missing']);
    expect(snippet).toContain('First block content');
  });

  it('uses the first non-empty block when query is empty', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'paragraph', content: '   ' },
      { id: 'b2', type: 'paragraph', content: 'Actual content here.' },
    ];

    const snippet = getSnippetForBlocks(blocks, []);
    expect(snippet).toContain('Actual content here.');
  });

  it('truncates long snippets with ellipses', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'This is a long block of content about oranges and apples.',
      },
    ];

    const snippet = getSnippetForBlocks(blocks, ['oranges'], 20);
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('adds leading ellipsis when match is mid-content', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Planning details for a winter retreat in the mountains.',
      },
    ];

    const snippet = getSnippetForBlocks(blocks, ['retreat'], 18);
    expect(snippet.startsWith('…')).toBe(true);
  });

  it('adjusts snippet window when match is near end', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Pack snacks and bring the tickets for the show',
      },
    ];

    const snippet = getSnippetForBlocks(blocks, ['show'], 20);
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(false);
  });

  it('truncates with leading ellipsis when match is near end', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        type: 'paragraph',
        content: 'Notes about planning the trip to Madrid soon.',
      },
    ];

    const snippet = getSnippetForBlocks(blocks, ['soon'], 18);
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(false);
  });

  it('does not add ellipsis when content fits', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'paragraph', content: 'Short content.' },
    ];

    const snippet = getSnippetForBlocks(blocks, ['short'], 50);
    expect(snippet).toBe('Short content.');
  });

  it('highlights query matches with mark tags', () => {
    render(
      <div>{highlightSnippet('Buy apples today', ['apples'], 'highlight')}</div>
    );

    const highlighted = screen.getByText('apples');
    expect(highlighted.tagName).toBe('MARK');
    expect(highlighted).toHaveClass('highlight');
  });

  it('returns snippet unchanged when tokens are empty', () => {
    const content = highlightSnippet('Just text', [], 'highlight');
    render(<div>{content}</div>);

    expect(screen.getByText('Just text')).toBeInTheDocument();
  });

  it('returns snippet unchanged when tokens are too short', () => {
    const content = highlightSnippet('Short tokens', ['a'], 'highlight');
    render(<div>{content}</div>);

    expect(screen.getByText('Short tokens')).toBeInTheDocument();
  });

  it('highlights multiple tokens', () => {
    render(
      <div>
        {highlightSnippet(
          'Email Alice about budget review',
          ['alice', 'budget'],
          'highlight'
        )}
      </div>
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('budget')).toBeInTheDocument();
  });

  it('returns empty when snippet is empty', () => {
    const content = highlightSnippet('', ['alpha'], 'highlight');
    render(<div>{content}</div>);

    expect(screen.queryByText('alpha')).not.toBeInTheDocument();
  });
});
