# Database and Supabase

## Schema file

Main schema: `supabase-schema.sql`

The schema defines:

- `profiles`: user profile metadata mapped to `auth.users`.
- `boards`: collaborative board records and room code.
- `participants`: board membership and role (`owner`, `editor`, `viewer`).
- `board_elements`: persisted whiteboard object payloads (`data` JSONB).

## Triggers and functions

The schema includes:

- `handle_updated_at`: auto-updates `updated_at`.
- `handle_new_board_owner`: adds board owner to `participants`.
- `handle_new_user`: auto-creates profile entry after auth signup.

## Security model (RLS)

RLS is enabled on all domain tables.

Policy intent:

- Profiles are publicly readable; users can modify only their own profile.
- Boards are visible to participants and manageable by owners.
- Participants table visibility is restricted to users in same board.
- Board elements are accessible based on board membership and role.

## Seed and example SQL

- `supabase-seed.sql`: commented seed blocks with placeholder user IDs.
- `supabase-examples.sql`: example inserts and select queries.

Both files are meant as references and require replacing placeholder UUIDs.

## Integration status in app code

- Implemented:
  - Supabase client creation from env vars.
  - Authentication actions (signup/signin/signout).
  - Profile fetches in landing/whiteboard views.
- Not implemented yet:
  - Persisting whiteboard elements to `board_elements`.
  - Managing board membership in `participants`.
  - Loading room state from `boards` and related records.

## Recommended next persistence milestones

1. Map `roomId` route to `boards.room_code`.
2. Resolve active board and insert participant row on join.
3. Save element create/update/delete operations into `board_elements`.
4. Hydrate board on load by querying `board_elements`.
5. Reconcile Socket.IO events with DB writes for durability.
