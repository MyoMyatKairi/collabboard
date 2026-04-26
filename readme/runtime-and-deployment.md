# Runtime and Deployment

## Runtime behavior

The project runs as a single Node.js process serving both:

- Express HTTP endpoints/static assets.
- Socket.IO real-time event transport.

In development:

- `server.ts` starts Vite in middleware mode.
- Frontend and socket share the same origin and port (`3000`).

In production:

- `dist/` is served as static assets by Express.
- Unknown routes fallback to `dist/index.html` (SPA routing support).

## npm scripts

- `npm run dev`: start server with `tsx` for development.
- `npm run build`: compile frontend bundle with Vite.
- `npm run preview`: preview built frontend with Vite preview server.
- `npm run start`: run `node server.ts` (requires runtime support for TS/ESM as configured in host environment).
- `npm run clean`: remove `dist`.
- `npm run lint`: TypeScript compile check.

## Networking and CORS

Socket.IO CORS is currently configured as:

- origin: `*`
- methods: `GET`, `POST`

For production hardening, restrict allowed origins to your deployment domains.

## Deployment checklist

1. Set environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. Apply database schema in Supabase.
3. Build frontend with `npm run build`.
4. Run server process in production environment.
5. Ensure reverse proxy/web server forwards websocket upgrades.
6. Restrict CORS and review auth/session security settings.

## Observability suggestions

- Add structured logging for socket events and room activity.
- Track error rates for auth and export actions.
- Add uptime/health endpoint to Express for deployment checks.
- Capture board-level analytics (joins, active collaborators, element count).
