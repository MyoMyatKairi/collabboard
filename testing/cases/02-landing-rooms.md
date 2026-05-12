# 02 — Landing and rooms

## LAND-001 — Profile welcome block

| Field | Content |
|-------|---------|
| **ID** | LAND-001 |
| **Preconditions** | Signed in; `profiles` row exists for user |
| **Steps** | Open `/` after login. |
| **Expected** | Welcome area shows name from profile or email fallback; loading spinner then content. |

## LAND-002 — Create new room

| Field | Content |
|-------|---------|
| **ID** | LAND-002 |
| **Preconditions** | Signed in |
| **Steps** | Click “Create New Room”. |
| **Expected** | New `boards` row; navigation to `/room/{room_code}`; no error toast. |

## LAND-003 — Join room with valid code

| Field | Content |
|-------|---------|
| **ID** | LAND-003 |
| **Preconditions** | Known `room_code` from an existing board |
| **Steps** | Enter code in join field; submit. |
| **Expected** | Navigate to `/room/{code}`. |

## LAND-004 — Join room with invalid code

| Field | Content |
|-------|---------|
| **ID** | LAND-004 |
| **Preconditions** | Signed in |
| **Steps** | Enter non-existent code; submit. |
| **Expected** | Error toast “Room not found” (or equivalent); stay on Landing. |

## LAND-005 — Join room when banned

| Field | Content |
|-------|---------|
| **ID** | LAND-005 |
| **Preconditions** | User has `participants.role = banned` for target board |
| **Steps** | Enter that board’s `room_code`; submit. |
| **Expected** | Error toast about banned; no navigation to room. |

## LAND-006 — Recent rooms list

| Field | Content |
|-------|---------|
| **ID** | LAND-006 |
| **Preconditions** | User owns or participates in at least one board |
| **Steps** | Open `/`. |
| **Expected** | “Recent Rooms” lists boards with title, code, online count; click navigates to room. |

## LAND-007 — Empty recent rooms

| Field | Content |
|-------|---------|
| **ID** | LAND-007 |
| **Preconditions** | New user with no boards/participations |
| **Steps** | Open `/`. |
| **Expected** | Message indicating no saved rooms; create/join still work. |

## LAND-008 — Join input validation

| Field | Content |
|-------|---------|
| **ID** | LAND-008 |
| **Preconditions** | Signed in |
| **Steps** | Submit join form with empty input. |
| **Expected** | Error toast asking for room ID. |
