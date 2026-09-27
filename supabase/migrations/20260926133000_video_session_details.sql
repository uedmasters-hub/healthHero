-- Extra readiness measurements stay on the session row.
-- Coordinates are never stored.

alter table public.video_sessions
  add column if not exists details jsonb;

revoke all on public.video_sessions from anon, authenticated;
