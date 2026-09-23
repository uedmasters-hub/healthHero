-- Appointment lifecycle: awaiting_completion, post-visit window, atomic RPCs.
-- Client remains interactive SSOT; these RPCs persist transitions + audit + notify.

begin;

-- ── Enum: awaiting_completion ───────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'appointment_status'
      and e.enumlabel = 'awaiting_completion'
  ) then
    alter type public.appointment_status add value 'awaiting_completion';
  end if;
end
$$;

commit;

-- ADD VALUE cannot be used in the same transaction as new values in some PG versions.
-- Columns / RPCs run in a fresh transaction after the enum commit.

begin;

alter table public.appointments
  add column if not exists confirmation_snooze_until timestamptz,
  add column if not exists post_visit_until timestamptz;

create index if not exists idx_appointments_post_visit_until
  on public.appointments (post_visit_until)
  where post_visit_until is not null;

create index if not exists idx_appointments_lifecycle_status
  on public.appointments (user_id, status, scheduled_date);

-- ── Helpers ────────────────────────────────────────────────────────────────

create or replace function public.appointment_scheduled_start(appt public.appointments)
returns timestamptz
language sql
immutable
as $$
  select case
    when appt.scheduled_date is null or appt.scheduled_time is null then null
    else (appt.scheduled_date + appt.scheduled_time) at time zone 'UTC'
  end;
$$;

create or replace function public.appointment_scheduled_end(appt public.appointments)
returns timestamptz
language sql
immutable
as $$
  select case
    when public.appointment_scheduled_start(appt) is null then null
    else public.appointment_scheduled_start(appt)
      + make_interval(mins => greatest(coalesce(appt.duration_minutes, 30), 5))
  end;
$$;

create or replace function public.append_appointment_history(
  p_appointment_id uuid,
  p_event_type text,
  p_old_status public.appointment_status,
  p_new_status public.appointment_status,
  p_actor_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.appointment_history (
    appointment_id, event_type, old_status, new_status, actor_id, actor_role, payload
  ) values (
    p_appointment_id,
    p_event_type,
    p_old_status,
    p_new_status,
    p_actor_id,
    'patient',
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.append_appointment_history(uuid, text, public.appointment_status, public.appointment_status, uuid, jsonb) from public;

create or replace function public.notify_lifecycle_users(
  p_patient_id uuid,
  p_provider_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_patient_id is not null then
    insert into public.notifications (user_id, channel, title, body, data, status, sent_at)
    values (
      p_patient_id,
      'in_app',
      p_title,
      p_body,
      coalesce(p_data, '{}'::jsonb),
      'sent',
      now()
    );
  end if;

  if p_provider_user_id is not null and p_provider_user_id is distinct from p_patient_id then
    insert into public.notifications (user_id, channel, title, body, data, status, sent_at)
    values (
      p_provider_user_id,
      'in_app',
      p_title,
      coalesce(p_body, 'A patient confirmed their visit was completed.'),
      coalesce(p_data, '{}'::jsonb) || jsonb_build_object('audience', 'provider'),
      'sent',
      now()
    );
  end if;
end;
$$;

revoke all on function public.notify_lifecycle_users(uuid, uuid, text, text, jsonb) from public;

-- ── advance one appointment by client_id ───────────────────────────────────

create or replace function public.advance_appointment_lifecycle(p_client_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  appt public.appointments%rowtype;
  start_at timestamptz;
  end_at timestamptz;
  old_status public.appointment_status;
  new_status public.appointment_status;
  changed boolean := false;
  event_name text;
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

  old_status := appt.status;
  new_status := appt.status;
  start_at := public.appointment_scheduled_start(appt);
  end_at := public.appointment_scheduled_end(appt);

  if start_at is null then
    return jsonb_build_object(
      'ok', true,
      'changed', false,
      'status', appt.status::text,
      'client_id', appt.client_id,
      'appointment_id', appt.id
    );
  end if;

  -- Terminal statuses are never auto-advanced.
  if appt.status in (
    'completed', 'cancelled', 'no_show', 'expired', 'refunded', 'draft',
    'pending_payment', 'payment_processing', 'rescheduled'
  ) then
    return jsonb_build_object(
      'ok', true,
      'changed', false,
      'status', appt.status::text,
      'client_id', appt.client_id,
      'appointment_id', appt.id
    );
  end if;

  if now() >= end_at + interval '48 hours'
     and appt.status in ('in_progress', 'awaiting_completion', 'confirmed', 'upcoming', 'checked_in')
  then
    new_status := 'no_show';
    event_name := 'booking.no_show';
  elsif now() >= end_at
     and appt.status in ('in_progress', 'confirmed', 'upcoming', 'checked_in')
  then
    new_status := 'awaiting_completion';
    event_name := 'booking.visit_awaiting_confirmation';
  elsif now() >= start_at
     and appt.status in ('confirmed', 'upcoming', 'checked_in')
  then
    new_status := 'in_progress';
    event_name := 'booking.visit_started';
  end if;

  if new_status is distinct from old_status then
    update public.appointments
    set
      status = new_status,
      started_at = case
        when new_status = 'in_progress' then coalesce(started_at, now())
        when new_status in ('awaiting_completion', 'no_show', 'completed') then coalesce(started_at, start_at)
        else started_at
      end,
      completed_at = case when new_status = 'no_show' then coalesce(completed_at, now()) else completed_at end,
      updated_at = now(),
      version = version + 1,
      client_payload = coalesce(client_payload, '{}'::jsonb)
        || jsonb_build_object(
          'status', new_status::text,
          'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
            'updatedAt', now(),
            'startedAt', coalesce(started_at, start_at, now()),
            'completedAt', case when new_status = 'no_show' then now() else client_payload->'meta'->>'completedAt' end
          )
        )
    where id = appt.id
    returning * into appt;

    perform public.append_appointment_history(
      appt.id, event_name, old_status, new_status, uid,
      jsonb_build_object('source', 'advance_appointment_lifecycle')
    );
    changed := true;
  end if;

  return jsonb_build_object(
    'ok', true,
    'changed', changed,
    'status', appt.status::text,
    'client_id', appt.client_id,
    'appointment_id', appt.id,
    'started_at', appt.started_at,
    'completed_at', appt.completed_at,
    'post_visit_until', appt.post_visit_until,
    'confirmation_snooze_until', appt.confirmation_snooze_until
  );
end;
$$;

revoke all on function public.advance_appointment_lifecycle(text) from public;
grant execute on function public.advance_appointment_lifecycle(text) to authenticated;

-- ── advance all appointments for current user ──────────────────────────────

create or replace function public.advance_my_appointments()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r record;
  results jsonb := '[]'::jsonb;
  one jsonb;
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  for r in
    select client_id
    from public.appointments
    where (user_id = uid or patient_id = uid)
      and client_id is not null
      and status in (
        'confirmed', 'upcoming', 'checked_in', 'in_progress', 'awaiting_completion'
      )
  loop
    one := public.advance_appointment_lifecycle(r.client_id);
    results := results || jsonb_build_array(one);
  end loop;

  return jsonb_build_object('ok', true, 'results', results);
end;
$$;

revoke all on function public.advance_my_appointments() from public;
grant execute on function public.advance_my_appointments() to authenticated;

-- ── patient confirms visit completed ───────────────────────────────────────

create or replace function public.confirm_visit_completed(p_client_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  appt public.appointments%rowtype;
  old_status public.appointment_status;
  provider_uid uuid;
  conv_id uuid;
  msg_client text;
  payload jsonb;
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

  -- Idempotent: already completed
  if appt.status = 'completed' then
    return jsonb_build_object(
      'ok', true,
      'changed', false,
      'status', 'completed',
      'client_id', appt.client_id,
      'appointment_id', appt.id,
      'completed_at', appt.completed_at,
      'post_visit_until', appt.post_visit_until
    );
  end if;

  if appt.status not in (
    'awaiting_completion', 'in_progress', 'checked_in', 'confirmed', 'upcoming'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', appt.status::text);
  end if;

  old_status := appt.status;

  update public.appointments
  set
    status = 'completed',
    started_at = coalesce(started_at, public.appointment_scheduled_start(appt), now()),
    completed_at = coalesce(completed_at, now()),
    post_visit_until = coalesce(completed_at, now()) + interval '24 hours',
    confirmation_snooze_until = null,
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'status', 'completed',
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'completedAt', coalesce(completed_at, now()),
          'postVisitUntil', (coalesce(completed_at, now()) + interval '24 hours'),
          'confirmationSnoozeUntil', null
        )
      )
  where id = appt.id
  returning * into appt;

  perform public.append_appointment_history(
    appt.id,
    'booking.completed',
    old_status,
    'completed',
    uid,
    jsonb_build_object('source', 'confirm_visit_completed')
  );

  select p.user_id into provider_uid
  from public.providers p
  where p.id = appt.provider_id;

  payload := jsonb_build_object(
    'type', 'visit_completed',
    'appointmentId', appt.id,
    'clientId', appt.client_id,
    'path', '/post-visit-summary'
  );

  perform public.notify_lifecycle_users(
    coalesce(appt.patient_id, appt.user_id),
    provider_uid,
    'Visit completed',
    'Thanks for confirming. Your post-visit care hub is ready for 24 hours.',
    payload
  );

  -- Optional conversation system cue (idempotent via client_id)
  select c.id into conv_id
  from public.conversations c
  where c.kind = 'provider'
    and (
      c.appointment_id = appt.id
      or c.booking_ref = appt.client_id
    )
  order by c.updated_at desc nulls last
  limit 1;

  if conv_id is not null then
    msg_client := 'visit_completed:' || appt.client_id;
    if not exists (
      select 1 from public.messages
      where conversation_id = conv_id and client_id = msg_client
    ) then
      insert into public.messages (
        conversation_id, sender_id, sender_role, message_type, body, metadata, client_id
      )
      values (
        conv_id,
        uid,
        'system',
        'system',
        'Patient confirmed the visit was completed.',
        jsonb_build_object('event', 'visit_completed', 'appointmentId', appt.id),
        msg_client
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'changed', true,
    'status', 'completed',
    'client_id', appt.client_id,
    'appointment_id', appt.id,
    'completed_at', appt.completed_at,
    'post_visit_until', appt.post_visit_until
  );
end;
$$;

revoke all on function public.confirm_visit_completed(text) from public;
grant execute on function public.confirm_visit_completed(text) to authenticated;

-- ── snooze "Not yet" ───────────────────────────────────────────────────────

create or replace function public.snooze_visit_confirmation(
  p_client_id text,
  p_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  appt public.appointments%rowtype;
  old_status public.appointment_status;
  until_at timestamptz := coalesce(p_until, now() + interval '2 hours');
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

  if appt.status not in ('awaiting_completion', 'in_progress') then
    -- Soft-advance into awaiting first when past end.
    perform public.advance_appointment_lifecycle(appt.client_id);
    select * into appt from public.appointments where id = appt.id for update;
  end if;

  if appt.status not in ('awaiting_completion', 'in_progress') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', appt.status::text);
  end if;

  old_status := appt.status;

  update public.appointments
  set
    status = 'awaiting_completion',
    confirmation_snooze_until = until_at,
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'status', 'awaiting_completion',
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'confirmationSnoozeUntil', until_at
        )
      )
  where id = appt.id
  returning * into appt;

  perform public.append_appointment_history(
    appt.id,
    'booking.visit_snoozed',
    old_status,
    'awaiting_completion',
    uid,
    jsonb_build_object('source', 'snooze_visit_confirmation', 'until', until_at)
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

revoke all on function public.snooze_visit_confirmation(text, timestamptz) from public;
grant execute on function public.snooze_visit_confirmation(text, timestamptz) to authenticated;

commit;
