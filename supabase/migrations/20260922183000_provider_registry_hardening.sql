-- Production hardening for the Nepal provider registry.
-- Additive only: indexes, RLS ownership, immutable government IDs, public views, claim RPC.

begin;

-- ─── Search / scale indexes ──────────────────────────────────────────────────
create index if not exists providers_license_number_idx
  on public.providers (license_number)
  where license_number is not null;

create index if not exists providers_display_name_trgm_idx
  on public.providers using gin (display_name gin_trgm_ops);

create index if not exists providers_city_idx
  on public.providers (city)
  where city is not null;

create index if not exists providers_provider_type_active_idx
  on public.providers (provider_type, is_active);

create index if not exists providers_primary_center_idx
  on public.providers (primary_center_id)
  where primary_center_id is not null;

create index if not exists providers_user_id_idx
  on public.providers (user_id)
  where user_id is not null;

create index if not exists centers_name_trgm_idx
  on public.healthcare_centers using gin (name gin_trgm_ops);

create index if not exists centers_city_active_idx
  on public.healthcare_centers (city, is_active);

create index if not exists pharmacies_name_trgm_idx
  on public.pharmacies using gin (name gin_trgm_ops);

create index if not exists pharmacies_city_active_idx
  on public.pharmacies (city, is_active);

create index if not exists pharmacies_license_number_idx
  on public.pharmacies (license_number)
  where license_number is not null;

-- ─── Protect government registry identifiers (immutable) ─────────────────────
create or replace function public.protect_registry_identifiers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'providers' then
    if old.nmc_number is not null
       and new.nmc_number is distinct from old.nmc_number
       and not public.is_admin() then
      raise exception 'NMC Number is an immutable government identifier';
    end if;
    if old.source_key is not null
       and old.source_key like 'nmc:%'
       and new.source_key is distinct from old.source_key
       and not public.is_admin() then
      raise exception 'Registry source_key cannot be changed';
    end if;
    if old.external_ref is not null
       and old.external_ref like 'nmc-%'
       and new.external_ref is distinct from old.external_ref
       and not public.is_admin() then
      raise exception 'Registry external_ref cannot be changed';
    end if;
    -- Claimed ownership: once set, only admin can reassign.
    if old.user_id is not null
       and new.user_id is distinct from old.user_id
       and not public.is_admin() then
      raise exception 'Provider ownership can only be reassigned by an administrator';
    end if;
  elsif tg_table_name = 'healthcare_centers' then
    if old.hf_code is not null
       and new.hf_code is distinct from old.hf_code
       and not public.is_admin() then
      raise exception 'HF Code is an immutable government identifier';
    end if;
    if old.source_key is not null
       and old.source_key like 'hf:%'
       and new.source_key is distinct from old.source_key
       and not public.is_admin() then
      raise exception 'Registry source_key cannot be changed';
    end if;
  elsif tg_table_name = 'pharmacies' then
    if old.pharmacy_code is not null
       and new.pharmacy_code is distinct from old.pharmacy_code
       and not public.is_admin() then
      raise exception 'Pharmacy Code is an immutable government identifier';
    end if;
    if old.source_key is not null
       and old.source_key like 'dda:%'
       and new.source_key is distinct from old.source_key
       and not public.is_admin() then
      raise exception 'Registry source_key cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists providers_protect_registry on public.providers;
create trigger providers_protect_registry
  before update on public.providers
  for each row execute function public.protect_registry_identifiers();

drop trigger if exists centers_protect_registry on public.healthcare_centers;
create trigger centers_protect_registry
  before update on public.healthcare_centers
  for each row execute function public.protect_registry_identifiers();

drop trigger if exists pharmacies_protect_registry on public.pharmacies;
create trigger pharmacies_protect_registry
  before update on public.pharmacies
  for each row execute function public.protect_registry_identifiers();

-- ─── Claim an unclaimed registry provider (ownership layer) ──────────────────
create or replace function public.claim_provider_registry(p_provider_id uuid)
returns public.providers
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.providers;
begin
  if uid is null then
    raise exception 'Sign in to claim a provider registry record.' using errcode = '42501';
  end if;

  select * into row from public.providers where id = p_provider_id for update;
  if row.id is null then
    raise exception 'Provider registry record not found.' using errcode = 'P0002';
  end if;
  if row.user_id is not null and row.user_id is distinct from uid then
    raise exception 'This provider registry record is already claimed.' using errcode = '23505';
  end if;

  -- One claimed provider row per user (ownership).
  if exists (
    select 1 from public.providers p
    where p.user_id = uid and p.id is distinct from p_provider_id
  ) and not public.is_admin() then
    raise exception 'You already own a provider registry record.' using errcode = '23505';
  end if;

  update public.providers
  set
    user_id = uid,
    verification_status = case
      when verification_status = 'unverified' then 'pending'::public.verification_status
      else verification_status
    end,
    updated_at = now()
  where id = p_provider_id
  returning * into row;

  return row;
end;
$$;

revoke all on function public.claim_provider_registry(uuid) from public;
grant execute on function public.claim_provider_registry(uuid) to authenticated;

-- ─── RLS: discovery readable; edits for owners / admins ──────────────────────
alter table public.providers enable row level security;
alter table public.healthcare_centers enable row level security;
alter table public.pharmacies enable row level security;
alter table public.provider_centers enable row level security;
alter table public.provider_specializations enable row level security;
alter table public.provider_schedules enable row level security;
alter table public.center_hours enable row level security;
alter table public.pharmacy_hours enable row level security;
alter table public.provider_delegates enable row level security;
alter table public.entity_contacts enable row level security;
alter table public.entity_services enable row level security;
alter table public.entity_documents enable row level security;
alter table public.entity_media enable row level security;

-- Providers
drop policy if exists providers_public_read on public.providers;
create policy providers_public_read on public.providers
  for select using (is_active = true or user_id = auth.uid() or public.is_admin());

drop policy if exists providers_owner_update on public.providers;
create policy providers_owner_update on public.providers
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists providers_admin_insert on public.providers;
create policy providers_admin_insert on public.providers
  for insert with check (public.is_admin());

drop policy if exists providers_admin_delete on public.providers;
create policy providers_admin_delete on public.providers
  for delete using (public.is_admin());

-- Centers
drop policy if exists centers_public_read on public.healthcare_centers;
create policy centers_public_read on public.healthcare_centers
  for select using (is_active = true or public.is_admin());

drop policy if exists centers_admin_write on public.healthcare_centers;
create policy centers_admin_write on public.healthcare_centers
  for all using (public.is_admin())
  with check (public.is_admin());

-- Pharmacies
drop policy if exists pharmacies_public_read on public.pharmacies;
create policy pharmacies_public_read on public.pharmacies
  for select using (is_active = true or public.is_admin());

drop policy if exists pharmacies_admin_write on public.pharmacies;
create policy pharmacies_admin_write on public.pharmacies
  for all using (public.is_admin())
  with check (public.is_admin());

-- Junction / schedule tables — public read of active; owner/admin write
drop policy if exists provider_centers_public_read on public.provider_centers;
create policy provider_centers_public_read on public.provider_centers
  for select using (true);

drop policy if exists provider_centers_owner_write on public.provider_centers;
create policy provider_centers_owner_write on public.provider_centers
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists provider_specs_public_read on public.provider_specializations;
create policy provider_specs_public_read on public.provider_specializations
  for select using (true);

drop policy if exists provider_specs_owner_write on public.provider_specializations;
create policy provider_specs_owner_write on public.provider_specializations
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists provider_schedules_public_read on public.provider_schedules;
create policy provider_schedules_public_read on public.provider_schedules
  for select using (is_active = true or public.is_admin());

drop policy if exists provider_schedules_owner_write on public.provider_schedules;
create policy provider_schedules_owner_write on public.provider_schedules
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists center_hours_public_read on public.center_hours;
create policy center_hours_public_read on public.center_hours
  for select using (true);

drop policy if exists pharmacy_hours_public_read on public.pharmacy_hours;
create policy pharmacy_hours_public_read on public.pharmacy_hours
  for select using (true);

drop policy if exists provider_delegates_owner_read on public.provider_delegates;
create policy provider_delegates_owner_read on public.provider_delegates
  for select using (
    public.is_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

drop policy if exists provider_delegates_owner_write on public.provider_delegates;
create policy provider_delegates_owner_write on public.provider_delegates
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.user_id = auth.uid()
    )
  );

-- Entity support tables: public read of public/active; owner write via provider ownership later
drop policy if exists entity_contacts_public_read on public.entity_contacts;
create policy entity_contacts_public_read on public.entity_contacts
  for select using (is_public = true or public.is_admin());

drop policy if exists entity_services_public_read on public.entity_services;
create policy entity_services_public_read on public.entity_services
  for select using (is_active = true or public.is_admin());

drop policy if exists entity_media_public_read on public.entity_media;
create policy entity_media_public_read on public.entity_media
  for select using (is_active = true or public.is_admin());

drop policy if exists entity_documents_owner_read on public.entity_documents;
create policy entity_documents_owner_read on public.entity_documents
  for select using (
    public.is_admin()
    or (
      entity_kind = 'provider'
      and exists (
        select 1 from public.providers p
        where p.id = entity_id and p.user_id = auth.uid()
      )
    )
  );

-- ─── Stable public views (frontend contract) ─────────────────────────────────
-- security_invoker so RLS on underlying tables still applies for authenticated roles.
-- Anon/authenticated can read via the same public-read policies.

create or replace view public.v_provider_search
with (security_invoker = true) as
select
  p.id,
  p.user_id,
  p.org_id,
  p.provider_type,
  p.title,
  p.first_name,
  p.last_name,
  p.display_name,
  p.nmc_number,
  p.license_number,
  p.degree,
  p.gender,
  p.avatar_url,
  p.about,
  p.years_experience,
  p.consultation_fee,
  p.currency,
  p.rating_avg,
  p.rating_count,
  p.city,
  p.district,
  p.address_line1,
  p.phone,
  p.email,
  p.visit_modes,
  p.languages,
  p.is_active,
  p.is_verified,
  p.verification_status,
  p.verified_at,
  p.primary_center_id,
  p.source_key,
  p.external_ref,
  p.created_at,
  p.updated_at,
  s.name as primary_specialty,
  s.slug as primary_specialty_slug,
  hc.name as primary_center_name,
  hc.hf_code as primary_center_hf_code,
  (p.user_id is not null) as is_claimed
from public.providers p
left join public.provider_specializations ps
  on ps.provider_id = p.id and ps.is_primary = true
left join public.specializations s
  on s.id = ps.specialization_id
left join public.healthcare_centers hc
  on hc.id = p.primary_center_id
where p.is_active = true;

create or replace view public.v_verified_doctors
with (security_invoker = true) as
select *
from public.v_provider_search
where provider_type = 'doctor'
  and (
    is_verified = true
    or verification_status = 'verified'
  );

create or replace view public.v_verified_healthcare_centers
with (security_invoker = true) as
select
  c.id,
  c.org_id,
  c.name,
  c.type,
  c.hf_code,
  c.facility_level,
  c.address_line1,
  c.address_line2,
  c.city,
  c.district,
  c.state,
  c.country,
  c.postal_code,
  c.latitude,
  c.longitude,
  c.phone,
  c.email,
  c.website,
  c.logo_url,
  c.image_url,
  c.rating_avg,
  c.rating_count,
  c.parent_id,
  c.branch_code,
  c.is_active,
  c.verification_status,
  c.verified_at,
  c.source_key,
  c.external_ref,
  c.created_at,
  c.updated_at,
  parent.name as parent_center_name,
  parent.hf_code as parent_hf_code
from public.healthcare_centers c
left join public.healthcare_centers parent
  on parent.id = c.parent_id
where c.is_active = true
  and c.verification_status = 'verified';

create or replace view public.v_verified_pharmacies
with (security_invoker = true) as
select
  ph.id,
  ph.org_id,
  ph.center_id,
  ph.name,
  ph.name_local,
  ph.pharmacy_code,
  ph.license_number,
  ph.place,
  ph.district,
  ph.system_type,
  ph.address_line1,
  ph.address_line2,
  ph.city,
  ph.state,
  ph.country,
  ph.postal_code,
  ph.phone,
  ph.email,
  ph.latitude,
  ph.longitude,
  ph.delivers,
  ph.delivery_radius_km,
  ph.image_url,
  ph.rating_avg,
  ph.rating_count,
  ph.is_active,
  ph.verification_status,
  ph.verified_at,
  ph.source_key,
  ph.external_ref,
  ph.created_at,
  ph.updated_at,
  c.name as center_name,
  c.hf_code as center_hf_code
from public.pharmacies ph
left join public.healthcare_centers c
  on c.id = ph.center_id
where ph.is_active = true
  and ph.verification_status = 'verified';

-- Discovery helpers (active registry, not only verified) for app browse windows
create or replace view public.v_healthcare_centers_public
with (security_invoker = true) as
select
  c.id,
  c.org_id,
  c.name,
  c.type,
  c.hf_code,
  c.facility_level,
  c.address_line1,
  c.city,
  c.district,
  c.phone,
  c.image_url,
  c.rating_avg,
  c.rating_count,
  c.parent_id,
  c.branch_code,
  c.is_active,
  c.verification_status,
  c.source_key,
  c.external_ref
from public.healthcare_centers c
where c.is_active = true;

create or replace view public.v_pharmacies_public
with (security_invoker = true) as
select
  ph.id,
  ph.org_id,
  ph.center_id,
  ph.name,
  ph.name_local,
  ph.pharmacy_code,
  ph.license_number,
  ph.place,
  ph.district,
  ph.system_type,
  ph.address_line1,
  ph.city,
  ph.phone,
  ph.image_url,
  ph.rating_avg,
  ph.delivers,
  ph.is_active,
  ph.verification_status,
  ph.source_key,
  ph.external_ref
from public.pharmacies ph
where ph.is_active = true;

grant select on public.v_provider_search to anon, authenticated;
grant select on public.v_verified_doctors to anon, authenticated;
grant select on public.v_verified_healthcare_centers to anon, authenticated;
grant select on public.v_verified_pharmacies to anon, authenticated;
grant select on public.v_healthcare_centers_public to anon, authenticated;
grant select on public.v_pharmacies_public to anon, authenticated;

comment on view public.v_provider_search is
  'Public discovery contract for providers. Frontend should query this view, not raw providers.';
comment on view public.v_verified_doctors is
  'Claimed/verified doctors only. Use for verified-care surfaces.';
comment on column public.providers.nmc_number is
  'Immutable Nepal Medical Council number. Ownership is via user_id, not by moving rows to public.doctors.';
comment on column public.providers.user_id is
  'Ownership / claim layer for eMedicalls accounts. Null = unclaimed government registry row.';
comment on column public.providers.org_id is
  'Optional organization ownership for multi-branch / network onboarding.';

commit;
