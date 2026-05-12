# Database and Supabase

## Schema source

Apply [`supabase/schema.sql`](../supabase/schema.sql) in the Supabase SQL editor. Optional sample data: [`supabase/seed.sql`](../supabase/seed.sql).

## Main tables

| Table | Purpose |
|-------|---------|
| `profiles` | Public profile row per `auth.users` (username, full_name, avatar, etc.) |
| `boards` | Whiteboard room: title, `owner_id`, `room_code` (short join code), flags, timestamps |
| `participants` | Membership: `user_id`, `board_id`, `role` (`owner`, `editor`, `viewer`, or `banned`) |
| `board_elements` | Persisted canvas objects (`type`, `data` JSONB, geometry columns) |
| `board_presence` | Last-seen heartbeat per user per board (used for “online” counts on landing) |

Indexes and `updated_at` triggers are defined in the schema file.

## Security (RLS)

Row Level Security is enabled on domain tables. Policies generally:

- Restrict reads/writes to relevant users (e.g. board participants, owners).
- Expose profiles with appropriate read rules.

Review the policy section in [`supabase/schema.sql`](../supabase/schema.sql) before production.

## App integration (current)

The app **does** use Supabase for more than auth:

- **Auth** — Sign up, sign in, sign out (`Auth.tsx`, `App.tsx`).
- **Landing** — `profiles`, `boards`, `participants`, `board_presence` counts (`Landing.tsx`).
- **Whiteboard** — Loads board by `room_code`, reads `participants.role`, hydrates `board_elements`, upserts `participants` after owner-approved join, updates `board_presence`, debounced save of elements and `boards.updated_at`, clear-board may delete/insert elements (`Whiteboard.tsx`).

Realtime collaboration still depends on **Socket.IO** for low-latency draw/cursor; Supabase provides **persistence** and **authorization** context for who may join and what is stored.

## Auth configuration

For local testing, consider disabling email confirmation (Supabase Dashboard → Authentication → Providers → Email) so new users can sign in immediately.
