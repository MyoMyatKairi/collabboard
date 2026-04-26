# Architecture

## High-level components

- Client app: React SPA served by Vite.
- Application server: Express HTTP server.
- Real-time channel: Socket.IO (server + browser client).
- Auth/data provider: Supabase.

## Frontend architecture

### Routing and session gate

`src/App.tsx` handles:

- Session bootstrap via `supabase.auth.getSession()`.
- Reactive auth updates via `supabase.auth.onAuthStateChange(...)`.
- Route-level protection:
  - `/auth` for unauthenticated users.
  - `/` and `/room/:roomId` only for authenticated users.

### Main pages

- `Auth`: sign-up/sign-in form and auth actions.
- `Landing`: user profile fetch, create room, join room, sign out.
- `Whiteboard`: drawing engine, tools, cursor broadcasting, export, and room interactions.

### Whiteboard state model

The whiteboard keeps state in React:

- `elements`: all drawing entities.
- `selectedId`: selected object.
- `tool`, `color`, `strokeWidth`: active drawing controls.
- `cursors`: remote cursor map keyed by user ID/name.
- `editingId` + `editingText`: inline editing for text/sticky items.

Shared TS interfaces are in `src/types.ts`.

## Real-time event flow

### Server-side (`server.ts`)

- `join-room`: subscribe socket to room channel.
- `draw`: broadcast new element.
- `update`: broadcast element changes.
- `delete`: broadcast element removal.
- `clear`: broadcast board clear.
- `cursor`: broadcast pointer position.

All events are relayed with room scoping via `socket.to(roomId).emit(...)`.

### Client-side (`Whiteboard.tsx`)

- Connects with `io()` and emits `join-room`.
- Subscribes to draw/update/delete/clear/cursor events.
- Applies incoming events into local state reducers.
- Emits events after local user actions.

## Data architecture (current)

- Persisted and active:
  - Supabase auth session and user identity.
  - Supabase `profiles` reads for display.
- Defined in DB but not yet wired to whiteboard UI:
  - `boards`, `participants`, `board_elements` CRUD flow.

This means collaboration is real-time while the server and clients are online, but board element data is not currently loaded/saved from Supabase in the whiteboard component.
