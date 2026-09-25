-- Yes lifecycle: dual patient/provider status + reconciliation + pending provider.

do $$ begin
  alter type public.appointment_status add value if not exists 'completed_pending_provider';
exception when duplicate_object then null;
end $$;

alter table public.appointments
  add column if not exists patient_status text not null default 'not_started',
  add column if not exists provider_status text not null default 'not_started',
  add column if not exists reconciliation_status text not null default 'pending',
  add column if not exists patient_report jsonb not null default '{}'::jsonb,
  add column if not exists provider_outcomes jsonb not null default '{}'::jsonb,
  add column if not exists next_care_path text,
  add column if not exists provider_completed_at timestamptz,
  add column if not exists patient_completed_at timestamptz;

comment on column public.appointments.patient_status is
  'Patient-side visit signal: not_started | active | completed | reported';
comment on column public.appointments.provider_status is
  'Provider-side visit signal: not_started | in_progress | completed';
comment on column public.appointments.reconciliation_status is
  'pending | awaiting_provider | awaiting_patient | reconciled | conflict';

create index if not exists appointments_reconciliation_idx
  on public.appointments (reconciliation_status, updated_at desc);

-- Pick next care journey from provider outcomes (priority order).
create or replace function public.resolve_next_care_path(p_outcomes jsonb)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_outcomes->>'surgery', 'false') in ('true', '1') then 'surgery'
    when coalesce(p_outcomes->>'referral', 'false') in ('true', '1')
      or nullif(trim(coalesce(p_outcomes->>'referralTo', '')), '') is not null then 'referral'
    when coalesce(p_outcomes->>'investigations', 'false') in ('true', '1')
      or jsonb_typeof(p_outcomes->'labs') = 'array' and jsonb_array_length(p_outcomes->'labs') > 0 then 'investigations'
    when coalesce(p_outcomes->>'prescription', 'false') in ('true', '1')
      or jsonb_typeof(p_outcomes->'medications') = 'array' and jsonb_array_length(p_outcomes->'medications') > 0 then 'prescription'
    when coalesce(p_outcomes->>'followUp', 'false') in ('true', '1')
      or nullif(trim(coalesce(p_outcomes->>'followUpDate', '')), '') is not null then 'follow_up'
    when coalesce(p_outcomes->>'invoice', 'false') in ('true', '1')
      or p_outcomes ? 'invoiceAmount' then 'invoice'
    when coalesce(p_outcomes->>'documents', 'false') in ('true', '1') then 'medical_documents'
    else 'post_visit_summary'
  end;
$$;

create or replace function public.care_path_route(p_path text)
returns text
language sql
immutable
as $$
  select case coalesce(p_path, 'post_visit_summary')
    when 'prescription' then '/post-visit-summary'
    when 'investigations' then '/post-visit-summary'
    when 'referral' then '/post-visit-summary'
    when 'follow_up' then '/post-visit-summary'
    when 'surgery' then '/post-visit-summary'
    when 'invoice' then '/post-visit-summary'
    when 'medical_documents' then '/post-visit-summary'
    else '/post-visit-summary'
  end;
$$;

-- Reconcile when both sides (or provider alone after patient wait) are ready.
create or replace function public.reconcile_visit_completion(p_appointment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  appt public.appointments%rowtype;
  old_status text;
  next_path text;
  route text;
  changed boolean := false;
begin
  select * into appt from public.appointments where id = p_appointment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  old_status := appt.status::text;

  -- Already reconciled
  if appt.reconciliation_status = 'reconciled' and appt.status::text = 'completed' then
    next_path := coalesce(appt.next_care_path, public.resolve_next_care_path(appt.provider_outcomes));
    return jsonb_build_object(
      'ok', true,
      'changed', false,
      'status', appt.status::text,
      'reconciliation_status', appt.reconciliation_status,
      'next_care_path', next_path,
      'route', public.care_path_route(next_path),
      'client_id', appt.client_id
    );
  end if;

  if appt.provider_status = 'completed' and appt.patient_status in ('completed', 'reported') then
    next_path := public.resolve_next_care_path(appt.provider_outcomes);
    update public.appointments
    set
      status = 'completed',
      reconciliation_status = 'reconciled',
      next_care_path = next_path,
      completed_at = coalesce(completed_at, provider_completed_at, patient_completed_at, now()),
      post_visit_until = coalesce(post_visit_until, coalesce(completed_at, now()) + interval '24 hours'),
      updated_at = now(),
      version = version + 1,
      client_payload = coalesce(client_payload, '{}'::jsonb)
        || jsonb_build_object(
          'status', 'completed',
          'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
            'updatedAt', now(),
            'lifecycle', 'completed',
            'patientStatus', 'completed',
            'providerStatus', 'completed',
            'reconciliationStatus', 'reconciled',
            'nextCarePath', next_path,
            'completedAt', coalesce(completed_at, now()),
            'postVisitUntil', coalesce(post_visit_until, now() + interval '24 hours')
          )
        )
    where id = appt.id
    returning * into appt;
    changed := true;

    perform public.append_appointment_event(
      appt.id,
      'booking.visit_reconciled',
      old_status,
      'completed',
      auth.uid(),
      jsonb_build_object(
        'next_care_path', next_path,
        'patient_report', appt.patient_report,
        'provider_outcomes', appt.provider_outcomes
      )
    );
  elsif appt.provider_status = 'completed' and appt.patient_status = 'not_started' then
    update public.appointments
    set reconciliation_status = 'awaiting_patient', updated_at = now()
    where id = appt.id
    returning * into appt;
  elsif appt.patient_status in ('completed', 'reported') and appt.provider_status <> 'completed' then
    update public.appointments
    set
      status = case
        when status::text in ('completed') then status
        else 'completed_pending_provider'::public.appointment_status
      end,
      reconciliation_status = 'awaiting_provider',
      updated_at = now()
    where id = appt.id
    returning * into appt;
  end if;

  next_path := coalesce(appt.next_care_path, public.resolve_next_care_path(appt.provider_outcomes));
  route := public.care_path_route(next_path);

  return jsonb_build_object(
    'ok', true,
    'changed', changed,
    'status', appt.status::text,
    'patient_status', appt.patient_status,
    'provider_status', appt.provider_status,
    'reconciliation_status', appt.reconciliation_status,
    'next_care_path', next_path,
    'route', route,
    'care_focus', next_path,
    'client_id', appt.client_id,
    'appointment_id', appt.id
  );
end;
$$;

revoke all on function public.reconcile_visit_completion(uuid) from public;
grant execute on function public.reconcile_visit_completion(uuid) to authenticated, service_role;

-- Patient taps Yes on Visit Check-in.
create or replace function public.confirm_visit_yes(p_client_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  appt public.appointments%rowtype;
  old_status text;
  provider_uid uuid;
  result jsonb;
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

  -- Idempotent reconciled completion
  if appt.status::text = 'completed' and appt.reconciliation_status = 'reconciled' then
    return public.reconcile_visit_completion(appt.id)
      || jsonb_build_object('already_completed', true);
  end if;

  if appt.status::text not in (
    'awaiting_completion', 'in_progress', 'visit_active', 'tests_in_progress', 'paused',
    'checked_in', 'confirmed', 'upcoming', 'completed_pending_provider'
  ) and not (appt.status::text = 'completed' and appt.reconciliation_status <> 'reconciled') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', old_status);
  end if;

  -- Mark patient completion first.
  update public.appointments
  set
    patient_status = 'completed',
    patient_completed_at = coalesce(patient_completed_at, now()),
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'patientStatus', 'completed',
          'patientCompletedAt', coalesce(patient_completed_at, now())
        )
      )
  where id = appt.id
  returning * into appt;

  perform public.append_appointment_event(
    appt.id,
    'booking.patient_confirmed_complete',
    old_status,
    appt.status::text,
    uid,
    jsonb_build_object(
      'provider_status', appt.provider_status,
      'source', 'confirm_visit_yes'
    )
  );

  -- Provider already done → reconcile immediately and route.
  if appt.provider_status = 'completed' then
    result := public.reconcile_visit_completion(appt.id);
    return result || jsonb_build_object('waiting_for_provider', false);
  end if;

  -- Provider not updated yet → pending confirmation card.
  update public.appointments
  set
    status = 'completed_pending_provider',
    reconciliation_status = 'awaiting_provider',
    confirmation_snooze_until = null,
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'status', 'completed_pending_provider',
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'lifecycle', 'completed_pending_provider',
          'patientStatus', 'completed',
          'providerStatus', appt.provider_status,
          'reconciliationStatus', 'awaiting_provider'
        )
      )
  where id = appt.id
  returning * into appt;

  perform public.append_appointment_event(
    appt.id,
    'booking.completed_pending_provider',
    old_status,
    'completed_pending_provider',
    uid,
    jsonb_build_object('source', 'confirm_visit_yes')
  );

  select p.user_id into provider_uid
  from public.providers p
  where p.id = appt.provider_id;

  begin
    perform public.notify_lifecycle_users(
      coalesce(appt.patient_id, appt.user_id),
      provider_uid,
      'Patient confirmed visit complete',
      'Please confirm the visit outcome so the patient care hub can update.',
      jsonb_build_object(
        'type', 'completed_pending_provider',
        'appointmentId', appt.id,
        'clientId', appt.client_id
      )
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'ok', true,
    'changed', true,
    'waiting_for_provider', true,
    'status', appt.status::text,
    'patient_status', appt.patient_status,
    'provider_status', appt.provider_status,
    'reconciliation_status', appt.reconciliation_status,
    'route', null,
    'care_focus', null,
    'client_id', appt.client_id,
    'appointment_id', appt.id
  );
end;
$$;

revoke all on function public.confirm_visit_yes(text) from public;
grant execute on function public.confirm_visit_yes(text) to authenticated;

-- Replace legacy confirm to use Yes lifecycle.
create or replace function public.confirm_visit_completed(p_client_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.confirm_visit_yes(p_client_id);
end;
$$;

-- Patient temporary post-visit report while waiting for provider.
create or replace function public.submit_patient_visit_report(
  p_client_id text,
  p_report jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  appt public.appointments%rowtype;
  merged jsonb;
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

  merged := coalesce(appt.patient_report, '{}'::jsonb) || coalesce(p_report, '{}'::jsonb)
    || jsonb_build_object('reportedAt', now(), 'reportedBy', uid);

  update public.appointments
  set
    patient_status = case
      when patient_status in ('completed', 'reported') then 'reported'
      else 'reported'
    end,
    patient_report = merged,
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'patientStatus', 'reported',
          'patientReport', merged
        )
      )
  where id = appt.id
  returning * into appt;

  perform public.append_appointment_event(
    appt.id,
    'booking.patient_visit_reported',
    appt.status::text,
    appt.status::text,
    uid,
    jsonb_build_object('report', p_report)
  );

  return public.reconcile_visit_completion(appt.id)
    || jsonb_build_object('patient_report', appt.patient_report);
end;
$$;

revoke all on function public.submit_patient_visit_report(text, jsonb) from public;
grant execute on function public.submit_patient_visit_report(text, jsonb) to authenticated;

-- Provider confirms completion / outcomes (also used to simulate official update).
create or replace function public.provider_complete_visit(
  p_client_id text,
  p_outcomes jsonb default '{}'::jsonb
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
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  select * into appt
  from public.appointments
  where client_id = nullif(trim(p_client_id), '')
  order by updated_at desc nulls last
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  -- Allow patient owner OR linked provider user.
  if not (
    appt.user_id = uid or appt.patient_id = uid
    or exists (select 1 from public.providers p where p.id = appt.provider_id and p.user_id = uid)
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  old_status := appt.status::text;

  update public.appointments
  set
    provider_status = 'completed',
    provider_completed_at = coalesce(provider_completed_at, now()),
    provider_outcomes = coalesce(provider_outcomes, '{}'::jsonb) || coalesce(p_outcomes, '{}'::jsonb),
    next_care_path = public.resolve_next_care_path(
      coalesce(provider_outcomes, '{}'::jsonb) || coalesce(p_outcomes, '{}'::jsonb)
    ),
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'providerStatus', 'completed',
          'providerCompletedAt', coalesce(provider_completed_at, now()),
          'providerOutcomes', coalesce(provider_outcomes, '{}'::jsonb) || coalesce(p_outcomes, '{}'::jsonb),
          'nextCarePath', public.resolve_next_care_path(
            coalesce(provider_outcomes, '{}'::jsonb) || coalesce(p_outcomes, '{}'::jsonb)
          )
        )
      )
  where id = appt.id
  returning * into appt;

  perform public.append_appointment_event(
    appt.id,
    'booking.provider_completed',
    old_status,
    appt.status::text,
    uid,
    jsonb_build_object('outcomes', p_outcomes)
  );

  return public.reconcile_visit_completion(appt.id);
end;
$$;

revoke all on function public.provider_complete_visit(text, jsonb) from public;
grant execute on function public.provider_complete_visit(text, jsonb) to authenticated, service_role;

comment on function public.confirm_visit_yes is
  'Patient Yes on Visit Check-in: verify provider_status, route or wait with completed_pending_provider.';
