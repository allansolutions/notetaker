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
