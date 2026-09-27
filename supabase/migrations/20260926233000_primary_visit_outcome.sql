-- Primary outcome is the canonical patient answer. Earlier rows keep their
-- outcomes array; new rows store one primary_outcome and leave that row unchanged.

begin;

alter table public.patient_visit_reports
  add column if not exists primary_outcome text;

alter table public.patient_visit_reports disable trigger patient_visit_reports_no_mutation;

update public.patient_visit_reports
set primary_outcome = outcomes[1]
where primary_outcome is null
  and cardinality(outcomes) > 0;

alter table public.patient_visit_reports enable trigger patient_visit_reports_no_mutation;

alter table public.patient_visit_reports
  drop constraint if exists patient_visit_reports_primary_outcome_check;

alter table public.patient_visit_reports
  add constraint patient_visit_reports_primary_outcome_check
  check (
    primary_outcome is null
    or primary_outcome in ('felt_better', 'prescription', 'tests', 'referral', 'follow_up', 'other')
  );

do $$
begin
  if not exists (
    select 1 from public.patient_visit_reports where primary_outcome is null
  ) then
    alter table public.patient_visit_reports alter column primary_outcome set not null;
  end if;
end $$;

create or replace function public.reconcile_patient_visit_report(p_appointment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  appt public.appointments%rowtype;
  report public.patient_visit_reports%rowtype;
  primary_outcome text;
  provider_keys text[];
  confirmed text[];
  patient_only text[];
  provider_only text[];
  provider_uid uuid;
  recon_id uuid;
  med_text text;
  test_text text;
  referral_text text;
  follow_text text;
  marker text;
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

  primary_outcome := coalesce(report.primary_outcome, report.outcomes[1]);
  provider_keys := public.provider_reported_outcomes(appt.provider_outcomes);
  confirmed := case
    when primary_outcome is not null and primary_outcome = any(provider_keys) then array[primary_outcome]
    else '{}'::text[]
  end;
  patient_only := case
    when primary_outcome is not null and not (primary_outcome = any(provider_keys)) then array[primary_outcome]
    else '{}'::text[]
  end;
  provider_only := coalesce(array(
    select outcome from unnest(provider_keys) outcome
    where outcome is distinct from primary_outcome
  ), '{}');
  marker := 'visit-report:' || report.id::text;

  insert into public.visit_outcome_reconciliations (
    report_id, booking_id, confirmed_outcomes, patient_only, provider_only,
    merged_outcomes, provider_outcomes, created_by
  ) values (
    report.id,
    appt.id,
    confirmed,
    patient_only,
    provider_only,
    provider_keys,
    coalesce(appt.provider_outcomes, '{}'::jsonb),
    auth.uid()
  )
  on conflict (report_id) do nothing
  returning id into recon_id;

  if recon_id is null then
    return jsonb_build_object('ok', true, 'reconciled', true, 'already', true, 'report_id', report.id);
  end if;

  med_text := null;
  if jsonb_typeof(appt.provider_outcomes->'medications') = 'array' then
    begin
      select nullif(string_agg(value, ', '), '') into med_text
      from jsonb_array_elements_text(appt.provider_outcomes->'medications') value;
    exception when others then
      med_text := null;
    end;
  end if;

  test_text := null;
  if jsonb_typeof(appt.provider_outcomes->'labs') = 'array' then
    begin
      select nullif(string_agg(value, ', '), '') into test_text
      from jsonb_array_elements_text(appt.provider_outcomes->'labs') value;
    exception when others then
      test_text := null;
    end;
  end if;

  referral_text := nullif(trim(coalesce(appt.provider_outcomes->>'referralTo', '')), '');
  follow_text := nullif(trim(coalesce(appt.provider_outcomes->>'followUpDate', '')), '');

  if 'prescription' = any(provider_keys)
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
      marker || ' ' || coalesce(med_text, 'Confirmed by the clinic')
    );

    if med_text is not null then
      insert into public.patient_medications (patient_id, medication_name, prescribed_by, indication, notes)
      values (
        report.patient_id,
        left(med_text, 255),
        appt.provider_id,
        'Confirmed for visit ' || appt.id::text,
        marker
      );
    end if;
  end if;

  if 'tests' = any(provider_keys) and appt.provider_id is not null
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
      coalesce(test_text, 'Confirmed by the clinic'),
      marker || coalesce(' ' || test_text, '')
    );
  end if;

  if 'referral' = any(provider_keys) then
    insert into public.referrals (
      appointment_id, report_id, patient_id, referring_provider_id, clinic_id, specialty, notes
    ) values (
      appt.id, report.id, report.patient_id, appt.provider_id, report.clinic_id,
      referral_text, marker
    )
    on conflict (report_id) do nothing;
  end if;

  if 'follow_up' = any(provider_keys) then
    insert into public.follow_up_reminders (
      appointment_id, report_id, patient_id, provider_id, note
    ) values (
      appt.id, report.id, report.patient_id, appt.provider_id,
      coalesce(follow_text, 'Follow-up confirmed by the clinic')
    )
    on conflict (report_id) do nothing;

    insert into public.notifications (user_id, channel, title, body, data, status, sent_at)
    values (
      report.patient_id,
      'in_app',
      'Follow-up reminder',
      coalesce(follow_text, 'A follow-up was confirmed for this visit.'),
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
      'Visit report still has an unresolved outcome',
      'The outcome the patient reported was not in the official visit record.',
      jsonb_build_object(
        'type', 'patient_visit_report_unresolved',
        'appointmentId', appt.id,
        'reportId', report.id,
        'primaryOutcome', primary_outcome
      )
    );
  end if;

  perform public.notify_lifecycle_users(
    report.patient_id,
    null,
    'Your clinic confirmed this visit',
    'Your care hub now follows the official visit outcome. Your original report is unchanged.',
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
      'primary_outcome', primary_outcome,
      'confirmed', to_jsonb(confirmed),
      'patient_only', to_jsonb(patient_only),
      'provider_only', to_jsonb(provider_only),
      'official', to_jsonb(provider_keys)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'reconciled', true,
    'report_id', report.id,
    'primary_outcome', primary_outcome,
    'confirmed', to_jsonb(confirmed),
    'patient_only', to_jsonb(patient_only),
    'provider_only', to_jsonb(provider_only),
    'official', to_jsonb(provider_keys)
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
  primary_outcome text;
  details jsonb := '{}'::jsonb;
  report_id uuid;
  provider_uid uuid;
  snapshot jsonb;
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  primary_outcome := nullif(trim(coalesce(p_report->>'primaryOutcome', '')), '');
  if primary_outcome is null and jsonb_typeof(p_report->'outcomes') = 'array' then
    primary_outcome := nullif(trim(coalesce(p_report->'outcomes'->>0, '')), '');
  end if;

  if primary_outcome is null
     or primary_outcome not in ('felt_better', 'prescription', 'tests', 'referral', 'follow_up', 'other') then
    return jsonb_build_object('ok', false, 'reason', 'primary_outcome_required');
  end if;

  if primary_outcome = 'prescription' and nullif(trim(coalesce(p_report#>>'{details,medications}', '')), '') is not null then
    details := details || jsonb_build_object('medications', trim(p_report#>>'{details,medications}'));
  end if;
  if primary_outcome = 'tests' and nullif(trim(coalesce(p_report#>>'{details,tests}', '')), '') is not null then
    details := details || jsonb_build_object('tests', trim(p_report#>>'{details,tests}'));
  end if;
  if primary_outcome = 'referral' and nullif(trim(coalesce(p_report#>>'{details,referral}', '')), '') is not null then
    details := details || jsonb_build_object('referral', trim(p_report#>>'{details,referral}'));
  end if;
  if primary_outcome = 'follow_up' then
    if nullif(trim(coalesce(p_report#>>'{details,followUp}', '')), '') is not null then
      details := details || jsonb_build_object('followUp', trim(p_report#>>'{details,followUp}'));
    end if;
    if nullif(trim(coalesce(p_report#>>'{details,followUpBookingId}', '')), '') is not null then
      details := details || jsonb_build_object('followUpBookingId', trim(p_report#>>'{details,followUpBookingId}'));
    end if;
  end if;
  if primary_outcome = 'other' and nullif(trim(coalesce(p_report#>>'{details,note}', '')), '') is not null then
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
    booking_id, patient_id, provider_id, clinic_id, reported_at, status, primary_outcome, outcomes, details
  ) values (
    appt.id,
    coalesce(appt.patient_id, uid),
    appt.provider_id,
    appt.center_id,
    now(),
    'pending_provider_confirmation',
    primary_outcome,
    array[primary_outcome],
    details
  )
  returning id into report_id;

  snapshot := jsonb_build_object(
    'reportId', report_id,
    'primaryOutcome', primary_outcome,
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
    jsonb_build_object('report_id', report_id, 'primary_outcome', primary_outcome)
  );

  select p.user_id into provider_uid
  from public.providers p
  where p.id = appt.provider_id;

  if provider_uid is not null then
    perform public.notify_lifecycle_users(
      null,
      provider_uid,
      'Patient reported a visit',
      'A temporary outcome is waiting for your confirmation.',
      jsonb_build_object(
        'type', 'patient_visit_report',
        'appointmentId', appt.id,
        'reportId', report_id,
        'primaryOutcome', primary_outcome,
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

notify pgrst, 'reload schema';

commit;
