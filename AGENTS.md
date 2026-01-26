# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the React + TypeScript frontend (components, hooks, context, utils).
- `server/` is the Cloudflare Workers backend (Hono routes, services, DB schema, middleware).
- `tests/` holds Playwright E2E specs; frontend unit tests live next to source files as `*.test.ts(x)`.
- `server/migrations/` stores D1 SQL migrations; `dist/` is the frontend build output.

## Build, Test, and Development Commands

Frontend (repo root):

- `bun install` installs dependencies.
- `bun run dev` starts Vite on http://localhost:5173.
- `bun run build` runs `tsc -b` then builds with Vite.
- `bun run test` / `bun run test:coverage` run Vitest unit tests (coverage required).
- `bun run lint` runs ESLint.

Backend (`server/`):

- `bun run dev` runs `wrangler dev` on http://localhost:8787.
- `bun run db:migrate:local` applies local D1 migrations.
- `bun run test` runs backend Vitest tests.

E2E (root):

- `npx playwright test` runs Playwright specs (dev servers required).

## Coding Style & Naming Conventions

- TypeScript + React with Tailwind CSS; keep components in `PascalCase` and hooks in `useCamelCase`.
- Tests mirror the file name: `ComponentName.test.tsx` or `useThing.test.ts`.
- Formatting is enforced via ESLint + Prettier (`lint-staged`), so run the lint command before committing.

## Testing Guidelines

- Unit tests: Vitest + Testing Library. New components, hooks, or utilities must include tests.
- Coverage: 80% minimum for statements/branches/functions/lines (pre-commit enforced).
- E2E: update `tests/*.spec.ts` when changing user flows, selectors, or keyboard shortcuts.

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits (e.g., `feat(editor): …`, `fix(spreadsheet): …`).
- PRs should describe the change, include test coverage notes, and attach screenshots for UI changes.

## Configuration & Secrets

- Local OAuth secrets live in `server/.dev.vars`.
- Cloudflare config is in `server/wrangler.toml`; migrations in `server/migrations/`.

## Agent-Specific Instructions

- Prefer shadcn/ui components before creating custom UI.
- Avoid `eslint-disable` unless alternatives are exhausted.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
Use 'bd' for task tracking

<!-- bv-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) for issue tracking. Issues are stored in `.beads/` and tracked in git.

### Essential Commands

```bash
# View issues (launches TUI - avoid in automated sessions)
bv

# CLI commands for agents (use these instead)
bd ready              # Show issues ready to work (no blockers)
bd list --status=open # All open issues
bd show <id>          # Full issue details with dependencies
bd create --title="..." --type=task --priority=2
bd update <id> --status=in_progress
bd close <id> --reason="Completed"
bd close <id1> <id2>  # Close multiple issues at once
bd sync               # Commit and push changes
```

### Workflow Pattern

1. **Start**: Run `bd ready` to find actionable work
2. **Claim**: Use `bd update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `bd close <id>`
5. **Sync**: Always run `bd sync` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `bd ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `bd dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
bd sync                 # Commit beads changes
git commit -m "..."     # Commit code
bd sync                 # Commit any new beads changes
git push                # Push to remote
```

### Best Practices

- Check `bd ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `bd create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always `bd sync` before ending session

<!-- end-bv-agent-instructions -->
