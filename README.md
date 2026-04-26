# CollabBoard - Online Collaborative Whiteboard

A modern, real-time collaborative whiteboard application built with React, Supabase, and Konva.

## 🚀 Features

- **Real-time Collaboration**: See other users' cursors and drawings instantly.
- **Rich Drawing Tools**:
  - Freehand drawing (Pen)
  - Shapes: Rectangles, Circles, Arrows, and Lines
  - Text elements
  - Sticky Notes with double-click editing
- **User Authentication**: Secure Sign Up and Sign In powered by Supabase Auth.
- **Responsive Design**: Optimized for both Desktop (floating vertical toolbar) and Mobile (bottom horizontal toolbar).
- **Export Options**: Save your work as high-quality PNG images or PDF documents.
- **Room System**: Create private rooms or join existing ones via unique Room IDs.
- **Participant Tracking**: See who else is online in your current room.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS 4
- **Canvas Engine**: Konva / React-Konva
- **Backend/Database**: Supabase (Auth, PostgreSQL, RLS)
- **Real-time**: Socket.io
- **Animations**: Framer Motion
- **Icons**: Lucide React

## 📋 Prerequisites

Before running the project, you need:
- A [Supabase](https://supabase.com/) account and project.
- Node.js installed on your machine.

## ⚙️ Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Schema
Run the contents of `supabase-schema.sql` (found in this repository) in your Supabase SQL Editor. This will set up:
- `profiles`, `boards`, `participants`, and `board_elements` tables.
- Row Level Security (RLS) policies.
- Triggers for automatic profile creation and board owner assignment.

### 3. Supabase Configuration
In your Supabase Dashboard:
- Go to **Authentication > Providers > Email**.
- Disable **Confirm email** if you want users to be able to sign in immediately after signing up.

### 4. Installation
```bash
npm install
```

### 5. Running the App
```bash
npm run dev
```

## 📂 Project Structure

- `src/components/`: UI components (Auth, Landing, Whiteboard).
- `src/lib/`: Utility functions and Supabase client initialization.
- `src/types.ts`: TypeScript interfaces and enums.
- `supabase-schema.sql`: Database migration script.
- `supabase-seed.sql`: Sample data for testing.

## 📄 License

MIT
