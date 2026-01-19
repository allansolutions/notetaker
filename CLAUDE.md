# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start development server (Vite, runs on port 5173)
- `npm run build` - Type-check with TypeScript then build for production
- `npx playwright test` - Run Playwright e2e tests (requires dev server running)
- `npx playwright test tests/visual.spec.ts` - Run a single test file

## Architecture

This is a Notion-style block-based note editor built with React, TypeScript, and Vite.

### Block System

The editor uses a block-based architecture where each piece of content is a `Block` with an id, type, and content. Block types include: paragraph, h1-h3, bullet, numbered, todo/todo-checked, quote, code, and divider.

**Key files:**

- `src/types.ts` - Block and Document type definitions
- `src/utils/markdown.ts` - Markdown prefix detection and parsing (e.g., typing "# " converts to h1)
- `src/components/Editor.tsx` - Main editor managing block state and operations
- `src/components/BlockInput.tsx` - Individual block rendering with contentEditable

### Data Flow

- Blocks are persisted to localStorage via `useLocalStorage` hook with 300ms debounce
- Block type detection happens on input: typing markdown prefixes (like `# `, `- `, `[] `) auto-converts paragraphs
- List continuation: pressing Enter in a list block creates a new block of the same type; Enter on empty list block converts to paragraph

### Keyboard Shortcuts

- `Cmd+E` - Select current block
- `Cmd+Shift+Arrow` - Move block up/down
- Arrow keys - Navigate between blocks
- Enter - Create new block / enter edit mode when selected
- Backspace on empty block - Delete block

## Testing Requirements

When adding or updating important functionality, always create or update corresponding unit tests in `src/**/*.test.ts`. Run `npm test` to verify tests pass before committing.

When making significant changes to user interactions, DOM structure, or CSS class names used as test selectors, update the Playwright e2e tests in `tests/*.spec.ts`. The e2e tests verify keyboard shortcuts, block selection, and block movement from a user's perspective.

## Tools

Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

## Permissions

When the user approves a new tool permission that isn't already in `.claude/settings.json`, add it to `permissions.allow` so it persists across sessions.
