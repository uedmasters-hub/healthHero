-- Guest exploration activity.
-- Anonymous installs record idempotent events. After a patient identity
-- exists, migrate_guest_activity links those rows without copying them.
-- Apply with: supabase db push  (this file only — do not re-apply older pending migrations by hand)

begin;

create extension if not exists pgcrypto;

create table if not exists public.guest_activity_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  install_id text not null,
  claim_token_hash text not null,
  anonymous_user_id uuid,
  patient_id uuid references public.patients (id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  migrated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists guest_activity_install_idx
  on public.guest_activity_events (install_id)
  where migrated_at is null;

create index if not exists guest_activity_patient_idx
  on public.guest_activity_events (patient_id, occurred_at desc);

alter table public.guest_activity_events enable row level security;

drop policy if exists guest_activity_read_own on public.guest_activity_events;
create policy guest_activity_read_own on public.guest_activity_events
  for select to authenticated
  using (
    patient_id in (select id from public.patients where user_id = auth.uid())
    or anonymous_user_id = auth.uid()
  );

-- Anonymous sign-ins must not create a permanent patient chart.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  anonymous boolean := coalesce((to_jsonb(new)->>'is_anonymous')::boolean, false);
begin
  if anonymous then
    return new;
  end if;

  insert into public.users (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', new.phone, '')), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.users.full_name, excluded.full_name),
        phone = coalesce(public.users.phone, excluded.phone),
        updated_at = now();

  insert into public.patients (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.record_guest_event(
  p_idempotency_key text,
  p_install_id text,
  p_claim_token text,
  p_event_type text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing uuid;
  created uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_idempotency_key is null or length(p_claim_token) < 32 or length(p_install_id) < 8 then
    raise exception 'invalid guest event';
  end if;
  if p_event_type is null or length(p_event_type) > 64 then
    raise exception 'invalid event type';
  end if;

  select id into existing
  from public.guest_activity_events
  where idempotency_key = p_idempotency_key;

  if existing is not null then
    return existing;
  end if;

  insert into public.guest_activity_events (
    idempotency_key,
    install_id,
    claim_token_hash,
    anonymous_user_id,
    event_type,
    entity_type,
    entity_id,
    metadata,
    occurred_at
  ) values (
    p_idempotency_key,
    p_install_id,
    encode(digest(p_claim_token, 'sha256'), 'hex'),
    auth.uid(),
    p_event_type,
    nullif(p_entity_type, ''),
    nullif(p_entity_id, ''),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_occurred_at, now())
  )
  on conflict (idempotency_key) do nothing
  returning id into created;

  if created is not null then
    return created;
  end if;

  select id into existing
  from public.guest_activity_events
  where idempotency_key = p_idempotency_key;
  return existing;
end;
$$;

create or replace function public.migrate_guest_activity(
  p_install_id text,
  p_claim_token text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient uuid;
  v_count integer := 0;
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'patient identity required';
  end if;
  if p_claim_token is null or length(p_claim_token) < 32 then
    raise exception 'invalid claim';
  end if;

  select id into v_patient
  from public.patients
  where user_id = auth.uid();

  if v_patient is null then
    raise exception 'patient record missing';
  end if;

  v_hash := encode(digest(p_claim_token, 'sha256'), 'hex');

  update public.guest_activity_events
  set patient_id = v_patient,
      migrated_at = coalesce(migrated_at, now())
  where install_id = p_install_id
    and claim_token_hash = v_hash
    and migrated_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.record_guest_event(text, text, text, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.migrate_guest_activity(text, text) from public;
grant execute on function public.record_guest_event(text, text, text, text, text, text, jsonb, timestamptz) to authenticated;
grant execute on function public.migrate_guest_activity(text, text) to authenticated;

commit;
