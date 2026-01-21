import { Block } from '../types';
import { ReactNode } from 'react';

const MIN_TOKEN_LENGTH = 2;
const DEFAULT_SNIPPET_LENGTH = 120;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tokenizeQuery(query: string): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const tokens = normalized
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
  return Array.from(new Set(tokens));
}

function buildSnippetWindow(
  content: string,
  matchIndex: number,
  maxLength: number
): string {
  if (content.length <= maxLength) return content;

  const safeMatchIndex = Math.max(0, matchIndex);
  const contextRadius = Math.floor(maxLength / 3);
  let start = Math.max(0, safeMatchIndex - contextRadius);
  const end = Math.min(content.length, start + maxLength);

  if (end - start < maxLength) {
    start = Math.max(0, end - maxLength);
  }

  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < content.length) snippet = `${snippet}…`;
  return snippet;
}

export function getSnippetForBlocks(
  blocks: Block[],
  tokens: string[],
  maxLength: number = DEFAULT_SNIPPET_LENGTH
): string {
  const normalizedBlocks = blocks
    .map((block) => ({ ...block, content: normalizeText(block.content) }))
    .filter((block) => block.content.length > 0);

  if (normalizedBlocks.length === 0) return '';

  if (tokens.length === 0) {
    const [firstBlock] = normalizedBlocks;
    return buildSnippetWindow(firstBlock.content, 0, maxLength);
  }

  const { block: bestBlock, firstMatchIndex } = pickBestBlock(
    normalizedBlocks,
    tokens
  );
  const matchIndex = firstMatchIndex === Infinity ? 0 : firstMatchIndex;
  return buildSnippetWindow(bestBlock.content, matchIndex, maxLength);
}

function scoreBlockContent(content: string, tokens: string[]) {
  const contentLower = content.toLowerCase();
  let score = 0;
  let firstMatchIndex = Infinity;

  for (const token of tokens) {
    const matchIndex = contentLower.indexOf(token.toLowerCase());
    if (matchIndex >= 0) {
      score += 1;
      firstMatchIndex = Math.min(firstMatchIndex, matchIndex);
    }
  }

  return { score, firstMatchIndex };
}

function pickBestBlock(blocks: Block[], tokens: string[]) {
  return blocks.reduce(
    (best, block) => {
      const { score, firstMatchIndex } = scoreBlockContent(
        block.content,
        tokens
      );
      if (
        score > best.score ||
        (score === best.score && firstMatchIndex < best.firstMatchIndex)
      ) {
        return { block, score, firstMatchIndex };
      }
      return best;
    },
    { block: blocks[0], score: -1, firstMatchIndex: Infinity }
  );
}

export function highlightSnippet(
  snippet: string,
  tokens: string[],
  className: string
): ReactNode {
  if (!snippet) return snippet;
  if (tokens.length === 0) return snippet;

  const escapedTokens = Array.from(
    new Set(tokens.map((token) => token.toLowerCase()))
  )
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  if (escapedTokens.length === 0) return snippet;

  const pattern = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
  const parts = snippet.split(pattern);
  const lowerTokens = new Set(tokens.map((token) => token.toLowerCase()));

  return parts.map((part, index) => {
    if (lowerTokens.has(part.toLowerCase())) {
      return (
        <mark key={`mark-${index}`} className={className}>
          {part}
        </mark>
      );
    }
    return part;
  });
}
