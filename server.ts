import express from "express";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;
  const roomParticipants = new Map<string, Map<string, { id: string; name: string }>>();

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-room", (payload: string | { roomId: string; userName?: string; userId?: string }) => {
      const roomId = typeof payload === "string" ? payload : payload?.roomId;
      const userName = typeof payload === "string" ? undefined : payload?.userName;
      const userId = typeof payload === "string" ? undefined : payload?.userId;
      if (!roomId) return;
      socket.join(roomId);
      const room = roomParticipants.get(roomId) ?? new Map<string, { id: string; name: string }>();
      room.set(socket.id, { id: userId || socket.id, name: userName || "Guest" });
      roomParticipants.set(roomId, room);
      io.to(roomId).emit("participants", Array.from(room.values()));
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    socket.on("draw", ({ roomId, element }) => {
      socket.to(roomId).emit("draw", element);
    });

    socket.on("update", ({ roomId, elementId, updates }) => {
      socket.to(roomId).emit("update", { elementId, updates });
    });

    socket.on("delete", ({ roomId, elementId }) => {
      socket.to(roomId).emit("delete", { elementId });
    });

    socket.on("clear", (roomId) => {
      socket.to(roomId).emit("clear");
    });

    socket.on("cursor", ({ roomId, cursor }) => {
      socket.to(roomId).emit("cursor", cursor);
    });

    socket.on("disconnect", () => {
      roomParticipants.forEach((participants, roomId) => {
        if (participants.delete(socket.id)) {
          io.to(roomId).emit("participants", Array.from(participants.values()));
        }
        if (participants.size === 0) {
          roomParticipants.delete(roomId);
        }
      });
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
