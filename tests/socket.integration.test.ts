import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  attachSocketHandlers,
  resetSocketRoomsForTests,
  type RequestJoinPayload,
} from "../socket-handlers";

const ROOM = "test-room";
const OWNER_ID = "owner-uuid";
const GUEST_ID = "guest-uuid";

let httpServer: ReturnType<typeof createServer>;
let io: Server;
let baseUrl: string;

function connectClient(): ClientSocket {
  return ioc(baseUrl, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });
}

function waitConnected(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("connect timeout")), 5000);
    socket.once("connect", () => {
      clearTimeout(t);
      resolve();
    });
    socket.once("connect_error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

function onceEvent<T>(socket: ClientSocket, event: string, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (data: T) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

describe("Socket.IO room handlers (integration)", () => {
  beforeAll(async () => {
    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: "*" } });
    attachSocketHandlers(io);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
    if (!httpServer.listening) return;
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    resetSocketRoomsForTests();
  });

  afterEach(async () => {
    const clients = await io.fetchSockets();
    for (const s of clients) {
      s.disconnect(true);
    }
  });

  it("owner request-join receives joined", async () => {
    const owner = connectClient();
    await waitConnected(owner);
    const joined = onceEvent(owner, "joined");
    owner.emit("request-join", {
      roomId: ROOM,
      userId: OWNER_ID,
      userName: "Owner",
      ownerUserId: OWNER_ID,
      isOwner: true,
      isApprovedMember: false,
      isBanned: false,
    } satisfies RequestJoinPayload);
    await joined;
    owner.disconnect();
  });

  it("banned user receives join-denied", async () => {
    const s = connectClient();
    await waitConnected(s);
    const denied = onceEvent<{ reason: string }>(s, "join-denied");
    s.emit("request-join", {
      roomId: ROOM,
      userId: GUEST_ID,
      ownerUserId: OWNER_ID,
      isOwner: false,
      isApprovedMember: false,
      isBanned: true,
    } satisfies RequestJoinPayload);
    const { reason } = await denied;
    expect(reason).toBe("banned");
    s.disconnect();
  });

  it("guest receives owner-offline when no owner is in the room", async () => {
    const s = connectClient();
    await waitConnected(s);
    const denied = onceEvent<{ reason: string }>(s, "join-denied");
    s.emit("request-join", {
      roomId: ROOM,
      userId: GUEST_ID,
      ownerUserId: OWNER_ID,
      isOwner: false,
      isApprovedMember: false,
      isBanned: false,
    } satisfies RequestJoinPayload);
    const { reason } = await denied;
    expect(reason).toBe("owner-offline");
    s.disconnect();
  });

  it("pending guest is admitted after owner approves", async () => {
    const owner = connectClient();
    const guest = connectClient();
    await waitConnected(owner);
    await waitConnected(guest);

    owner.emit("request-join", {
      roomId: ROOM,
      userId: OWNER_ID,
      userName: "Owner",
      ownerUserId: OWNER_ID,
      isOwner: true,
      isApprovedMember: false,
      isBanned: false,
    } satisfies RequestJoinPayload);
    await onceEvent(owner, "joined");

    const requestsP = onceEvent<{ socketId: string }[]>(owner, "pending-requests");
    const pendingP = onceEvent(guest, "join-pending");
    guest.emit("request-join", {
      roomId: ROOM,
      userId: GUEST_ID,
      userName: "Guest",
      ownerUserId: OWNER_ID,
      isOwner: false,
      isApprovedMember: false,
      isBanned: false,
    } satisfies RequestJoinPayload);
    await pendingP;
    const pendingList = await requestsP;
    expect(pendingList.some((p) => p.socketId === guest.id)).toBe(true);

    const guestJoined = onceEvent(guest, "joined");
    owner.emit("decide-join", {
      roomId: ROOM,
      targetSocketId: guest.id,
      decision: "approve",
    });
    await guestJoined;

    owner.disconnect();
    guest.disconnect();
  });

  it("relays draw to other admitted member", async () => {
    const a = connectClient();
    const b = connectClient();
    await waitConnected(a);
    await waitConnected(b);

    a.emit("request-join", {
      roomId: ROOM,
      userId: OWNER_ID,
      userName: "Owner",
      ownerUserId: OWNER_ID,
      isOwner: true,
      isApprovedMember: false,
      isBanned: false,
    } satisfies RequestJoinPayload);
    await onceEvent(a, "joined");

    b.emit("request-join", {
      roomId: ROOM,
      userId: GUEST_ID,
      userName: "Editor",
      ownerUserId: OWNER_ID,
      isOwner: false,
      isApprovedMember: true,
      isBanned: false,
      participantRole: "editor",
    } satisfies RequestJoinPayload);
    await onceEvent(b, "joined");

    const drawP = onceEvent<{ id: string }>(b, "draw");
    a.emit("draw", { roomId: ROOM, element: { id: "el-1", type: "pen" } });
    const el = await drawP;
    expect(el.id).toBe("el-1");

    a.disconnect();
    b.disconnect();
  });

  it("owner can kick another member", async () => {
    const owner = connectClient();
    const member = connectClient();
    await waitConnected(owner);
    await waitConnected(member);

    owner.emit("request-join", {
      roomId: ROOM,
      userId: OWNER_ID,
      userName: "Owner",
      ownerUserId: OWNER_ID,
      isOwner: true,
      isApprovedMember: false,
      isBanned: false,
    } satisfies RequestJoinPayload);
    await onceEvent(owner, "joined");

    member.emit("request-join", {
      roomId: ROOM,
      userId: GUEST_ID,
      userName: "Ed",
      ownerUserId: OWNER_ID,
      isOwner: false,
      isApprovedMember: true,
      isBanned: false,
      participantRole: "editor",
    } satisfies RequestJoinPayload);
    await onceEvent(member, "joined");

    const kickedP = onceEvent(member, "kicked");
    owner.emit("kick", { roomId: ROOM, targetSocketId: member.id });
    await kickedP;

    owner.disconnect();
    member.disconnect();
  });
});
