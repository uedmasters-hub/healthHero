-- Patient visit reports are the source of truth for what the patient said
-- happened. Rows are append-only. Provider confirmation writes a separate
-- reconciliation and fans official outcomes into care records.

begin;

create table if not exists public.patient_visit_reports (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.appointments(id) on delete restrict,
  patient_id    uuid not null references public.users(id) on delete restrict,
  provider_id   uuid references public.providers(id) on delete set null,
  clinic_id     uuid references public.healthcare_centers(id) on delete set null,
  reported_at   timestamptz not null default now(),
  status        text not null default 'pending_provider_confirmation'
                  check (status = 'pending_provider_confirmation'),
  outcomes      text[] not null,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  constraint patient_visit_reports_outcomes_check check (
    cardinality(outcomes) > 0
    and outcomes <@ array['felt_better', 'prescription', 'tests', 'referral', 'follow_up', 'other']::text[]
  )
);

create index if not exists patient_visit_reports_booking_idx
  on public.patient_visit_reports (booking_id, reported_at desc);
create index if not exists patient_visit_reports_patient_idx
  on public.patient_visit_reports (patient_id, reported_at desc);
create index if not exists patient_visit_reports_provider_idx
  on public.patient_visit_reports (provider_id, reported_at desc)
  where provider_id is not null;

comment on table public.patient_visit_reports is
  'Append-only patient outcome reports. Never update or delete a row; reconcile beside it.';

create table if not exists public.visit_outcome_reconciliations (
  id                  uuid primary key default gen_random_uuid(),
  report_id           uuid not null unique references public.patient_visit_reports(id) on delete restrict,
  booking_id          uuid not null references public.appointments(id) on delete restrict,
  confirmed_outcomes  text[] not null default '{}',
  patient_only        text[] not null default '{}',
  provider_only       text[] not null default '{}',
  merged_outcomes     text[] not null default '{}',
  provider_outcomes   jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  created_by          uuid references public.users(id) on delete set null
);

create index if not exists visit_outcome_reconciliations_booking_idx
  on public.visit_outcome_reconciliations (booking_id, created_at desc);

create table if not exists public.referrals (
  id                     uuid primary key default gen_random_uuid(),
  appointment_id         uuid references public.appointments(id) on delete set null,
  report_id              uuid unique references public.patient_visit_reports(id) on delete set null,
  patient_id             uuid not null references public.users(id) on delete restrict,
  referring_provider_id  uuid references public.providers(id) on delete set null,
  clinic_id              uuid references public.healthcare_centers(id) on delete set null,
  specialty              text,
  notes                  text,
  status                 text not null default 'pending',
  source                 text not null default 'visit_reconciliation',
  created_at             timestamptz not null default now()
);

create index if not exists referrals_patient_idx
  on public.referrals (patient_id, created_at desc);

create table if not exists public.follow_up_reminders (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid references public.appointments(id) on delete set null,
  report_id       uuid unique references public.patient_visit_reports(id) on delete set null,
  patient_id      uuid not null references public.users(id) on delete restrict,
  provider_id     uuid references public.providers(id) on delete set null,
  remind_on       date,
  note            text,
  status          text not null default 'scheduled',
  created_at      timestamptz not null default now()
);

create index if not exists follow_up_reminders_patient_idx
  on public.follow_up_reminders (patient_id, remind_on);

create or replace function public.reject_patient_visit_report_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'patient_visit_reports are append-only'
    using errcode = '55000';
end;
$$;

drop trigger if exists patient_visit_reports_no_mutation on public.patient_visit_reports;
create trigger patient_visit_reports_no_mutation
  before update or delete on public.patient_visit_reports
  for each row execute function public.reject_patient_visit_report_mutation();

create or replace function public.provider_reported_outcomes(p_outcomes jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(key order by key), '{}'::text[])
  from (
    select 'felt_better'::text as key
    where coalesce(p_outcomes->>'felt_better', p_outcomes->>'feltBetter', '') in ('true', '1')
    union all
    select 'follow_up'
    where coalesce(p_outcomes->>'follow_up', p_outcomes->>'followUp', '') in ('true', '1')
      or nullif(trim(coalesce(p_outcomes->>'followUpDate', '')), '') is not null
    union all
    select 'other'
    where coalesce(p_outcomes->>'other', '') in ('true', '1')
      or nullif(trim(coalesce(p_outcomes->>'note', '')), '') is not null
    union all
    select 'prescription'
    where coalesce(p_outcomes->>'prescription', '') in ('true', '1')
      or (
        jsonb_typeof(p_outcomes->'medications') = 'array'
        and jsonb_array_length(p_outcomes->'medications') > 0
      )
    union all
    select 'referral'
    where coalesce(p_outcomes->>'referral', '') in ('true', '1')
      or nullif(trim(coalesce(p_outcomes->>'referralTo', '')), '') is not null
    union all
    select 'tests'
    where coalesce(p_outcomes->>'tests', p_outcomes->>'investigations', '') in ('true', '1')
      or (
        jsonb_typeof(p_outcomes->'labs') = 'array'
        and jsonb_array_length(p_outcomes->'labs') > 0
      )
  ) keys;
$$;

create or replace function public.reconcile_patient_visit_report(p_appointment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  appt public.appointments%rowtype;
  report public.patient_visit_reports%rowtype;
  provider_keys text[];
  confirmed text[];
  patient_only text[];
  provider_only text[];
  merged text[];
  provider_uid uuid;
  recon_id uuid;
  med_text text;
  test_text text;
  referral_text text;
  follow_text text;
  marker text;
  rx_id uuid;
begin
  select * into appt from public.appointments where id = p_appointment_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into report
  from public.patient_visit_reports
  where booking_id = appt.id
    and not exists (
      select 1 from public.visit_outcome_reconciliations r
      where r.report_id = patient_visit_reports.id
    )
  order by reported_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', true, 'reconciled', false, 'reason', 'no_pending_report');
  end if;

  if appt.provider_status is distinct from 'completed' then
    return jsonb_build_object('ok', true, 'reconciled', false, 'reason', 'awaiting_provider', 'report_id', report.id);
  end if;

  provider_keys := public.provider_reported_outcomes(appt.provider_outcomes);
  confirmed := coalesce(array(
    select outcome from unnest(report.outcomes) outcome
    where outcome = any(provider_keys)
  ), '{}');
  patient_only := coalesce(array(
    select outcome from unnest(report.outcomes) outcome
    where not (outcome = any(provider_keys))
  ), '{}');
  provider_only := coalesce(array(
    select outcome from unnest(provider_keys) outcome
    where not (outcome = any(report.outcomes))
  ), '{}');
  merged := confirmed || provider_only;
  marker := 'visit-report:' || report.id::text;

  insert into public.visit_outcome_reconciliations (
    report_id, booking_id, confirmed_outcomes, patient_only, provider_only,
    merged_outcomes, provider_outcomes, created_by
  ) values (
    report.id, appt.id, confirmed, patient_only, provider_only,
    merged, coalesce(appt.provider_outcomes, '{}'::jsonb), auth.uid()
  )
  on conflict (report_id) do nothing
  returning id into recon_id;

  if recon_id is null then
    return jsonb_build_object('ok', true, 'reconciled', true, 'already', true, 'report_id', report.id);
  end if;

  med_text := nullif(trim(coalesce(report.details->>'medications', '')), '');
  if med_text is null and jsonb_typeof(appt.provider_outcomes->'medications') = 'array' then
    begin
      select nullif(string_agg(value, ', '), '') into med_text
      from jsonb_array_elements_text(appt.provider_outcomes->'medications') value;
    exception when others then
      med_text := null;
    end;
  end if;

  test_text := nullif(trim(coalesce(report.details->>'tests', '')), '');
  if test_text is null and jsonb_typeof(appt.provider_outcomes->'labs') = 'array' then
    begin
      select nullif(string_agg(value, ', '), '') into test_text
      from jsonb_array_elements_text(appt.provider_outcomes->'labs') value;
    exception when others then
      test_text := null;
    end;
  end if;

  referral_text := coalesce(
    nullif(trim(coalesce(report.details->>'referral', '')), ''),
    nullif(trim(coalesce(appt.provider_outcomes->>'referralTo', '')), '')
  );
  follow_text := coalesce(
    nullif(trim(coalesce(report.details->>'followUp', '')), ''),
    nullif(trim(coalesce(appt.provider_outcomes->>'followUpDate', '')), '')
  );

  if 'prescription' = any(merged)
     and not exists (
       select 1 from public.prescriptions
       where appointment_id = appt.id and notes like marker || '%'
     ) then
    insert into public.prescriptions (appointment_id, patient_id, provider_id, status, notes)
    values (
      appt.id,
      report.patient_id,
      appt.provider_id,
      'active',
      marker || coalesce(' ' || med_text, '')
    )
    returning id into rx_id;

    if med_text is not null then
      insert into public.patient_medications (patient_id, medication_name, prescribed_by, indication, notes)
      values (
        report.patient_id,
        left(med_text, 255),
        appt.provider_id,
        'Reported from visit ' || appt.id::text,
        marker
      );
    end if;
  end if;

  if 'tests' = any(merged) and appt.provider_id is not null
     and not exists (
       select 1 from public.lab_orders
       where appointment_id = appt.id and notes like marker || '%'
     ) then
    insert into public.lab_orders (
      appointment_id, patient_id, ordering_provider_id, status, clinical_indication, notes
    ) values (
      appt.id,
      report.patient_id,
      appt.provider_id,
      'ordered',
      coalesce(test_text, 'Tests reported for this visit'),
      marker || coalesce(' ' || test_text, '')
    );
  end if;

  if 'referral' = any(merged) then
    insert into public.referrals (
      appointment_id, report_id, patient_id, referring_provider_id, clinic_id, specialty, notes
    ) values (
      appt.id, report.id, report.patient_id, appt.provider_id, report.clinic_id,
      referral_text, marker
    )
    on conflict (report_id) do nothing;
  end if;

  if 'follow_up' = any(merged) then
    insert into public.follow_up_reminders (
      appointment_id, report_id, patient_id, provider_id, note
    ) values (
      appt.id, report.id, report.patient_id, appt.provider_id,
      coalesce(follow_text, 'Follow-up from this visit')
    )
    on conflict (report_id) do nothing;

    insert into public.notifications (user_id, channel, title, body, data, status, sent_at)
    values (
      report.patient_id,
      'in_app',
      'Follow-up reminder',
      coalesce(follow_text, 'A follow-up was recorded for this visit.'),
      jsonb_build_object(
        'type', 'follow_up_reminder',
        'appointmentId', appt.id,
        'reportId', report.id,
        'to', '/post-visit-summary'
      ),
      'sent',
      now()
    );
  end if;

  select p.user_id into provider_uid
  from public.providers p
  where p.id = appt.provider_id;

  if cardinality(patient_only) > 0 and provider_uid is not null then
    perform public.notify_lifecycle_users(
      null,
      provider_uid,
      'Visit report still has unresolved outcomes',
      'Some outcomes the patient reported were not in the official visit record.',
      jsonb_build_object(
        'type', 'patient_visit_report_unresolved',
        'appointmentId', appt.id,
        'reportId', report.id,
        'patientOnly', to_jsonb(patient_only)
      )
    );
  end if;

  perform public.notify_lifecycle_users(
    report.patient_id,
    null,
    'Your clinic confirmed this visit',
    'Matching outcomes are confirmed. Official updates are in your care hub.',
    jsonb_build_object(
      'type', 'visit_reconciled',
      'appointmentId', appt.id,
      'reportId', report.id,
      'to', '/post-visit-summary'
    )
  );

  perform public.append_appointment_event(
    appt.id,
    'booking.visit_report_reconciled',
    appt.status::text,
    appt.status::text,
    auth.uid(),
    jsonb_build_object(
      'report_id', report.id,
      'confirmed', to_jsonb(confirmed),
      'patient_only', to_jsonb(patient_only),
      'provider_only', to_jsonb(provider_only),
      'merged', to_jsonb(merged)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'reconciled', true,
    'report_id', report.id,
    'confirmed', to_jsonb(confirmed),
    'patient_only', to_jsonb(patient_only),
    'provider_only', to_jsonb(provider_only),
    'merged', to_jsonb(merged)
  );
end;
$$;

revoke all on function public.reconcile_patient_visit_report(uuid) from public;
grant execute on function public.reconcile_patient_visit_report(uuid) to authenticated, service_role;

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
  outcome_keys text[];
  details jsonb := '{}'::jsonb;
  report_id uuid;
  provider_uid uuid;
  snapshot jsonb;
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_report->'outcomes') is distinct from 'array' then
    return jsonb_build_object('ok', false, 'reason', 'outcomes_required');
  end if;

  select coalesce(array_agg(distinct value order by value), '{}'::text[])
  into outcome_keys
  from jsonb_array_elements_text(p_report->'outcomes') value
  where value in ('felt_better', 'prescription', 'tests', 'referral', 'follow_up', 'other');

  if coalesce(cardinality(outcome_keys), 0) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'outcomes_required');
  end if;

  if 'prescription' = any(outcome_keys) and nullif(trim(coalesce(p_report#>>'{details,medications}', '')), '') is not null then
    details := details || jsonb_build_object('medications', trim(p_report#>>'{details,medications}'));
  end if;
  if 'tests' = any(outcome_keys) and nullif(trim(coalesce(p_report#>>'{details,tests}', '')), '') is not null then
    details := details || jsonb_build_object('tests', trim(p_report#>>'{details,tests}'));
  end if;
  if 'referral' = any(outcome_keys) and nullif(trim(coalesce(p_report#>>'{details,referral}', '')), '') is not null then
    details := details || jsonb_build_object('referral', trim(p_report#>>'{details,referral}'));
  end if;
  if 'follow_up' = any(outcome_keys) and nullif(trim(coalesce(p_report#>>'{details,followUp}', '')), '') is not null then
    details := details || jsonb_build_object('followUp', trim(p_report#>>'{details,followUp}'));
  end if;
  if 'other' = any(outcome_keys) and nullif(trim(coalesce(p_report#>>'{details,note}', '')), '') is not null then
    details := details || jsonb_build_object('note', trim(p_report#>>'{details,note}'));
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

  insert into public.patient_visit_reports (
    booking_id, patient_id, provider_id, clinic_id, reported_at, status, outcomes, details
  ) values (
    appt.id,
    coalesce(appt.patient_id, uid),
    appt.provider_id,
    appt.center_id,
    now(),
    'pending_provider_confirmation',
    outcome_keys,
    details
  )
  returning id into report_id;

  snapshot := jsonb_build_object(
    'reportId', report_id,
    'outcomes', to_jsonb(outcome_keys),
    'details', details,
    'reportedAt', now(),
    'status', 'pending_provider_confirmation'
  );

  update public.appointments
  set
    patient_status = 'reported',
    patient_report = snapshot,
    updated_at = now(),
    version = version + 1,
    client_payload = coalesce(client_payload, '{}'::jsonb)
      || jsonb_build_object(
        'meta', coalesce(client_payload->'meta', '{}'::jsonb) || jsonb_build_object(
          'updatedAt', now(),
          'patientStatus', 'reported',
          'patientReport', snapshot
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
    jsonb_build_object('report_id', report_id, 'outcomes', to_jsonb(outcome_keys))
  );

  select p.user_id into provider_uid
  from public.providers p
  where p.id = appt.provider_id;

  if provider_uid is not null then
    perform public.notify_lifecycle_users(
      null,
      provider_uid,
      'Patient reported a visit',
      'A temporary outcome report is waiting for your confirmation.',
      jsonb_build_object(
        'type', 'patient_visit_report',
        'appointmentId', appt.id,
        'reportId', report_id,
        'status', 'pending_provider_confirmation'
      )
    );
  end if;

  return public.reconcile_visit_completion(appt.id)
    || jsonb_build_object('report_id', report_id, 'patient_report', snapshot);
end;
$$;

revoke all on function public.submit_patient_visit_report(text, jsonb) from public;
grant execute on function public.submit_patient_visit_report(text, jsonb) to authenticated;

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

  perform public.reconcile_patient_visit_report(appt.id);
  return public.reconcile_visit_completion(appt.id);
end;
$$;

revoke all on function public.provider_complete_visit(text, jsonb) from public;
grant execute on function public.provider_complete_visit(text, jsonb) to authenticated, service_role;

alter table public.patient_visit_reports enable row level security;
alter table public.visit_outcome_reconciliations enable row level security;
alter table public.referrals enable row level security;
alter table public.follow_up_reminders enable row level security;

drop policy if exists patient_visit_reports_select on public.patient_visit_reports;
create policy patient_visit_reports_select on public.patient_visit_reports
  for select to authenticated
  using (
    patient_id = auth.uid()
    or exists (
      select 1 from public.providers p
      where p.id = patient_visit_reports.provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists visit_outcome_reconciliations_select on public.visit_outcome_reconciliations;
create policy visit_outcome_reconciliations_select on public.visit_outcome_reconciliations
  for select to authenticated
  using (
    exists (
      select 1 from public.patient_visit_reports r
      where r.id = visit_outcome_reconciliations.report_id
        and (
          r.patient_id = auth.uid()
          or exists (
            select 1 from public.providers p
            where p.id = r.provider_id and p.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals
  for select to authenticated
  using (
    patient_id = auth.uid()
    or exists (
      select 1 from public.providers p
      where p.id = referrals.referring_provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists follow_up_reminders_select on public.follow_up_reminders;
create policy follow_up_reminders_select on public.follow_up_reminders
  for select to authenticated
  using (
    patient_id = auth.uid()
    or exists (
      select 1 from public.providers p
      where p.id = follow_up_reminders.provider_id and p.user_id = auth.uid()
    )
  );

revoke insert, update, delete on public.patient_visit_reports from anon, authenticated;
revoke insert, update, delete on public.visit_outcome_reconciliations from anon, authenticated;
revoke insert, update, delete on public.referrals from anon, authenticated;
revoke insert, update, delete on public.follow_up_reminders from anon, authenticated;
grant select on public.patient_visit_reports to authenticated;
grant select on public.visit_outcome_reconciliations to authenticated;
grant select on public.referrals to authenticated;
grant select on public.follow_up_reminders to authenticated;

notify pgrst, 'reload schema';

commit;
