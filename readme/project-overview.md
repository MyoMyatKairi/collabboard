# Project Overview

## What this project is

CollabBoard is a real-time collaborative whiteboard web application where authenticated users can:

- Create or join drawing rooms.
- Draw freehand strokes and geometric shapes.
- Add text and sticky notes.
- Edit, move, transform, and delete elements.
- Share room links and collaborate live.
- Export board content to PNG or PDF.

## Tech Stack

- Frontend: React 19 + TypeScript + Vite
- Styling/UI: Tailwind CSS + Lucide icons + Motion
- Canvas rendering: Konva via React-Konva
- Authentication and data platform: Supabase
- Real-time transport: Socket.IO (Node.js + Express server)

## Repository Layout

- `src/main.tsx`: React app bootstrap.
- `src/App.tsx`: Route and auth-gate entry point.
- `src/components/Auth.tsx`: Sign up and sign in UI flow.
- `src/components/Landing.tsx`: Room creation/join landing screen.
- `src/components/Whiteboard.tsx`: Main board and collaboration logic.
- `src/lib/supabase.ts`: Supabase client initialization.
- `src/types.ts`: Shared whiteboard domain types.
- `server.ts`: Express + Vite middleware + Socket.IO server.
- `supabase-schema.sql`: Database objects and security policies.
- `supabase-seed.sql`: Optional sample seed script.
- `supabase-examples.sql`: Example SQL operations.

## Core User Flow

1. User signs up or signs in from `/auth`.
2. Authenticated user lands on `/`.
3. User creates a room or joins by room ID.
4. User enters `/room/:roomId` and collaborates in real-time.
5. Board content can be exported to image or PDF.

## Current architecture note

The current runtime uses Socket.IO for live sync and local in-memory React state for board elements. Supabase is actively used for authentication and profile reads, while whiteboard element persistence to `boards`/`board_elements` tables is not yet wired in the frontend flow.
