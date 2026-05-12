# Local setup

## Prerequisites

- **Node.js** 20+ recommended (see `package.json` `engines` if set).
- A **Supabase** project with the schema applied ([`supabase/schema.sql`](../supabase/schema.sql)).

## Install

```bash
npm install
```

## Environment

1. Copy [`.env.example`](../.env.example) to `.env` in the repo root.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project settings (API).

Optional:

- `GEMINI_API_KEY` — only if you wire GenAI features (not used by current `src/`).
- `DISABLE_HMR=true` — disables Vite HMR (useful in some automated editing environments).
- `NODE_ENV=production` — when running the built app via `server.ts` (serves `dist/`).

## Database

In the Supabase SQL editor, run the contents of [`supabase/schema.sql`](../supabase/schema.sql). Optionally run [`supabase/seed.sql`](../supabase/seed.sql) for sample data.

Auth tip: under **Authentication → Providers → Email**, you may disable **Confirm email** for faster local sign-up/sign-in during development.

## Run (development)

```bash
npm run dev
```

This runs `tsx server.ts`, which:

- Listens on **http://localhost:3000** (bind `0.0.0.0`).
- In non-production, attaches **Vite in middleware mode** (HMR unless `DISABLE_HMR=true`).
- Hosts **Socket.IO** on the same origin (client uses `io()` with no URL).

## Run (production-style)

```bash
npm run build
NODE_ENV=production npm run start
```

Ensure `.env` (or the host environment) still provides `VITE_*` variables **at build time** for Vite; the server serves the prebuilt bundle from `dist/`.

## Scripts reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server (`tsx server.ts`) |
| `npm run build` | Vite production build → `dist/` |
| `npm run preview` | Vite preview only (not the main app server) |
| `npm run start` | `node server.ts` (production static + Socket.IO) |
| `npm run clean` | Remove `dist/` |
| `npm run lint` | `tsc --noEmit` |
| `npm test` | Vitest: checks `testing/cases/` docs + Socket.IO integration tests |
| `npm run test:watch` | Vitest watch mode |
