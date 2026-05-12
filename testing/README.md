# Manual testing — CollabBoard

Structured **manual test cases** for QA and release checks. Automated `npm test` only validates that these Markdown files exist and follow the expected structure; it does not drive the browser.

## Prerequisites

- `npm run dev` with valid `.env` (Supabase configured).
- Schema applied: [`supabase/schema.sql`](../supabase/schema.sql).
- **Two browsers** (or profiles) for collaboration tests.
- **Two accounts** for multi-user scenarios (or one account + incognito where allowed).

## Running checks with npm

```bash
npm test        # Vitest: manual-doc checks + real Socket.IO integration tests
npm run test:watch
```

Automated coverage today:

- **Markdown integrity** — every file under `testing/cases/` exists and uses the expected table shape.
- **Socket.IO** — [`tests/socket.integration.test.ts`](../tests/socket.integration.test.ts) spins up an in-memory server with the same handlers as production (`socket-handlers.ts`): join, ban, owner-offline, approve pending, draw relay, kick.

UI, Supabase, and Konva still need **manual** runs using the case docs below (or a future E2E tool such as Playwright).

## Traceability matrix

| Area | File |
|------|------|
| Auth and session | [cases/01-auth-and-session.md](./cases/01-auth-and-session.md) |
| Landing and rooms | [cases/02-landing-rooms.md](./cases/02-landing-rooms.md) |
| Whiteboard tools and UI | [cases/03-whiteboard-tools-and-ui.md](./cases/03-whiteboard-tools-and-ui.md) |
| Realtime / Socket.IO | [cases/04-realtime-socket-collaboration.md](./cases/04-realtime-socket-collaboration.md) |
| Moderation | [cases/05-room-moderation.md](./cases/05-room-moderation.md) |
| Supabase and data | [cases/06-supabase-and-data.md](./cases/06-supabase-and-data.md) |

## Related docs

- Technical handover: [`../docs/README.md`](../docs/README.md)
- Socket events: [`../docs/06-realtime-protocol.md`](../docs/06-realtime-protocol.md)
