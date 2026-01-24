# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `bun dev` - Start development server (Vite, runs on port 5173)
- `bun run build` - Type-check with TypeScript then build for production
- `bun run test` - Run unit tests with Vitest
- `bunx playwright test` - Run Playwright E2E tests (requires dev server running)
- `bunx playwright test tests/visual.spec.ts` - Run a single E2E test file

**Important:** Use `bun run test`, NOT `bun test`. The latter invokes Bun's built-in test runner which is incompatible with Vitest APIs.

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

- Data is persisted to the database via API calls (`src/api/client.ts`)
- localStorage is used only for UI preferences (theme, sidebar width) and time tracking session recovery
- Block type detection happens on input: typing markdown prefixes (like `# `, `- `, `[] `) auto-converts paragraphs
- List continuation: pressing Enter in a list block creates a new block of the same type; Enter on empty list block converts to paragraph

### Keyboard Shortcuts

- `Cmd+E` - Select current block
- `Cmd+Shift+Arrow` - Move block up/down
- Arrow keys - Navigate between blocks
- Enter - Create new block / enter edit mode when selected
- Backspace on empty block - Delete block

### Task List and Archive Views

The main task list (spreadsheet view) and archive view are essentially the same view sharing the `TaskTable` component. They have identical columns, filters, sorting, grouping, and keyboard navigation. The only difference is the data they display:

- **Task List**: Shows tasks with status other than "done"
- **Archive**: Shows tasks with status "done"

When making UI changes to columns, rows, filters, sorting, or keyboard interactions in either view, those changes automatically apply to both since they share the same underlying component. Keep this in mind when testing—verify changes work correctly in both views.

**Key files:**

- `src/components/spreadsheet/TaskTable.tsx` - Shared table component
- `src/components/views/SpreadsheetView.tsx` - Main task list wrapper
- `src/components/views/ArchiveView.tsx` - Archive wrapper

### Command Palette

The app has a command palette (Cmd+P) that provides quick access to actions. Commands are defined in `src/App.tsx` in the `commandPaletteCommands` useMemo.

**Adding a new command:**

1. Add a command object to the `commandPaletteCommands` array in `src/App.tsx`:

```typescript
{
  id: 'unique-command-id',
  label: 'Category: Action Name',  // e.g., "Filter: Today", "Group: By Date"
  type: 'command',
  keywords: ['search', 'terms', 'for', 'matching'],
  onExecute: () => { /* action */ },
  shouldShow?: () => boolean,  // Optional: hide command based on context
}
```

2. Add any new dependencies to the useMemo dependency array.

**Command naming convention:** Use `Category: Action` format (e.g., "Filter: Today", "Task: New", "Group: By Date").

**Important:** When implementing new features that change the view or take an action that users can trigger via UI, consider whether a command should also be added. Most user-facing actions benefit from having a command palette equivalent for keyboard-driven workflows.

## Testing Strategy

This project uses a layered testing approach optimized for solo development velocity.

### Layer 1: E2E Tests (High Value)

Playwright tests in `tests/*.spec.ts` test real user flows and catch actual user-facing bugs. Update these when making changes to:

- User interactions and keyboard shortcuts
- Navigation flows between views
- Core features (task management, wiki, time tracking)

### Layer 2: Data Integrity Tests (Critical)

Unit tests for code where bugs cause data loss:

- `src/api/client.test.ts` - API client functions
- `src/hooks/useLocalStorage.test.ts` - localStorage operations
- `src/hooks/useTimeTracking.test.ts` - Time tracking persistence
- `src/hooks/useMultiTaskTimeTracking.test.ts` - Multi-task time tracking
- `src/context/AuthContext.test.tsx` - Authentication

### Layer 3: Pure Utility Tests (Low Maintenance)

Unit tests for pure functions in `src/utils/*.test.ts`. These are stable, fast, and rarely need updating.

### What NOT to Test

Do not add unit tests for:

- UI components (E2E tests cover these better)
- React context providers (except auth)
- Hooks that just wire up state (E2E covers behavior)
- "Renders correctly" assertions

### Running Tests

- `bun run test` - Run unit tests (Vitest)
- `bunx playwright test` - Run E2E tests (requires dev server)

**Never use `bun test` directly** - it runs Bun's incompatible test runner instead of Vitest.

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
