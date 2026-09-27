-- Video sessions are separate from telehealth_sessions and from the
-- shared booking tables. Readiness rooms never reference an appointment.
-- The provider column is service-role only so clients cannot read it.

begin;

create table if not exists public.video_sessions (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid references public.users(id) on delete set null,
  session_type      text not null check (session_type in ('readiness', 'consultation')),
  room_name         text not null,
  appointment_ref   text,
  appointment_id    uuid references public.appointments(id) on delete set null,
  provider          text check (provider in ('tabcom', 'livekit', 'meet')),
  status            text not null default 'started',
  quality_score     numeric,
  readiness_outcome text check (readiness_outcome in ('ready', 'usable', 'poor')),
  latency_ms        integer,
  jitter_ms         numeric,
  packet_loss       numeric,
  network_type      text,
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  ended_at          timestamptz,
  updated_at        timestamptz not null default now()
);

create table if not exists public.video_session_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.video_sessions(id) on delete cascade,
  event       text not null check (event in (
    'readiness_started',
    'quality_passed',
    'quality_failed',
    'session_provisioned',
    'joined',
    'ended'
  )),
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_video_sessions_patient
  on public.video_sessions (patient_id, created_at desc);
create index if not exists idx_video_sessions_room
  on public.video_sessions (room_name);
create index if not exists idx_video_sessions_appointment_ref
  on public.video_sessions (appointment_ref);
create index if not exists idx_video_session_events_session
  on public.video_session_events (session_id, created_at);

alter table public.video_sessions enable row level security;
alter table public.video_session_events enable row level security;

revoke all on public.video_sessions from anon, authenticated;
revoke all on public.video_session_events from anon, authenticated;

commit;
