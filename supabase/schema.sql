-- ############################################################
-- COLLABORATIVE WHITEBOARD DATABASE SCHEMA
-- ############################################################

-- 1. EXTENSIONS
-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- PROFILES: Public user information linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'online',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOARDS: Whiteboard rooms
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT TRUE,
  room_code TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  active_users_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE boards
ADD COLUMN IF NOT EXISTS active_users_count INTEGER NOT NULL DEFAULT 0;

-- PARTICIPANTS: Board membership and roles
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);

-- BOARD_ELEMENTS: Whiteboard objects (strokes, shapes, text, etc.)
CREATE TABLE IF NOT EXISTS board_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('stroke', 'shape', 'note', 'text', 'image')),
  data JSONB NOT NULL,
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  width NUMERIC,
  height NUMERIC,
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOARD_PRESENCE: Active users currently online in a board
CREATE TABLE IF NOT EXISTS board_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_participants_board_id ON participants(board_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_board_elements_board_id ON board_elements(board_id);
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_boards_room_code ON boards(room_code);
CREATE INDEX IF NOT EXISTS idx_board_presence_board_id ON board_presence(board_id);
CREATE INDEX IF NOT EXISTS idx_board_presence_last_seen ON board_presence(last_seen);

-- 4. FUNCTIONS & TRIGGERS

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_boards_updated_at ON boards;
CREATE TRIGGER tr_boards_updated_at BEFORE UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_board_elements_updated_at ON board_elements;
CREATE TRIGGER tr_board_elements_updated_at BEFORE UPDATE ON board_elements FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_board_presence_updated_at ON board_presence;
CREATE TRIGGER tr_board_presence_updated_at BEFORE UPDATE ON board_presence FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to automatically add board owner as participant
CREATE OR REPLACE FUNCTION handle_new_board_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO participants (user_id, board_id, role)
  VALUES (NEW.owner_id, NEW.id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-adding owner
DROP TRIGGER IF EXISTS tr_boards_auto_participant ON boards;
CREATE TRIGGER tr_boards_auto_participant 
AFTER INSERT ON boards 
FOR EACH ROW EXECUTE FUNCTION handle_new_board_owner();

-- Function to automatically create a profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id, 
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::text, 1, 4), 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Presence counters for board online users
CREATE OR REPLACE FUNCTION public.board_presence_join(target_room_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE boards
  SET active_users_count = active_users_count + 1,
      updated_at = NOW()
  WHERE room_code = target_room_code
    AND (owner_id = auth.uid() OR is_private = false)
  RETURNING active_users_count INTO current_count;

  IF current_count IS NULL THEN
    RAISE EXCEPTION 'Board not found or not accessible';
  END IF;

  RETURN current_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.board_presence_leave(target_room_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE boards
  SET active_users_count = GREATEST(active_users_count - 1, 0),
      updated_at = NOW()
  WHERE room_code = target_room_code
    AND (owner_id = auth.uid() OR is_private = false)
  RETURNING active_users_count INTO current_count;

  IF current_count IS NULL THEN
    RAISE EXCEPTION 'Board not found or not accessible';
  END IF;

  RETURN current_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.board_presence_join(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.board_presence_leave(TEXT) TO authenticated;

-- 5. ROW LEVEL SECURITY (RLS)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_presence ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- BOARDS POLICIES
DROP POLICY IF EXISTS "Owners can insert boards" ON boards;
CREATE POLICY "Owners can insert boards" ON boards FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their boards" ON boards;
CREATE POLICY "Owners can update their boards" ON boards FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their boards" ON boards;
CREATE POLICY "Owners can delete their boards" ON boards FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Participants can view boards" ON boards;
CREATE POLICY "Participants can view boards" ON boards FOR SELECT USING (
  boards.owner_id = auth.uid() OR boards.is_private = false
);

-- PARTICIPANTS POLICIES
DROP POLICY IF EXISTS "Participants can view other participants of same board" ON participants;
CREATE POLICY "Participants can view other participants of same board" ON participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = participants.board_id
    AND (boards.owner_id = auth.uid() OR boards.is_private = false)
  )
);

DROP POLICY IF EXISTS "Owners can manage participants" ON participants;
CREATE POLICY "Owners can manage participants" ON participants FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM boards 
    WHERE boards.id = participants.board_id 
    AND boards.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can delete participants" ON participants;
CREATE POLICY "Owners can delete participants" ON participants FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = participants.board_id
    AND boards.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can insert participants" ON participants;
CREATE POLICY "Owners can insert participants" ON participants FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = participants.board_id
    AND boards.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can join public boards" ON participants;
CREATE POLICY "Users can join public boards" ON participants FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = participants.board_id
    AND boards.is_private = false
  )
);

-- BOARD_ELEMENTS POLICIES
DROP POLICY IF EXISTS "Participants can view elements" ON board_elements;
CREATE POLICY "Participants can view elements" ON board_elements FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM participants 
    WHERE participants.board_id = board_elements.board_id 
    AND participants.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Participants can insert elements" ON board_elements;
CREATE POLICY "Participants can insert elements" ON board_elements FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM participants 
    WHERE participants.board_id = board_elements.board_id 
    AND participants.user_id = auth.uid()
    AND participants.role IN ('owner', 'editor')
  )
);

DROP POLICY IF EXISTS "Creators or owners can update elements" ON board_elements;
CREATE POLICY "Creators or owners can update elements" ON board_elements FOR UPDATE USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM boards 
    WHERE boards.id = board_elements.board_id 
    AND boards.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Creators or owners can delete elements" ON board_elements;
CREATE POLICY "Creators or owners can delete elements" ON board_elements FOR DELETE USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM boards 
    WHERE boards.id = board_elements.board_id 
    AND boards.owner_id = auth.uid()
  )
);

-- BOARD_PRESENCE POLICIES
DROP POLICY IF EXISTS "Users can view board presence" ON board_presence;
CREATE POLICY "Users can view board presence" ON board_presence FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = board_presence.board_id
    AND (boards.owner_id = auth.uid() OR boards.is_private = false)
  )
);

DROP POLICY IF EXISTS "Users can upsert own board presence" ON board_presence;
CREATE POLICY "Users can upsert own board presence" ON board_presence FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = board_presence.board_id
    AND (boards.owner_id = auth.uid() OR boards.is_private = false)
  )
);

DROP POLICY IF EXISTS "Users can update own board presence" ON board_presence;
CREATE POLICY "Users can update own board presence" ON board_presence FOR UPDATE USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can delete own board presence" ON board_presence;
CREATE POLICY "Users can delete own board presence" ON board_presence FOR DELETE USING (
  user_id = auth.uid()
);

-- ############################################################
-- ROOM ACCESS: banned role + policies (migration)
-- ############################################################

ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_role_check;
ALTER TABLE participants ADD CONSTRAINT participants_role_check
  CHECK (role IN ('owner', 'editor', 'viewer', 'banned'));

-- Users can always read their own participant row (e.g. detect banned status)
DROP POLICY IF EXISTS "Users can view own participant row" ON participants;
CREATE POLICY "Users can view own participant row" ON participants FOR SELECT USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can join public boards" ON participants;
CREATE POLICY "Users can join public boards" ON participants FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM boards
    WHERE boards.id = participants.board_id
    AND boards.is_private = false
  )
);