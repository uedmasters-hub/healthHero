-- Provider ingestion hardening: Storage, availability helpers, chat RPC fix.
-- Preserves existing providers/appointments/conversations; does not recreate tables.

begin;

-- ─── External provenance for PocketPills / registry imports ─────────────────
alter table public.providers
  add column if not exists external_ref text,
  add column if not exists client_payload jsonb,
  add column if not exists city text,
  add column if not exists address_line1 text,
  add column if not exists languages text[],
  add column if not exists visit_modes visit_type_enum[] default '{in_person,video}';

create unique index if not exists providers_external_ref_uidx
  on public.providers (external_ref)
  where external_ref is not null;

create unique index if not exists providers_source_key_uidx
  on public.providers (source_key)
  where source_key is not null;

alter table public.healthcare_centers
  add column if not exists external_ref text,
  add column if not exists client_payload jsonb;

create unique index if not exists centers_external_ref_uidx
  on public.healthcare_centers (external_ref)
  where external_ref is not null;

alter table public.pharmacies
  add column if not exists external_ref text,
  add column if not exists source_key text,
  add column if not exists client_payload jsonb,
  add column if not exists rating_avg numeric(3,2) default 0,
  add column if not exists rating_count int default 0,
  add column if not exists image_url text;

create unique index if not exists pharmacies_external_ref_uidx
  on public.pharmacies (external_ref)
  where external_ref is not null;

-- ─── Public provider-avatars bucket ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-avatars',
  'provider-avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set public = excluded.public;

drop policy if exists provider_avatars_public_read on storage.objects;
create policy provider_avatars_public_read on storage.objects
  for select using (bucket_id = 'provider-avatars');

drop policy if exists provider_avatars_service_write on storage.objects;
create policy provider_avatars_service_write on storage.objects
  for all using (bucket_id = 'provider-avatars' and auth.role() = 'service_role')
  with check (bucket_id = 'provider-avatars' and auth.role() = 'service_role');

-- ─── Fix chat RPC: appointments.provider_id → providers, not thin doctors ───
create or replace function public.create_provider_conversation(
  p_booking_ref text default null,
  p_booking_status text default null,
  p_appointment_id uuid default null,
  p_subject text default 'Care conversation',
  p_metadata jsonb default '{}'::jsonb,
  p_provider_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_booking_ref text := nullif(trim(coalesce(p_booking_ref, '')), '');
  v_status text := lower(nullif(trim(coalesce(p_booking_status, '')), ''));
  v_subject text := nullif(trim(coalesce(p_subject, '')), '');
  v_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_appointment_id uuid := p_appointment_id;
  appt public.appointments%rowtype;
  existing public.conversations%rowtype;
  cid uuid;
  created boolean := false;
  eligible boolean := false;
  provider_user uuid := p_provider_user_id;
begin
  if uid is null then
    raise exception 'Sign in to message your care provider.' using errcode = '42501';
  end if;

  if v_booking_ref is null and v_appointment_id is null then
    raise exception 'Choose a booking to chat with your care provider.' using errcode = '22023';
  end if;

  if v_appointment_id is not null then
    select * into appt from public.appointments a where a.id = v_appointment_id;
  elsif v_booking_ref is not null then
    select * into appt
    from public.appointments a
    where a.client_id = v_booking_ref
    order by a.updated_at desc nulls last
    limit 1;
  end if;

  if appt.id is not null then
    if appt.user_id is distinct from uid then
      raise exception 'You can only open chat for your own booking.' using errcode = '42501';
    end if;

    v_status := lower(appt.status::text);
    if v_booking_ref is null and appt.client_id is not null then
      v_booking_ref := appt.client_id;
    end if;
    if v_appointment_id is null then
      v_appointment_id := appt.id;
    end if;

    -- Resolve auth user from providers.user_id (catalog spine), then legacy doctors.
    if provider_user is null and appt.provider_id is not null then
      select p.user_id into provider_user
      from public.providers p
      where p.id = appt.provider_id
        and p.user_id is not null
      limit 1;

      if provider_user is null then
        select d.user_id into provider_user
        from public.doctors d
        where d.id = appt.provider_id
          and d.user_id is not null
        limit 1;
      end if;
    end if;
  end if;

  if v_status = 'consultation_active' then
    v_status := 'in_progress';
  end if;

  eligible := v_status in ('checked_in', 'in_progress', 'completed');

  if appt.id is null then
    if v_booking_ref is null then
      raise exception 'Choose a booking to chat with your care provider.' using errcode = '22023';
    end if;
    if not eligible then
      raise exception 'Message your provider after you check in for the visit.' using errcode = '22023';
    end if;
  elsif not eligible then
    raise exception 'Message your provider after you check in for the visit.' using errcode = '22023';
  end if;

  if v_booking_ref is not null then
    select * into existing
    from public.conversations c
    where c.kind = 'provider'
      and c.booking_ref = v_booking_ref
      and c.status in ('open', 'escalated')
    limit 1;
  elsif v_appointment_id is not null then
    select * into existing
    from public.conversations c
    where c.kind = 'provider'
      and c.appointment_id = v_appointment_id
      and c.status in ('open', 'escalated')
    limit 1;
  end if;

  if existing.id is not null then
    if existing.created_by is distinct from uid
      and not exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = existing.id
          and cp.user_id = uid
          and cp.left_at is null
      )
    then
      raise exception 'You can only open chat for your own booking.' using errcode = '42501';
    end if;

    cid := existing.id;
    perform public.ensure_conversation_participant(cid, uid, 'patient');

    if provider_user is not null and provider_user is distinct from uid then
      perform public.ensure_conversation_participant(cid, provider_user, 'provider');
    end if;

    return jsonb_build_object(
      'ok', true,
      'conversation_id', cid,
      'created', false,
      'booking_ref', v_booking_ref,
      'appointment_id', v_appointment_id
    );
  end if;

  insert into public.conversations (
    kind, status, subject, booking_ref, appointment_id, created_by, metadata
  )
  values (
    'provider',
    'open',
    coalesce(v_subject, 'Care conversation'),
    v_booking_ref,
    v_appointment_id,
    uid,
    v_meta || jsonb_build_object('booking_status', coalesce(v_status, v_meta->>'booking_status'))
  )
  returning id into cid;

  created := true;
  perform public.ensure_conversation_participant(cid, uid, 'patient');

  if provider_user is not null and provider_user is distinct from uid then
    perform public.ensure_conversation_participant(cid, provider_user, 'provider');
  end if;

  insert into public.conversation_events (conversation_id, event_type, actor_id, payload)
  values (
    cid, 'created', uid,
    jsonb_build_object('kind', 'provider', 'booking_ref', v_booking_ref, 'appointment_id', v_appointment_id)
  );

  insert into public.messages (conversation_id, sender_id, sender_role, message_type, body)
  values (
    cid, null, 'system', 'system',
    'Conversation started for your booking. Messages stay with this visit.'
  );

  return jsonb_build_object(
    'ok', true,
    'conversation_id', cid,
    'created', created,
    'booking_ref', v_booking_ref,
    'appointment_id', v_appointment_id
  );
end;
$$;

-- ─── Generate bookable slots from provider_schedules (next N days) ──────────
create or replace function public.generate_provider_slots(
  p_provider_id uuid,
  p_days int default 14
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  before_count int;
  after_count int;
  d date;
  sched record;
  slot_start time;
  slot_end time;
  dur interval;
begin
  if p_provider_id is null then
    return 0;
  end if;

  select count(*) into before_count
  from public.available_slots
  where provider_id = p_provider_id
    and slot_date >= current_date
    and slot_date < current_date + greatest(p_days, 1);

  for i in 0..greatest(p_days - 1, 0) loop
    d := (current_date + i);
    for sched in
      select *
      from public.provider_schedules s
      where s.provider_id = p_provider_id
        and s.is_active
        and s.day_of_week = extract(dow from d)::int
        and (s.effective_until is null or s.effective_until >= d)
        and s.effective_from <= d
    loop
      dur := make_interval(mins => coalesce(sched.slot_duration, 30));
      slot_start := sched.start_time;
      while slot_start + dur <= sched.end_time loop
        slot_end := slot_start + dur;
        insert into public.available_slots (
          provider_id, center_id, slot_date, start_time, end_time, visit_type, is_available
        )
        values (
          p_provider_id,
          null,
          d,
          slot_start,
          slot_end,
          coalesce((sched.visit_types)[1], 'in_person'::visit_type_enum),
          true
        )
        on conflict (provider_id, slot_date, start_time) where center_id is null do nothing;
        slot_start := slot_end;
      end loop;
    end loop;
  end loop;

  select count(*) into after_count
  from public.available_slots
  where provider_id = p_provider_id
    and slot_date >= current_date
    and slot_date < current_date + greatest(p_days, 1);

  return greatest(after_count - before_count, 0);
end;
$$;

-- Unique index currently includes nullable center_id — Postgres treats NULLs as distinct.
-- Add a partial unique index for center-less slots so generation is idempotent.
create unique index if not exists available_slots_provider_date_time_null_center_uidx
  on public.available_slots (provider_id, slot_date, start_time)
  where center_id is null;

-- Public read of active catalog (patients need provider cards)
drop policy if exists providers_public_read on public.providers;
create policy providers_public_read on public.providers
  for select using (is_active = true);

drop policy if exists specializations_public_read on public.specializations;
create policy specializations_public_read on public.specializations
  for select using (is_active = true);

drop policy if exists centers_public_read on public.healthcare_centers;
create policy centers_public_read on public.healthcare_centers
  for select using (is_active = true);

drop policy if exists pharmacies_public_read on public.pharmacies;
create policy pharmacies_public_read on public.pharmacies
  for select using (is_active = true);

drop policy if exists slots_public_read on public.available_slots;
create policy slots_public_read on public.available_slots
  for select using (is_available = true and slot_date >= current_date);

drop policy if exists provider_specs_public_read on public.provider_specializations;
create policy provider_specs_public_read on public.provider_specializations
  for select using (true);

drop policy if exists provider_schedules_public_read on public.provider_schedules;
create policy provider_schedules_public_read on public.provider_schedules
  for select using (is_active = true);

notify pgrst, 'reload schema';

commit;
