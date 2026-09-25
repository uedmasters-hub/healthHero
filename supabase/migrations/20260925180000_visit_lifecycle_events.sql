-- Visit lifecycle extension: visit_active + exception statuses,
-- immutable appointment_events, keep-active / exception / cancel RPCs.

-- ── Enum values (committed separately from usage in PG < 15; safe on 15) ──
do $$ begin
  alter type public.appointment_status add value if not exists 'visit_active';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.appointment_status add value if not exists 'tests_in_progress';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.appointment_status add value if not exists 'paused';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.appointment_status add value if not exists 'reschedule_requested';
exception when duplicate_object then null;
end $$;

-- ── Immutable event timeline (SSOT audit; history retained for legacy) ─────
create table if not exists public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  client_id text,
  event_type text not null,
  from_status text,
  to_status text,
  actor_id uuid references public.users(id),
  actor_role text default 'patient',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists appointment_events_appt_idx
  on public.appointment_events (appointment_id, created_at desc);
create index if not exists appointment_events_client_idx
  on public.appointment_events (client_id, created_at desc);

alter table public.appointment_events enable row level security;

drop policy if exists appointment_events_select_own on public.appointment_events;
create policy appointment_events_select_own
  on public.appointment_events for select
  using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (a.user_id = auth.uid() or a.patient_id = auth.uid())
    )
  );

-- Patients never update/delete events (immutable).
revoke insert, update, delete on public.appointment_events from authenticated, anon;

create or replace function public.append_appointment_event(
  p_appointment_id uuid,
  p_event_type text,
  p_from_status text default null,
  p_to_status text default null,
  p_actor_id uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  eid uuid;
  cid text;
begin
  select client_id into cid from public.appointments where id = p_appointment_id;
  insert into public.appointment_events (
    appointment_id, client_id, event_type, from_status, to_status, actor_id, payload
  ) values (
    p_appointment_id, cid, p_event_type, p_from_status, p_to_status,
    coalesce(p_actor_id, auth.uid()), coalesce(p_payload, '{}'::jsonb)
  ) returning id into eid;

  -- Mirror into legacy history when possible (best-effort).
  begin
    perform public.append_appointment_history(
      p_appointment_id,
      p_event_type,
      nullif(p_from_status, '')::public.appointment_status,
      nullif(p_to_status, '')::public.appointment_status,
      coalesce(p_actor_id, auth.uid()),
      p_payload
    );
  exception when others then
    null;
  end;

  return eid;
end;
$$;

revoke all on function public.append_appointment_event(uuid, text, text, text, uuid, jsonb) from public;
grant execute on function public.append_appointment_event(uuid, text, text, text, uuid, jsonb) to authenticated, service_role;

-- ── Not yet → keep visit_active + 30-minute reminder ───────────────────────
create or replace function public.keep_visit_active(
  p_client_id text,
  p_reminder_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  appt public.appointments%rowtype;
  old_status text;
  reminder timestamptz := coalesce(p_reminder_at, now() + interval '30 minutes');
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select * into appt
  from public.appointments
  where client_id = nullif(trim(p_client_id), '')
    and (user_id = uid or patient_id = uid)
  order by updated_at desc nulls last
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  old_status := appt.status::text;

  -- Idempotent: already visit_active with a future reminder.
  if appt.status::text = 'visit_active'
     and appt.confirmation_snooze_until is not null
     and appt.confirmation_snooze_until > now()
  then
    return jsonb_build_object(
      'ok', true,
      'changed', false,
      'status', appt.status::text,
      'client_id', appt.client_id,
      'appointment_id', appt.id,
      'confirmation_snooze_until', appt.confirmation_snooze_until
    );
  end if;

  if appt.status::text not in (
    'awaiting_completion', 'in_progress', 'visit_active',
    'checked_in', 'confirmed', 'upcoming', 'tests_in_progress', 'paused'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', old_status);
  end if;

  update public.appointments
  set
    status = 'visit_active',
    confirmation_snooze_until = reminder,
    started_at = coalesce(started_at, now()),
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'status', 'visit_active',
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'lifecycle', 'visit_active',
          'confirmationSnoozeUntil', reminder,
          'visitReminderAt', reminder,
          'startedAt', coalesce(client_payload->'meta'->>'startedAt', now()::text)
        )
      )
  where id = appt.id
  returning * into appt;

  perform public.append_appointment_event(
    appt.id,
    'booking.visit_kept_active',
    old_status,
    'visit_active',
    uid,
    jsonb_build_object(
      'source', 'keep_visit_active',
      'reminder_at', reminder
    )
  );

  return jsonb_build_object(
    'ok', true,
    'changed', true,
    'status', appt.status::text,
    'client_id', appt.client_id,
    'appointment_id', appt.id,
    'confirmation_snooze_until', appt.confirmation_snooze_until
  );
end;
$$;

revoke all on function public.keep_visit_active(text, timestamptz) from public;
grant execute on function public.keep_visit_active(text, timestamptz) to authenticated;

-- Back-compat: "Not yet" snooze now keeps the visit active for 30 minutes.
create or replace function public.snooze_visit_confirmation(
  p_client_id text,
  p_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.keep_visit_active(p_client_id, coalesce(p_until, now() + interval '30 minutes'));
end;
$$;

-- ── Exception state transitions ────────────────────────────────────────────
create or replace function public.set_visit_exception(
  p_client_id text,
  p_to_status text,
  p_reason text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  appt public.appointments%rowtype;
  old_status text;
  allowed text[] := array[
    'tests_in_progress', 'paused', 'reschedule_requested', 'visit_active', 'awaiting_completion'
  ];
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  if p_to_status is null or not (p_to_status = any (allowed)) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_target');
  end if;

  select * into appt
  from public.appointments
  where client_id = nullif(trim(p_client_id), '')
    and (user_id = uid or patient_id = uid)
  order by updated_at desc nulls last
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  old_status := appt.status::text;

  if old_status = p_to_status then
    return jsonb_build_object(
      'ok', true, 'changed', false, 'status', old_status, 'client_id', appt.client_id
    );
  end if;

  if old_status not in (
    'visit_active', 'in_progress', 'awaiting_completion',
    'tests_in_progress', 'paused', 'checked_in'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', old_status);
  end if;

  update public.appointments
  set
    status = p_to_status::public.appointment_status,
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'status', p_to_status,
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'lifecycle', p_to_status,
          'exceptionReason', nullif(trim(coalesce(p_reason, '')), '')
        )
      )
  where id = appt.id
  returning * into appt;

  perform public.append_appointment_event(
    appt.id,
    'booking.visit_exception',
    old_status,
    p_to_status,
    uid,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
      'source', 'set_visit_exception',
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'ok', true,
    'changed', true,
    'status', appt.status::text,
    'client_id', appt.client_id,
    'appointment_id', appt.id
  );
end;
$$;

revoke all on function public.set_visit_exception(text, text, text, jsonb) from public;
grant execute on function public.set_visit_exception(text, text, text, jsonb) to authenticated;

-- ── Cancel with reason: notify trail, release slot, audit ──────────────────
create or replace function public.cancel_appointment_with_reason(
  p_client_id text,
  p_reason text,
  p_branch text default 'cancel',
  p_note text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  appt public.appointments%rowtype;
  old_status text;
  branch text := coalesce(nullif(trim(p_branch), ''), 'cancel');
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select * into appt
  from public.appointments
  where client_id = nullif(trim(p_client_id), '')
    and (user_id = uid or patient_id = uid)
  order by updated_at desc nulls last
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  old_status := appt.status::text;

  if old_status = 'cancelled' then
    return jsonb_build_object(
      'ok', true, 'changed', false, 'status', 'cancelled', 'client_id', appt.client_id
    );
  end if;

  if old_status in ('completed', 'refunded', 'expired') then
    return jsonb_build_object('ok', false, 'reason', 'terminal', 'status', old_status);
  end if;

  -- Release linked slot if any.
  update public.available_slots
  set is_available = true, appointment_id = null
  where appointment_id = appt.id;

  update public.appointments
  set
    status = case
      when branch = 'reschedule' then 'reschedule_requested'::public.appointment_status
      else 'cancelled'::public.appointment_status
    end,
    cancelled_at = case when branch = 'reschedule' then cancelled_at else now() end,
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'status', case when branch = 'reschedule' then 'reschedule_requested' else 'cancelled' end,
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'cancelReason', nullif(trim(coalesce(p_reason, '')), ''),
          'cancelBranch', branch,
          'cancelNote', nullif(trim(coalesce(p_note, '')), ''),
          'cancelledAt', case when branch = 'reschedule' then client_payload->'meta'->>'cancelledAt' else now()::text end
        )
      )
  where id = appt.id
  returning * into appt;

  perform public.append_appointment_event(
    appt.id,
    case when branch = 'reschedule' then 'booking.reschedule_requested' else 'booking.cancelled' end,
    old_status,
    appt.status::text,
    uid,
    coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
      'source', 'cancel_appointment_with_reason',
      'reason', p_reason,
      'branch', branch,
      'note', p_note,
      'slot_released', true
    )
  );

  -- Provider-facing notification trail (best-effort).
  begin
    insert into public.notifications (
      user_id, title, body, type, data, created_at
    )
    select
      coalesce(
        (select user_id from public.providers where id = appt.provider_id limit 1),
        appt.user_id
      ),
      case when branch = 'reschedule'
        then 'Reschedule requested'
        else 'Appointment cancelled'
      end,
      coalesce(nullif(trim(p_reason), ''), 'Patient updated the visit.'),
      'booking',
      jsonb_build_object(
        'appointment_id', appt.id,
        'client_id', appt.client_id,
        'branch', branch
      ),
      now()
    where exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'notifications');
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'ok', true,
    'changed', true,
    'status', appt.status::text,
    'client_id', appt.client_id,
    'appointment_id', appt.id,
    'branch', branch
  );
end;
$$;

revoke all on function public.cancel_appointment_with_reason(text, text, text, text, jsonb) from public;
grant execute on function public.cancel_appointment_with_reason(text, text, text, text, jsonb) to authenticated;

comment on table public.appointment_events is
  'Immutable appointment lifecycle timeline. Append-only; never update or delete.';
comment on function public.keep_visit_active is
  'Not yet on Visit Check-in: persist visit_active + 30-minute reminder (idempotent).';
