# 06 — Supabase and data

## DB-001 — Schema applied

| Field | Content |
|-------|---------|
| **ID** | DB-001 |
| **Preconditions** | Fresh Supabase project |
| **Steps** | Run [`supabase/schema.sql`](../../supabase/schema.sql) in SQL editor. |
| **Expected** | Tables exist: `profiles`, `boards`, `participants`, `board_elements`, `board_presence`; no fatal errors. |

## DB-002 — New user profile row

| Field | Content |
|-------|---------|
| **ID** | DB-002 |
| **Preconditions** | Trigger `handle_new_user` in schema |
| **Steps** | Sign up new user; query `profiles` for `id = auth user id`. |
| **Expected** | Row created with username / metadata per trigger. |

## DB-003 — Board row on create

| Field | Content |
|-------|---------|
| **ID** | DB-003 |
| **Preconditions** | Signed-in user |
| **Steps** | Create room from Landing. |
| **Expected** | `boards` has new row with `room_code`, `owner_id`. |

## DB-004 — Board elements persist

| Field | Content |
|-------|---------|
| **ID** | DB-004 |
| **Preconditions** | Admitted to whiteboard |
| **Steps** | Draw elements; wait for debounced save; refresh page. |
| **Expected** | Elements reload from `board_elements` (hydration). |

## DB-005 — Presence heartbeat

| Field | Content |
|-------|---------|
| **ID** | DB-005 |
| **Preconditions** | User in room |
| **Steps** | Stay in room; inspect `board_presence` for `board_id` + `user_id`. |
| **Expected** | `last_seen` updates periodically. |

## DB-006 — Participant role banned in DB

| Field | Content |
|-------|---------|
| **ID** | DB-006 |
| **Preconditions** | SQL or app set `participants.role = banned` |
| **Steps** | User tries Landing join and direct `/room` URL. |
| **Expected** | Blocked with banned messaging. |

## DB-007 — Seed script (optional)

| Field | Content |
|-------|---------|
| **ID** | DB-007 |
| **Preconditions** | Dev database |
| **Steps** | Run [`supabase/seed.sql`](../../supabase/seed.sql) after editing placeholders if required. |
| **Expected** | Sample data appears; app can use seeded boards if IDs/codes valid. |

## DB-008 — RLS: other user cannot read arbitrary board

| Field | Content |
|-------|---------|
| **ID** | DB-008 |
| **Preconditions** | Two users; board owned by A only |
| **Steps** | From B’s session, use Supabase client or REST with anon key to read A’s private board rows (if applicable). |
| **Expected** | RLS denies or returns empty per policy design. |
