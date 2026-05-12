-- ############################################################
-- COLLABBOARD SEED DATA (ROOM ACCESS / MODERATION TESTING)
-- ############################################################
--
-- Usage:
-- 1) Run supabase/schema.sql first.
-- 2) Ensure you have at least 4 users in auth.users (profiles are auto-created by trigger).
-- 3) Run this file in Supabase SQL editor.
--
-- This seed creates:
-- - 1 board with room_code = 'DEMO0001'
-- - owner + editor + viewer + banned participants
-- - sample board presence rows
-- - sample board elements

DO $$
DECLARE
  owner_uuid UUID;
  editor_uuid UUID;
  viewer_uuid UUID;
  banned_uuid UUID;
  demo_board_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  SELECT id INTO owner_uuid FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO editor_uuid FROM public.profiles ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  SELECT id INTO viewer_uuid FROM public.profiles ORDER BY created_at ASC OFFSET 2 LIMIT 1;
  SELECT id INTO banned_uuid FROM public.profiles ORDER BY created_at ASC OFFSET 3 LIMIT 1;

  IF owner_uuid IS NULL OR editor_uuid IS NULL OR viewer_uuid IS NULL OR banned_uuid IS NULL THEN
    RAISE EXCEPTION 'Seed requires at least 4 rows in public.profiles.';
  END IF;

  INSERT INTO public.boards (id, title, owner_id, is_private, room_code, active_users_count, created_at, updated_at)
  VALUES (
    demo_board_id,
    'Demo moderation room',
    owner_uuid,
    false,
    'DEMO0001',
    3,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    title = EXCLUDED.title,
    owner_id = EXCLUDED.owner_id,
    is_private = EXCLUDED.is_private,
    room_code = EXCLUDED.room_code,
    active_users_count = EXCLUDED.active_users_count,
    updated_at = NOW();

  -- Participants (owner row may already exist due to board trigger; upsert keeps it idempotent)
  INSERT INTO public.participants (user_id, board_id, role, joined_at)
  VALUES
    (owner_uuid, demo_board_id, 'owner', NOW()),
    (editor_uuid, demo_board_id, 'editor', NOW()),
    (viewer_uuid, demo_board_id, 'viewer', NOW()),
    (banned_uuid, demo_board_id, 'banned', NOW())
  ON CONFLICT (user_id, board_id) DO UPDATE
  SET role = EXCLUDED.role;

  INSERT INTO public.board_presence (board_id, user_id, last_seen, created_at, updated_at)
  VALUES
    (demo_board_id, owner_uuid, NOW(), NOW(), NOW()),
    (demo_board_id, editor_uuid, NOW(), NOW(), NOW()),
    (demo_board_id, viewer_uuid, NOW(), NOW(), NOW())
  ON CONFLICT (board_id, user_id) DO UPDATE
  SET
    last_seen = EXCLUDED.last_seen,
    updated_at = NOW();

  INSERT INTO public.board_elements (
    id,
    board_id,
    created_by,
    type,
    data,
    position_x,
    position_y,
    width,
    height,
    z_index,
    created_at,
    updated_at
  )
  VALUES
    (
      '22222222-2222-2222-2222-222222222221',
      demo_board_id,
      owner_uuid,
      'shape',
      '{"element":{"id":"seed-rect-1","type":"rect","x":120,"y":120,"width":260,"height":140,"stroke":"#3B82F6","strokeWidth":4}}'::jsonb,
      120,
      120,
      260,
      140,
      1,
      NOW(),
      NOW()
    ),
    (
      '22222222-2222-2222-2222-222222222222',
      demo_board_id,
      editor_uuid,
      'text',
      '{"element":{"id":"seed-text-1","type":"text","x":150,"y":160,"width":220,"height":30,"stroke":"#111827","text":"Owner can kick/ban from People panel"}}'::jsonb,
      150,
      160,
      220,
      30,
      2,
      NOW(),
      NOW()
    ),
    (
      '22222222-2222-2222-2222-222222222223',
      demo_board_id,
      viewer_uuid,
      'note',
      '{"element":{"id":"seed-sticky-1","type":"sticky","x":440,"y":180,"width":180,"height":160,"fill":"#FEF3C7","text":"Viewer is read-only if role checks are enforced in UI"}}'::jsonb,
      440,
      180,
      180,
      160,
      3,
      NOW(),
      NOW()
    )
  ON CONFLICT (id) DO UPDATE
  SET
    data = EXCLUDED.data,
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    z_index = EXCLUDED.z_index,
    updated_at = NOW();
END $$;
