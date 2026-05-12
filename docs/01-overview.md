# Overview

## What CollabBoard is

CollabBoard is a web application for **real-time collaborative whiteboarding**: multiple signed-in users can share a room, see cursors, draw with tools (pen, shapes, text, sticky notes, eraser), and export the canvas. **Authentication and room metadata** are backed by **Supabase** (Auth + Postgres). **Live strokes and cursor positions** are synchronized over **Socket.IO** while clients are connected.

## Tech stack

| Layer | Technology |
|--------|------------|
| UI | React 19, TypeScript, Tailwind CSS 4, Konva / react-konva |
| Build | Vite 6 |
| App server | Express (`server.ts`), same process as Socket.IO |
| Realtime | socket.io + socket.io-client |
| Data / auth | Supabase JS client (`@supabase/supabase-js`) |
| Other | sonner (toasts), motion, lucide-react, nanoid, html2canvas, jspdf |

## Repository map

| Path | Role |
|------|------|
| `server.ts` | HTTP server, Vite middleware (dev) or static `dist` (prod), Socket.IO room logic |
| `src/main.tsx`, `src/App.tsx` | React bootstrap, router, auth gate |
| `src/components/Auth.tsx` | Sign up / sign in |
| `src/components/Landing.tsx` | Profile, create/join board by `room_code`, recent rooms |
| `src/components/Whiteboard.tsx` | Canvas, tools, Socket.IO client, Supabase load/save hooks |
| `src/lib/supabase.ts` | Supabase client (optional if env missing) |
| `src/types.ts` | Shared TS types for elements, roster, cursors |
| `supabase/schema.sql` | Database DDL, RLS, triggers |
| `supabase/seed.sql` | Optional seed data |

## Non-goals / unused pieces

- **`@google/genai`** is listed in `package.json` but **not imported** in application source. `vite.config.ts` defines `process.env.GEMINI_API_KEY` for possible future use.
- **`npm run preview`** runs Vite’s preview server separately from `server.ts`; day-to-day dev uses `npm run dev` (Express + Vite middleware on port 3000).
