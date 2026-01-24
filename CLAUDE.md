# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start development server (Vite, runs on port 5173)
- `npm run build` - Type-check with TypeScript then build for production
- `npx playwright test` - Run Playwright e2e tests (requires dev server running)
- `npx playwright test tests/visual.spec.ts` - Run a single test file

**Note:** Assume the dev server is always running. Do not start it manually.

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

**This is mandatory, not optional.** The pre-commit hook enforces 80% coverage - code without tests will not commit.

### Unit Tests

Every new function, hook, or component MUST have corresponding tests before the code is considered complete. Do not move to the next task until tests exist.

- Tests live alongside source files: `ComponentName.test.tsx` or `hookName.test.ts`
- Run `npm test` during development to verify tests pass
- Run `npm run test:coverage` to check coverage before committing

When creating todo items for new features, always include tests as an explicit step:

- "Implement SessionsModal component"
- "Add tests for SessionsModal component"

### E2E Tests

Update Playwright tests in `tests/*.spec.ts` when making changes to:

- User interactions and keyboard shortcuts
- DOM structure or CSS class names used as selectors
- Navigation flows between views

### Coverage Thresholds

The project enforces 80% minimum coverage for statements, branches, functions, and lines. This is checked on every commit. If coverage drops below threshold, add tests before committing.

## Code Quality

Before using `eslint-disable` comments, think hard about whether there's a better approach. These comments are often a sign of taking shortcuts rather than solving the underlying problem properly. For example:

- Instead of disabling accessibility rules on click handlers, use proper semantic elements like `<button>` or native `<dialog>`
- Instead of disabling React hooks rules, restructure the code to follow the rules of hooks

Only use `eslint-disable` when you've genuinely evaluated alternatives and determined it's the right choice.

## Tools

Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

### Playwright MCP

Only use Playwright MCP tools when:

- Explicitly asked to automate browser interactions
- Debugging a visual or E2E test failure that can't be diagnosed from logs/code alone
- Need to verify actual rendered UI behavior
- Checking browser console for errors (useful for debugging render loops, etc.)

Do NOT use Playwright MCP for:

- Reading test files or test output (use Read/Grep)
- Understanding what tests do (read the code)
- General development tasks

**Authentication:** The app requires Google OAuth. To use Playwright MCP with authenticated sessions, mock the auth endpoints before navigating. Use the same pattern as `tests/helpers/auth.ts`:

```javascript
// Mock auth endpoint to simulate authenticated user
await page.route('**/auth/me', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user: { id: 'test-user-1', email: 'test@example.com', name: 'Test User' },
      settings: null,
    }),
  });
});

// Mock tasks API (empty initial state)
await page.route('**/api/tasks', async (route) => {
  if (route.request().method() === 'GET') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tasks: [] }),
    });
  }
});

// Then navigate
await page.goto('http://localhost:5173');
```

For more complete mocking (including task CRUD operations), see `mockTasksApi()` in `tests/helpers/auth.ts`.

## UI Components

When adding new UI components (dropdowns, modals, popovers, form elements, etc.), check shadcn/ui first before building custom components. Only build custom if shadcn/ui doesn't have what's needed or if a pre-existing project dependency already provides the functionality.

## Task Management

This project uses `tasklist.md` to track feature ideas and fixes. Respond to these commands:

### `task add: <description>`

1. Generate a short summary title (max 60 chars) from the description
2. Append to `tasklist.md` using this format:

```markdown
## <next_number>. <summary title>

**Status:** pending | **Added:** <YYYY-MM-DD>

<full description exactly as provided>

---
```

### `task list`

1. Read `tasklist.md`
2. Display pending tasks as a numbered list showing only the summary titles
3. Tell the user they can say "task <number>" to work on one

### `task <number>` or `work on task <number>`

1. Read the full description for that task from `tasklist.md`
2. Begin implementing it following normal development workflow

### `task done <number>`

1. Change the task's status from `pending` to `completed`
2. Add a **Completed:** date line

## Git

Never make commits on your own. Only commit when explicitly asked via /commit or similar.

## Permissions

When the user approves a new tool permission that isn't already in `.claude/settings.json`, add it to `permissions.allow` so it persists across sessions.
