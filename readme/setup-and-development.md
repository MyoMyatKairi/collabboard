# Setup and Development

## Prerequisites

- Node.js (LTS recommended)
- npm
- Supabase project (for auth and profile data)

## Environment Variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Without these values, `supabase` is set to `null` and auth/data features are disabled.

## Install

```bash
npm install
```

## Run in development

```bash
npm run dev
```

This starts `tsx server.ts`, which:

- Boots an Express HTTP server on port `3000`.
- Runs Socket.IO for real-time events.
- Mounts Vite middleware in development mode.

## Build and preview

```bash
npm run build
npm run preview
```

`npm run build` compiles frontend assets into `dist/`.

## Type checking

```bash
npm run lint
```

This project currently uses TypeScript type-checking (`tsc --noEmit`) as linting.

## Useful local workflow

1. Apply SQL schema in Supabase (`supabase-schema.sql`).
2. Configure env vars.
3. Run `npm run dev`.
4. Test auth flow at `/auth`.
5. Open two browser windows and join same room to verify real-time behavior.
