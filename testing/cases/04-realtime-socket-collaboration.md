# 04 — Realtime (Socket.IO) collaboration

Use **two browsers** (A and B) with **different users** unless noted. Cap: **5** admitted users per room (`MAX_ROOM_USERS` in `server.ts`).

## RT-001 — Owner joins immediately

| Field | Content |
|-------|---------|
| **ID** | RT-001 |
| **Preconditions** | User A is board owner; A opens `/room/{code}` |
| **Steps** | Wait for loading; observe no permanent “pending” wait screen. |
| **Expected** | A admitted; canvas interactive; socket connected. |

## RT-002 — Approved member joins immediately

| Field | Content |
|-------|---------|
| **ID** | RT-002 |
| **Preconditions** | User B in `participants` as editor/viewer for board |
| **Steps** | B opens same room. |
| **Expected** | B admitted without owner approval flow. |

## RT-003 — Guest pending until owner approves

| Field | Content |
|-------|---------|
| **ID** | RT-003 |
| **Preconditions** | User B **not** in `participants`; owner A online in room |
| **Steps** | B opens room. |
| **Expected** | B sees pending/wait state; A sees pending request; after A approves, B admitted. |

## RT-004 — join-denied: owner offline

| Field | Content |
|-------|---------|
| **ID** | RT-004 |
| **Preconditions** | No owner socket in room; B is guest |
| **Steps** | B opens room. |
| **Expected** | Denied with `owner-offline` (wait screen / message). |

## RT-005 — join-denied: room full

| Field | Content |
|-------|---------|
| **ID** | RT-005 |
| **Preconditions** | Five users already admitted |
| **Steps** | Sixth user attempts join. |
| **Expected** | `room-full` denial. |

## RT-006 — join-denied: banned

| Field | Content |
|-------|---------|
| **ID** | RT-006 |
| **Preconditions** | Socket payload marks banned (DB role banned) |
| **Steps** | User opens room. |
| **Expected** | `banned` denial before or at socket layer. |

## RT-007 — Draw sync

| Field | Content |
|-------|---------|
| **ID** | RT-007 |
| **Preconditions** | A and B both admitted |
| **Steps** | A draws pen stroke. |
| **Expected** | B sees new element appear. |

## RT-008 — Update sync

| Field | Content |
|-------|---------|
| **ID** | RT-008 |
| **Preconditions** | Shared element id visible to both |
| **Steps** | A moves or edits element. |
| **Expected** | B sees update. |

## RT-009 — Delete sync

| Field | Content |
|-------|---------|
| **ID** | RT-009 |
| **Preconditions** | Shared element |
| **Steps** | A deletes element. |
| **Expected** | B sees removal. |

## RT-010 — Clear sync

| Field | Content |
|-------|---------|
| **ID** | RT-010 |
| **Preconditions** | Multiple elements |
| **Steps** | A clears board. |
| **Expected** | B’s canvas clears. |

## RT-011 — Cursor broadcast

| Field | Content |
|-------|---------|
| **ID** | RT-011 |
| **Preconditions** | A and B admitted |
| **Steps** | Move pointer on A’s canvas. |
| **Expected** | B sees remote cursor/label for A. |

## RT-012 — Drawing state indicator

| Field | Content |
|-------|---------|
| **ID** | RT-012 |
| **Preconditions** | Two users admitted |
| **Steps** | A starts drawing (mousedown drag). |
| **Expected** | UI shows A in “drawing” state on B if implemented (`drawing-state` event). |

## RT-013 — Disconnect and reconnect

| Field | Content |
|-------|---------|
| **ID** | RT-013 |
| **Preconditions** | User in room |
| **Steps** | Refresh page. |
| **Expected** | Reconnects; re-issues join; roster/drawing state recover. |

## RT-014 — Owner left while pending

| Field | Content |
|-------|---------|
| **ID** | RT-014 |
| **Preconditions** | B pending; A owner |
| **Steps** | A closes tab or disconnects. |
| **Expected** | B receives `owner-left` style handling. |
