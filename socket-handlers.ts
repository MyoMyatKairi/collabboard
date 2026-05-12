import type { Server, Socket } from "socket.io";

const MAX_ROOM_USERS = 5;

type RoomRole = "owner" | "editor" | "viewer";

type OnlineUser = {
  userId: string;
  name: string;
  role: RoomRole;
  drawing: boolean;
};

type PendingUser = {
  userId: string;
  name: string;
};

type RoomState = {
  ownerUserId: string;
  online: Map<string, OnlineUser & { socketId: string }>;
  pending: Map<string, PendingUser & { socketId: string }>;
};

export type RequestJoinPayload = {
  roomId: string;
  userId?: string;
  userName?: string;
  ownerUserId: string;
  isOwner: boolean;
  isApprovedMember: boolean;
  isBanned: boolean;
  participantRole?: "owner" | "editor" | "viewer";
};

type DecideJoinPayload = {
  roomId: string;
  targetSocketId: string;
  decision: "approve" | "reject";
};

type KickBanPayload = {
  roomId: string;
  targetSocketId: string;
};

type DrawingPayload = {
  roomId: string;
};

const rooms = new Map<string, RoomState>();

/** Test-only: clear in-memory room state between tests. */
export function resetSocketRoomsForTests(): void {
  rooms.clear();
}

function getOrCreateRoom(roomId: string, ownerUserId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      ownerUserId,
      online: new Map(),
      pending: new Map(),
    };
    rooms.set(roomId, room);
  } else if (room.ownerUserId !== ownerUserId) {
    room.ownerUserId = ownerUserId;
  }
  return room;
}

function isOwnerSocket(room: RoomState, socketId: string): boolean {
  const u = room.online.get(socketId);
  return !!u && u.userId === room.ownerUserId && u.role === "owner";
}

function ownerSockets(io: Server, room: RoomState): Socket[] {
  const ids: string[] = [];
  for (const [sid, u] of room.online) {
    if (u.userId === room.ownerUserId && u.role === "owner") ids.push(sid);
  }
  return ids.map((id) => io.sockets.sockets.get(id)).filter(Boolean) as Socket[];
}

function broadcastRoster(io: Server, roomId: string, room: RoomState) {
  const roster = Array.from(room.online.values()).map((u) => ({
    socketId: u.socketId,
    userId: u.userId,
    name: u.name,
    role: u.role,
    drawing: u.drawing,
  }));
  io.to(roomId).emit("room-roster", roster);
}

function broadcastDrawingState(io: Server, roomId: string, room: RoomState) {
  const drawingUsers = Array.from(room.online.values())
    .filter((u) => u.drawing)
    .map((u) => ({ userId: u.userId, name: u.name }));
  io.to(roomId).emit("drawing-state", drawingUsers);
}

function broadcastPendingToOwners(io: Server, roomId: string, room: RoomState) {
  const requests = Array.from(room.pending.values()).map((p) => ({
    socketId: p.socketId,
    userId: p.userId,
    name: p.name,
  }));
  for (const s of ownerSockets(io, room)) {
    s.emit("pending-requests", requests);
  }
}

function isAdmitted(room: RoomState, socketId: string): boolean {
  return room.online.has(socketId);
}

function admitUser(
  io: Server,
  socket: Socket,
  roomId: string,
  room: RoomState,
  userId: string,
  name: string,
  role: RoomRole
) {
  socket.join(roomId);
  const entry: OnlineUser & { socketId: string } = {
    socketId: socket.id,
    userId,
    name: name || "Guest",
    role,
    drawing: false,
  };
  room.online.set(socket.id, entry);
  broadcastRoster(io, roomId, room);
  broadcastDrawingState(io, roomId, room);
  socket.emit("joined");
}

function cleanupEmptyRoom(roomId: string, room: RoomState) {
  if (room.online.size === 0 && room.pending.size === 0) {
    rooms.delete(roomId);
  }
}

export function attachSocketHandlers(io: Server): void {
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("request-join", (payload: RequestJoinPayload) => {
      const {
        roomId,
        userId,
        userName,
        ownerUserId,
        isOwner,
        isApprovedMember,
        isBanned,
        participantRole,
      } = payload || ({} as RequestJoinPayload);
      if (!roomId || !ownerUserId) return;

      if (isBanned) {
        socket.emit("join-denied", { reason: "banned" });
        return;
      }

      const room = getOrCreateRoom(roomId, ownerUserId);
      const uid = userId || socket.id;
      const displayName = userName || "Guest";

      if (isOwner && uid === ownerUserId) {
        if (room.online.size >= MAX_ROOM_USERS) {
          socket.emit("join-denied", { reason: "room-full" });
          return;
        }
        admitUser(io, socket, roomId, room, uid, displayName, "owner");
        return;
      }

      if (isApprovedMember) {
        if (room.online.size >= MAX_ROOM_USERS) {
          socket.emit("join-denied", { reason: "room-full" });
          return;
        }
        const role: RoomRole =
          uid === ownerUserId
            ? "owner"
            : participantRole === "viewer"
              ? "viewer"
              : "editor";
        admitUser(io, socket, roomId, room, uid, displayName, role);
        return;
      }

      const ownerOnline = Array.from(room.online.values()).some(
        (u) => u.userId === room.ownerUserId && u.role === "owner"
      );
      if (!ownerOnline) {
        socket.emit("join-denied", { reason: "owner-offline" });
        return;
      }

      if (room.online.size >= MAX_ROOM_USERS) {
        socket.emit("join-denied", { reason: "room-full" });
        return;
      }

      room.pending.set(socket.id, {
        socketId: socket.id,
        userId: uid,
        name: displayName,
      });
      broadcastPendingToOwners(io, roomId, room);
      socket.emit("join-pending");
    });

    socket.on("decide-join", (payload: DecideJoinPayload) => {
      const { roomId, targetSocketId, decision } = payload || ({} as DecideJoinPayload);
      if (!roomId || !targetSocketId || !decision) return;
      const room = rooms.get(roomId);
      if (!room || !isOwnerSocket(room, socket.id)) return;

      const pending = room.pending.get(targetSocketId);
      if (!pending) return;

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!targetSocket) {
        room.pending.delete(targetSocketId);
        broadcastPendingToOwners(io, roomId, room);
        return;
      }

      if (decision === "reject") {
        room.pending.delete(targetSocketId);
        broadcastPendingToOwners(io, roomId, room);
        targetSocket.emit("join-denied", { reason: "rejected" });
        return;
      }

      if (room.online.size >= MAX_ROOM_USERS) {
        room.pending.delete(targetSocketId);
        broadcastPendingToOwners(io, roomId, room);
        targetSocket.emit("join-denied", { reason: "room-full" });
        return;
      }

      room.pending.delete(targetSocketId);
      broadcastPendingToOwners(io, roomId, room);
      admitUser(io, targetSocket, roomId, room, pending.userId, pending.name, "editor");
    });

    socket.on("kick", (payload: KickBanPayload) => {
      const { roomId, targetSocketId } = payload || ({} as KickBanPayload);
      if (!roomId || !targetSocketId) return;
      const room = rooms.get(roomId);
      if (!room || !isOwnerSocket(room, socket.id)) return;

      const target = room.online.get(targetSocketId);
      if (!target || target.userId === room.ownerUserId) return;

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      room.online.delete(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(roomId);
        targetSocket.emit("kicked");
      }
      broadcastRoster(io, roomId, room);
      broadcastDrawingState(io, roomId, room);
      cleanupEmptyRoom(roomId, room);
    });

    socket.on("ban", (payload: KickBanPayload) => {
      const { roomId, targetSocketId } = payload || ({} as KickBanPayload);
      if (!roomId || !targetSocketId) return;
      const room = rooms.get(roomId);
      if (!room || !isOwnerSocket(room, socket.id)) return;

      const target = room.online.get(targetSocketId);
      if (!target || target.userId === room.ownerUserId) return;

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      room.online.delete(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(roomId);
        targetSocket.emit("banned");
      }
      broadcastRoster(io, roomId, room);
      broadcastDrawingState(io, roomId, room);
      cleanupEmptyRoom(roomId, room);
    });

    socket.on("drawing-start", (payload: DrawingPayload) => {
      const { roomId } = payload || ({} as DrawingPayload);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !isAdmitted(room, socket.id)) return;
      const u = room.online.get(socket.id);
      if (!u) return;
      u.drawing = true;
      broadcastDrawingState(io, roomId, room);
    });

    socket.on("drawing-end", (payload: DrawingPayload) => {
      const { roomId } = payload || ({} as DrawingPayload);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !isAdmitted(room, socket.id)) return;
      const u = room.online.get(socket.id);
      if (!u) return;
      u.drawing = false;
      broadcastDrawingState(io, roomId, room);
    });

    socket.on("draw", ({ roomId, element }: { roomId: string; element: unknown }) => {
      const room = rooms.get(roomId);
      if (!room || !isAdmitted(room, socket.id)) return;
      socket.to(roomId).emit("draw", element);
    });

    socket.on("update", ({ roomId, elementId, updates }: { roomId: string; elementId: string; updates: unknown }) => {
      const room = rooms.get(roomId);
      if (!room || !isAdmitted(room, socket.id)) return;
      socket.to(roomId).emit("update", { elementId, updates });
    });

    socket.on("delete", ({ roomId, elementId }: { roomId: string; elementId: string }) => {
      const room = rooms.get(roomId);
      if (!room || !isAdmitted(room, socket.id)) return;
      socket.to(roomId).emit("delete", { elementId });
    });

    socket.on("clear", (roomId: string) => {
      const room = rooms.get(roomId);
      if (!room || !isAdmitted(room, socket.id)) return;
      socket.to(roomId).emit("clear");
    });

    socket.on("cursor", ({ roomId, cursor }: { roomId: string; cursor: unknown }) => {
      const room = rooms.get(roomId);
      if (!room || !isAdmitted(room, socket.id)) return;
      socket.to(roomId).emit("cursor", cursor);
    });

    socket.on("disconnect", () => {
      rooms.forEach((room, roomId) => {
        const wasOwner =
          room.online.get(socket.id)?.userId === room.ownerUserId &&
          room.online.get(socket.id)?.role === "owner";

        if (room.pending.has(socket.id)) {
          room.pending.delete(socket.id);
          broadcastPendingToOwners(io, roomId, room);
        }

        if (room.online.delete(socket.id)) {
          broadcastRoster(io, roomId, room);
          broadcastDrawingState(io, roomId, room);
        }

        if (wasOwner && room.pending.size > 0) {
          for (const [, p] of room.pending) {
            const pendingSock = io.sockets.sockets.get(p.socketId);
            pendingSock?.emit("owner-left");
          }
          room.pending.clear();
          broadcastPendingToOwners(io, roomId, room);
        }

        cleanupEmptyRoom(roomId, room);
      });
      console.log("User disconnected:", socket.id);
    });
  });
}
