# Notetaker

A Notion-style block-based note editor with task management, time tracking, and Google Calendar integration.

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Bun
- **Backend**: Hono (Cloudflare Workers), Drizzle ORM, D1 (SQLite)
- **Testing**: Vitest, Playwright

## Quick Start

```bash
# Install dependencies
bun install
cd server && bun install && cd ..

# Run frontend only (no calendar integration)
bun run dev
```

## Full Setup (with Google Calendar)

### Prerequisites

- [Bun](https://bun.sh) installed
- A Google Cloud account
- A Cloudflare account (free tier works)

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google Calendar API**:
   - Navigate to APIs & Services → Library
   - Search for "Google Calendar API" → Enable
4. Configure the OAuth consent screen:
   - APIs & Services → OAuth consent screen
   - Choose "External" user type
   - Fill in required fields (app name, support email)
   - Add scopes: `calendar.readonly` and `userinfo.email`
5. Create OAuth 2.0 credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:8787/auth/callback` (local development)
     - `https://your-worker.workers.dev/auth/callback` (production)
6. Copy the **Client ID** and **Client Secret**

### 2. Cloudflare Setup

1. Create a free account at [cloudflare.com](https://cloudflare.com) if needed

2. Login to Cloudflare via wrangler:

   ```bash
   cd server
   bunx wrangler login
   ```

3. Create the D1 database:

   ```bash
   bunx wrangler d1 create notetaker
   ```

4. Copy the `database_id` from the output and update `server/wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "notetaker"
   database_id = "your-database-id-here"
   ```

### 3. Local Environment Configuration

Create `server/.dev.vars` with your Google OAuth credentials:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 4. Run Database Migrations

```bash
cd server
bun run db:migrate:local
```

### 5. Start the Application

Run in two separate terminals:

**Terminal 1 - Backend (port 8787):**

```bash
cd server
bun run dev
```

**Terminal 2 - Frontend (port 5173):**

```bash
bun run dev
```

Open http://localhost:5173 in your browser.

## Available Scripts

### Frontend (root directory)

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `bun run dev`           | Start development server            |
| `bun run build`         | Type-check and build for production |
| `bun run test`          | Run unit tests                      |
| `bun run test:coverage` | Run tests with coverage report      |
| `bun run lint`          | Run ESLint                          |

### Backend (`server/` directory)

| Command                    | Description                     |
| -------------------------- | ------------------------------- |
| `bun run dev`              | Start local wrangler dev server |
| `bun run deploy`           | Deploy to Cloudflare Workers    |
| `bun run db:generate`      | Generate Drizzle migrations     |
| `bun run db:migrate:local` | Apply migrations locally        |
| `bun run db:migrate`       | Apply migrations to production  |
| `bun run test`             | Run backend tests               |

## Production Deployment

### Backend (Cloudflare Workers)

1. Set production secrets:

   ```bash
   cd server
   echo "your-client-id" | bunx wrangler secret put GOOGLE_CLIENT_ID
   echo "your-client-secret" | bunx wrangler secret put GOOGLE_CLIENT_SECRET
   ```

2. Update `FRONTEND_URL` in `wrangler.toml` to your production frontend URL

3. Deploy:

   ```bash
   bun run deploy
   ```

4. Run production migrations:
   ```bash
   bun run db:migrate
   ```

### Frontend

Build and deploy to your hosting provider of choice:

```bash
bun run build
# Deploy the `dist/` directory
```

Set the `VITE_API_URL` environment variable to your Cloudflare Worker URL if not using a proxy.

### GitHub Actions (Automatic Deployment)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys the backend when changes are pushed to `main`.

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN` - Create at Cloudflare Dashboard → My Profile → API Tokens (needs "Edit Workers" permission)
- `CLOUDFLARE_ACCOUNT_ID` - Found in your Cloudflare dashboard

## Project Structure

```
notetaker/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── context/            # React contexts (Theme, GoogleAuth)
│   ├── hooks/              # Custom hooks
│   └── utils/              # Utility functions
├── server/                 # Backend source
│   ├── src/
│   │   ├── db/             # Database schema and setup
│   │   ├── routes/         # API routes (auth, calendar)
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Hono middleware
│   ├── migrations/         # D1 SQL migrations
│   └── wrangler.toml       # Cloudflare Workers config
├── tests/                  # Playwright E2E tests
└── .github/workflows/      # CI/CD pipelines
```

## API Endpoints

| Endpoint               | Method | Description                      |
| ---------------------- | ------ | -------------------------------- |
| `/health`              | GET    | Health check                     |
| `/auth/google`         | GET    | Initiate Google OAuth flow       |
| `/auth/callback`       | GET    | OAuth callback handler           |
| `/auth/status`         | GET    | Check authentication status      |
| `/auth/logout`         | POST   | Logout and revoke tokens         |
| `/api/calendar/events` | GET    | Fetch calendar events for a date |

## Troubleshooting

### "wrangler: command not found"

Make sure you're in the `server/` directory, or install wrangler globally:

```bash
bun add -g wrangler
```

### OAuth redirect error

Ensure the redirect URI in Google Cloud Console exactly matches:

- Local: `http://localhost:8787/auth/callback`
- Production: `https://your-worker.workers.dev/auth/callback`

### Database errors

Try re-running migrations:

```bash
cd server
bun run db:migrate:local
```

### CORS errors

Check that `FRONTEND_URL` in `wrangler.toml` matches your frontend URL.
