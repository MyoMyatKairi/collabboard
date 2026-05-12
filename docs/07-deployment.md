# Deployment

## Runtime summary

- **Port:** `3000` (hardcoded in [`server.ts`](../server.ts)).
- **Bind:** `0.0.0.0` (reachable on all interfaces; adjust if your platform requires localhost only).
- **Dev:** Vite middleware + Socket.IO on the same process.
- **Prod:** `NODE_ENV=production` → static files from `dist/`, SPA fallback to `index.html`, Socket.IO unchanged.

## Build and run

```bash
npm ci
npm run build
NODE_ENV=production npm run start
```

Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present **when running `npm run build`** so the client bundle includes the correct Supabase endpoint.

## Reverse proxy

- Terminate TLS at your load balancer or reverse proxy.
- **WebSocket upgrades** must be forwarded to the Node process (Socket.IO).
- If the app is served under a subpath, additional base URL configuration may be required (currently assumes root `/`).

## CORS

Socket.IO is configured with `origin: "*"` and methods `GET`, `POST`. For production, restrict `origin` to your real front-end domains.

## Environment

See [04-environment-variables.md](./04-environment-variables.md) and [`.env.example`](../.env.example).

## Hardening ideas

- Structured logging for joins, denies, kicks, errors.
- Health check HTTP route on Express.
- Rate limiting on HTTP if exposed publicly.
- Review Supabase RLS and anon key exposure (expected for client-side Supabase).

## Repository reference

Further notes: [`../readme/runtime-and-deployment.md`](../readme/runtime-and-deployment.md) (legacy; prefer this doc for paths).
