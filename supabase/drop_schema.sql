-- =========================================
-- FULL RESET FOR COLLABBOARD (DESTRUCTIVE)
-- =========================================
-- This will:
-- 1) Delete all users from auth.users
-- 2) Drop app triggers/functions
-- 3) Drop app tables (public schema)
-- 4) Optionally remove storage objects/buckets if you use them

begin;

-- -----------------------------------------
-- A) Remove app triggers first
-- -----------------------------------------
drop trigger if exists tr_profiles_updated_at on public.profiles;
drop trigger if exists tr_boards_updated_at on public.boards;
drop trigger if exists tr_board_elements_updated_at on public.board_elements;
drop trigger if exists tr_boards_auto_participant on public.boards;
drop trigger if exists on_auth_user_created on auth.users;

-- -----------------------------------------
-- B) Remove app functions
-- -----------------------------------------
drop function if exists public.handle_updated_at() cascade;
drop function if exists public.handle_new_board_owner() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.board_presence_join(text) cascade;
drop function if exists public.board_presence_leave(text) cascade;

-- -----------------------------------------
-- C) Drop app tables (CASCADE removes RLS policies/indexes)
-- -----------------------------------------
drop table if exists public.board_elements cascade;
drop table if exists public.board_presence cascade;
drop table if exists public.participants cascade;
drop table if exists public.boards cascade;
drop table if exists public.profiles cascade;

-- -----------------------------------------
-- D) Clear Supabase Auth users
-- -----------------------------------------
-- This removes all users from Authentication.
delete from auth.identities;
delete from auth.sessions;
delete from auth.refresh_tokens;
delete from auth.mfa_factors;
delete from auth.mfa_challenges;
delete from auth.mfa_amr_claims;
delete from auth.one_time_tokens;
delete from auth.users;

commit;

-- =========================================
-- OPTIONAL: Reset Storage too (if used)
-- =========================================
-- Run separately if you want to wipe storage:
-- delete from storage.objects;
-- delete from storage.buckets;