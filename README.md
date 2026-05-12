# CollabBoard — Collaborative whiteboard

A real-time collaborative whiteboard: shared cursors, drawing tools, room codes, and Supabase-backed auth and persistence. Technical handover lives in **[`docs/`](docs/README.md)**; manual QA cases are in **[`testing/`](testing/README.md)**.

## Features

- **Realtime collaboration** — Socket.IO syncs strokes, edits, clears, and cursors while users are online (room cap: 5 concurrent sockets).
- **Drawing tools** — Pen, rectangle, circle, arrow, line, text, sticky notes, eraser; colors and stroke widths; selection and transform.
- **Supabase auth** — Email sign-up and sign-in.
- **Rooms** — Boards with short `room_code`; create from home or join by code; recent rooms with presence hints.
- **Moderation** — Owner can approve pending guests, kick, and ban (aligned with server and DB role).
- **Persistence** — Board metadata and elements stored in Postgres (`board_elements`, `boards`, `participants`, `board_presence`).
- **Export** — PNG and PDF export from the canvas.
- **Responsive UI** — Desktop and mobile toolbar layouts.

## Tech stack

React 19, Vite 6, TypeScript, Tailwind CSS 4, Konva, Express + Socket.IO, Supabase.

## Prerequisites

- Node.js **20+** (see `package.json` `engines`).
- A [Supabase](https://supabase.com/) project.

## Quick start

### 1. Environment

Copy [`.env.example`](.env.example) to `.env` and set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Optional variables are documented in [`.env.example`](.env.example) and [`docs/04-environment-variables.md`](docs/04-environment-variables.md).

### 2. Database

In the Supabase SQL editor, run:

- [`supabase/schema.sql`](supabase/schema.sql)

Optional:

- [`supabase/seed.sql`](supabase/seed.sql)

### 3. Supabase auth

Under **Authentication → Providers → Email**, you may disable **Confirm email** for faster local testing.

### 4. Install and run

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. The dev server (`server.ts`) runs Express with Vite in middleware mode and Socket.IO on the same port.

### Production-style run

```bash
npm run build
NODE_ENV=production npm run start
```

Express serves the built SPA from `dist/` and keeps Socket.IO on port 3000.

## Documentation

| Resource | Description |
|----------|-------------|
| [`docs/README.md`](docs/README.md) | Handover index (architecture, env, DB, realtime protocol, deployment) |
| [`testing/README.md`](testing/README.md) | Manual test matrix and case files |

## Project layout

| Path | Role |
|------|------|
| `server.ts` | HTTP + Vite (dev) or static `dist` (prod) + Socket.IO |
| `src/App.tsx` | Router and auth gate |
| `src/components/` | Auth, Landing, Whiteboard |
| `src/lib/supabase.ts` | Supabase client |
| `src/types.ts` | Shared TypeScript types |
| `supabase/` | SQL schema and seed |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development (tsx + Vite middleware + Socket.IO) |
| `npm run build` | Production frontend build |
| `npm run start` | Node server (set `NODE_ENV=production` for static assets) |
| `npm run preview` | Vite preview only (not the main app server) |
| `npm run clean` | Remove `dist/` |
| `npm run lint` | `tsc --noEmit` |
| `npm test` | Vitest: manual case docs + Socket.IO integration tests (`tests/socket.integration.test.ts`) |
| `npm run test:watch` | Vitest in watch mode |

## License

MIT — see [`LICENSE`](LICENSE).
