# Environment variables

Variables are read from a `.env` file in the project root (or from the process environment). Vite loads them via `loadEnv` in [`vite.config.ts`](../vite.config.ts).

## Client / Vite (`VITE_*`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes (full app) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes (full app) | Supabase anonymous (public) API key |

These are embedded in the frontend bundle at build time. Never put service-role secrets in `VITE_*` variables.

## Build-time define

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Passed to the bundle as `process.env.GEMINI_API_KEY` for potential GenAI use. **Current application code does not read it.** |

## Node / server

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | When set to `production`, [`server.ts`](../server.ts) serves static files from `dist/` instead of Vite middleware. |
| `DISABLE_HMR` | No | When `true`, Vite dev server disables HMR ([`vite.config.ts`](../vite.config.ts)). |

## Socket.IO client

The client uses `io()` with **default URL** (same host/port as the page). No separate `VITE_SOCKET_URL` is required for the default setup.

## Template

See [`.env.example`](../.env.example) for a copy-paste template with comments.
