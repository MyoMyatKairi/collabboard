# Realtime protocol (Socket.IO)

The server is [`server.ts`](../server.ts). The browser client connects with `io()` (same origin as the page). Room channel name equals the **route room id** (`boards.room_code` string), referred to as `roomId` in payloads.

## Client → server (`socket.on` handlers)

| Event | Payload (summary) | Behavior |
|-------|-------------------|----------|
| `request-join` | `roomId`, `userId`, `userName`, `ownerUserId`, `isOwner`, `isApprovedMember`, `isBanned`, `participantRole?` | Admission logic: may emit `join-denied`, `join-pending`, or admit and emit `joined`. |
| `decide-join` | `roomId`, `targetSocketId`, `decision` (`approve` \| `reject`) | Owner only: approve adds pending user as `editor`, reject emits `join-denied` (`rejected`). |
| `kick` | `roomId`, `targetSocketId` | Owner only: target leaves room, receives `kicked`. |
| `ban` | `roomId`, `targetSocketId` | Owner only: target leaves room, receives `banned`. |
| `drawing-start` | `{ roomId }` | Admitted user sets `drawing: true`; others get `drawing-state`. |
| `drawing-end` | `{ roomId }` | Admitted user sets `drawing: false`. |
| `draw` | `{ roomId, element }` | Broadcast `draw` with `element` to others in room. |
| `update` | `{ roomId, elementId, updates }` | Broadcast `update` to others. |
| `delete` | `{ roomId, elementId }` | Broadcast `delete` to others. |
| `clear` | `roomId` | Broadcast `clear` to others. |
| `cursor` | `{ roomId, cursor }` | Broadcast `cursor` to others. |

`request-join` requires `roomId` and `ownerUserId`. Other guards:

- **`isBanned`** → `join-denied` `{ reason: "banned" }`.
- **Owner path** (`isOwner` and `userId === ownerUserId`) → admit as `owner` if not full.
- **Approved member** (`isApprovedMember`) → admit with role from `participantRole` / owner rules if not full.
- **Else** (guest / not in `participants`): requires an **owner socket currently online** in that room; else `join-denied` `{ reason: "owner-offline" }`. May enqueue **`pending`** and emit `join-pending` to requester; owners receive `pending-requests` list.
- **Room full** (`online.size >= 5`) → `join-denied` `{ reason: "room-full" }`.

On **disconnect**, if the leaving socket was the owner, pending waiters receive `owner-left` and pending map is cleared.

## Server → client (`emit` patterns)

| Event | When |
|-------|------|
| `joined` | Socket admitted to room. |
| `join-pending` | Waiting for owner approval. |
| `join-denied` | `{ reason }` — `banned`, `room-full`, `owner-offline`, `rejected`. |
| `owner-left` | Owner disconnected while user was pending. |
| `pending-requests` | To owner sockets: list of `{ socketId, userId, name }`. |
| `room-roster` | To room: list of `{ socketId, userId, name, role, drawing }`. |
| `drawing-state` | To room: users currently drawing `{ userId, name }[]`. |
| `kicked` / `banned` | To removed socket. |
| `draw` | New element from peer. |
| `update` | `{ elementId, updates }` from peer. |
| `delete` | `{ elementId }` from peer. |
| `clear` | Board cleared by peer. |
| `cursor` | Remote pointer payload from peer. |

## Client implementation

Handlers are wired in [`src/components/Whiteboard.tsx`](../src/components/Whiteboard.tsx) (`request-join` is sent after `connect` once board metadata and `boardOwnerId` are known).
