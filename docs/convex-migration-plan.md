# Migration Plan: Cloudflare D1 to Convex

## Overview

Migrate the notetaker app from Cloudflare D1 (with Hono server) to Convex with Convex Auth (Google provider). This replaces the REST API with Convex's real-time queries/mutations while preserving Google Calendar integration.

## What You Need to Set Up First

### 1. Convex Account & Project

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Sign up / log in
3. Create new project named "notetaker"
4. Note your **Deployment URL** (e.g., `https://xxx-xxx.convex.cloud`)

### 2. Update Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Edit your existing OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   - `https://<your-convex-deployment>.convex.site/api/auth/callback/google`
4. Keep the existing localhost URIs for now (can remove later)

---

## Implementation Phases

### Phase 1: Install Convex & Create Schema

**Files to create:**

#### `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,

  tasks: defineTable({
    userId: v.id('users'),
    type: v.string(),
    title: v.string(),
    status: v.string(),
    importance: v.string(),
    blocks: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        content: v.string(),
      })
    ),
    scheduled: v.boolean(),
    startTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    estimate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    orderIndex: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_order', ['userId', 'orderIndex']),

  timeSessions: defineTable({
    taskId: v.id('tasks'),
    startTime: v.number(),
    endTime: v.optional(v.number()),
  }).index('by_task', ['taskId']),

  userSettings: defineTable({
    userId: v.id('users'),
    theme: v.string(),
    sidebarWidth: v.number(),
  }).index('by_user', ['userId']),

  googleTokens: defineTable({
    userId: v.id('users'),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    email: v.optional(v.string()),
  }).index('by_user', ['userId']),
});
```

**Commands:**

```bash
npm install convex @convex-dev/auth @auth/core
npx convex dev  # Initialize and deploy schema
```

---

### Phase 2: Configure Convex Auth with Google

**Files to create:**

#### `convex/auth.config.ts`

- Configure Google OAuth provider
- Request `calendar.readonly` scope for Calendar access

#### `convex/auth.ts`

- Export auth helpers (signIn, signOut, etc.)
- Configure callback to store Google tokens in `googleTokens` table

#### `convex/http.ts`

- HTTP routes for auth callbacks

**Environment variables to set:**

```bash
npx convex env set AUTH_GOOGLE_ID <your-google-client-id>
npx convex env set AUTH_GOOGLE_SECRET <your-google-client-secret>
```

---

### Phase 3: Create Convex Functions

**Files to create:**

| File                     | Functions                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `convex/tasks.ts`        | `list` (query), `get` (query), `create` (mutation), `update` (mutation), `remove` (mutation), `reorder` (mutation) |
| `convex/timeSessions.ts` | `listByTask` (query), `create` (mutation), `update` (mutation), `remove` (mutation)                                |
| `convex/settings.ts`     | `get` (query), `update` (mutation)                                                                                 |
| `convex/calendar.ts`     | `getEvents` (action) - calls Google Calendar API                                                                   |
| `convex/migrate.ts`      | `importData` (mutation) - for localStorage migration                                                               |

---

### Phase 4: Update Frontend

**Files to modify:**

| File                             | Changes                                                             |
| -------------------------------- | ------------------------------------------------------------------- |
| `src/main.tsx`                   | Wrap app with `ConvexProvider` and `ConvexAuthProvider`             |
| `src/App.tsx`                    | Remove `AuthProvider`, `GoogleAuthProvider` from provider hierarchy |
| `src/context/TasksContext.tsx`   | Rewrite to use `useQuery`/`useMutation` from Convex                 |
| `src/hooks/useCalendarEvents.ts` | Use `useAction` for calendar fetch                                  |
| `src/components/LoginPage.tsx`   | Use Convex Auth `signIn` with Google                                |
| `src/components/AuthGuard.tsx`   | Use `useConvexAuth` or `Authenticated` component                    |

**Files to delete:**

| File                                     | Reason                         |
| ---------------------------------------- | ------------------------------ |
| `src/context/AuthContext.tsx`            | Replaced by Convex Auth        |
| `src/context/GoogleAuthContext.tsx`      | Merged into Convex Auth        |
| `src/api/client.ts`                      | No REST API needed             |
| `src/components/GoogleConnectButton.tsx` | Google is now the primary auth |

**New file to create:**

| File            | Purpose                      |
| --------------- | ---------------------------- |
| `src/convex.ts` | Convex client initialization |

---

### Phase 5: Update Tests

**E2E tests (`tests/*.spec.ts`):**

- Update auth mocking to mock Convex Auth instead of REST endpoints
- Remove `/api/*` route mocks, add Convex query/mutation mocks

**Unit tests:**

- Mock `useQuery`, `useMutation`, `useAction` from `convex/react`
- Update component tests that relied on TasksContext

---

### Phase 6: Delete Server Directory

**Files/directories to delete:**

```
server/                    # Entire directory
├── src/
├── migrations/
├── test/
├── package.json
├── wrangler.toml
├── drizzle.config.ts
└── tsconfig.json
```

**Root files to update:**

- `package.json` - Remove server-related scripts if any
- `.env.example` - Update for Convex variables
- `vite.config.ts` - Remove `/auth` and `/api` proxy configuration

---

### Phase 7: Update README.md

Replace the current setup instructions with Convex-specific setup. See full README content at the end of this plan.

---

## File Change Summary

### New Files (14)

```
convex/
├── schema.ts
├── auth.ts
├── auth.config.ts
├── http.ts
├── tasks.ts
├── timeSessions.ts
├── settings.ts
├── calendar.ts
├── migrate.ts
└── lib/
    └── googleCalendar.ts
src/
└── convex.ts
.env.local (Convex URL)
```

### Modified Files (8)

```
src/main.tsx
src/App.tsx
src/context/TasksContext.tsx
src/hooks/useCalendarEvents.ts
src/components/LoginPage.tsx
src/components/AuthGuard.tsx
package.json
vite.config.ts
README.md
```

### Deleted Files (4 + server directory)

```
src/context/AuthContext.tsx
src/context/GoogleAuthContext.tsx
src/api/client.ts
src/components/GoogleConnectButton.tsx
server/ (entire directory)
```

---

## Key Architecture Changes

### Before (REST API)

```
React Component
    ↓ fetch()
REST API (Hono)
    ↓ Drizzle ORM
Cloudflare D1
```

### After (Convex)

```
React Component
    ↓ useQuery() / useMutation()
Convex Functions
    ↓ ctx.db
Convex Database
```

### Benefits

- **Real-time**: Data updates automatically across all clients
- **No server code**: Convex manages infrastructure
- **Type safety**: End-to-end TypeScript types
- **Simpler auth**: Convex Auth handles OAuth flow
- **Optimistic updates**: Built into Convex mutations

---

## README.md Content (Phase 7)

```markdown
# Notetaker

A Notion-style block-based note editor with task management, time tracking, and Google Calendar integration.

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Convex (real-time database + serverless functions)
- **Auth**: Convex Auth with Google OAuth
- **Testing**: Vitest, Playwright

## Prerequisites

- Node.js 18+ or Bun
- A Google Cloud account (for OAuth and Calendar API)
- A Convex account (free tier available)

## Setup

### 1. Clone and Install

\`\`\`bash
git clone <repo-url>
cd notetaker
npm install
\`\`\`

### 2. Create Convex Project

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Sign up or log in
3. Create a new project (e.g., "notetaker")

### 3. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. **Enable APIs**:
   - Navigate to APIs & Services → Library
   - Enable "Google Calendar API"
4. **Configure OAuth consent screen**:
   - APIs & Services → OAuth consent screen
   - User Type: External
   - Add scopes: `calendar.readonly`, `userinfo.email`, `openid`
5. **Create OAuth credentials**:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:5173` (development)
     - Your production URL
   - Authorized redirect URIs:
     - `https://<your-deployment>.convex.site/api/auth/callback/google`
6. Copy the **Client ID** and **Client Secret**

### 4. Set Convex Environment Variables

\`\`\`bash
npx convex env set AUTH_GOOGLE_ID <your-google-client-id>
npx convex env set AUTH_GOOGLE_SECRET <your-google-client-secret>
\`\`\`

### 5. Initialize Convex

\`\`\`bash
npx convex dev
\`\`\`

This will:

- Link to your Convex project
- Deploy your schema and functions
- Create `.env.local` with your `CONVEX_URL`

### 6. Start Development

In separate terminals:

**Terminal 1 - Convex (watches for changes):**
\`\`\`bash
npx convex dev
\`\`\`

**Terminal 2 - Frontend:**
\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:5173

## Environment Variables

### Local Development

`.env.local` (auto-generated by `npx convex dev`):
\`\`\`
CONVEX_URL=https://your-deployment.convex.cloud
\`\`\`

### Convex Dashboard

Set these in the Convex dashboard or via CLI:

| Variable             | Description                |
| -------------------- | -------------------------- |
| `AUTH_GOOGLE_ID`     | Google OAuth Client ID     |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |

## Available Scripts

| Command                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Start Vite dev server                         |
| `npm run build`         | Type-check and build for production           |
| `npm run test`          | Run unit tests                                |
| `npm run test:coverage` | Run tests with coverage report                |
| `npm run lint`          | Run ESLint                                    |
| `npx convex dev`        | Start Convex dev server (watches for changes) |
| `npx convex deploy`     | Deploy Convex functions to production         |

## Project Structure

\`\`\`
notetaker/
├── convex/ # Convex backend
│ ├── schema.ts # Database schema
│ ├── auth.ts # Authentication config
│ ├── auth.config.ts # Auth provider config
│ ├── http.ts # HTTP routes for auth
│ ├── tasks.ts # Task queries/mutations
│ ├── timeSessions.ts # Time session operations
│ ├── settings.ts # User settings
│ ├── calendar.ts # Google Calendar action
│ └── migrate.ts # Data migration
├── src/ # Frontend source
│ ├── components/ # React components
│ ├── context/ # React contexts
│ ├── hooks/ # Custom hooks
│ ├── utils/ # Utility functions
│ └── convex.ts # Convex client setup
├── tests/ # Playwright E2E tests
└── .env.local # Local environment (auto-generated)
\`\`\`

## Production Deployment

### 1. Deploy Convex Functions

\`\`\`bash
npx convex deploy
\`\`\`

### 2. Build Frontend

\`\`\`bash
npm run build
\`\`\`

Deploy the `dist/` directory to your hosting provider (Vercel, Netlify, etc.).

### 3. Update Google OAuth

Add your production URL to Google Cloud Console:

- Authorized JavaScript origins: `https://your-domain.com`
- Authorized redirect URIs: `https://<your-deployment>.convex.site/api/auth/callback/google`

## Architecture

### Real-time Data

Convex provides real-time data synchronization. Any changes to tasks or settings are automatically reflected across all connected clients without polling.

### Authentication

Authentication uses Convex Auth with Google as the OAuth provider. Signing in with Google also grants access to Google Calendar for the agenda sidebar.

### Google Calendar Integration

Calendar events are fetched via a Convex Action that:

1. Retrieves stored Google OAuth tokens
2. Refreshes tokens if expired
3. Calls Google Calendar API
4. Returns events for the requested date

## Troubleshooting

### "Convex deployment not found"

Run `npx convex dev` to link your project and create `.env.local`.

### OAuth redirect error

Ensure the redirect URI in Google Cloud Console exactly matches:
\`\`\`
https://<your-deployment>.convex.site/api/auth/callback/google
\`\`\`

Find your deployment name in the Convex dashboard.

### Calendar not loading

1. Check that Google Calendar API is enabled in Google Cloud Console
2. Verify `calendar.readonly` scope is configured
3. Try signing out and back in to refresh OAuth tokens

### Tests failing after migration

Update test mocks to use Convex patterns instead of REST API mocks. See `tests/helpers/` for examples.
```

---

## Verification Steps

After implementation, verify:

1. **Auth Flow**: Sign in with Google works, user created in Convex
2. **Tasks CRUD**: Create, read, update, delete tasks
3. **Real-time**: Open two browser tabs, changes sync between them
4. **Time Sessions**: Create and edit time sessions on tasks
5. **Settings**: Theme and sidebar width persist
6. **Calendar**: Calendar events load in sidebar for connected users
7. **Migration**: localStorage data imports correctly for new users
8. **E2E Tests**: `npx playwright test` passes
9. **Unit Tests**: `npm test` passes with 80% coverage

---

## Rollback Plan

If issues arise during migration:

1. The `server/` directory can be restored from git
2. Revert frontend changes
3. D1 database still exists on Cloudflare (no data lost)
