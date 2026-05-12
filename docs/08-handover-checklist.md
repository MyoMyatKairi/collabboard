# Handover checklist

Use this when onboarding a new engineer or operator.

## Access and accounts

- [ ] Git clone and `npm install`
- [ ] Supabase project access (Dashboard + SQL editor)
- [ ] Copy `.env.example` → `.env` with real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Database

- [ ] Run [`supabase/schema.sql`](../supabase/schema.sql) on the Supabase project
- [ ] Optionally run [`supabase/seed.sql`](../supabase/seed.sql)
- [ ] Confirm email provider settings match your testing needs

## Local verification

- [ ] `npm run dev` — app loads at http://localhost:3000
- [ ] Sign up / sign in works
- [ ] Create room → land on `/room/:roomCode`
- [ ] Second browser (or incognito) — join / realtime / moderation as applicable

## Documentation

- [ ] Read [docs/README.md](./README.md) in order (01 → 08)
- [ ] Run through manual cases in [`../testing/README.md`](../testing/README.md)

## Production (if applicable)

- [ ] `npm run build` with production env vars
- [ ] `NODE_ENV=production` for `server.ts`
- [ ] WebSocket-capable proxy
- [ ] Tighten Socket.IO CORS
- [ ] Monitoring and backups (Supabase + app host)

## Known caveats

- In-memory Socket.IO room state is **lost on server restart** (clients must reconnect).
- `MAX_ROOM_USERS` is **5** in [`server.ts`](../server.ts).
- `@google/genai` is not wired in the UI; safe to ignore unless you add features.
