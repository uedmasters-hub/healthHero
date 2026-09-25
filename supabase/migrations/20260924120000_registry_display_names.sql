-- Normalized registry display names for healthcare centers + pharmacies.
-- name / display_name = cleaned UI label
-- registry_name = original HF / DDA string (search matches both)

alter table public.healthcare_centers
  add column if not exists display_name text,
  add column if not exists registry_name text;

alter table public.pharmacies
  add column if not exists display_name text,
  add column if not exists registry_name text;

-- Backfill: preserve current name as registry when missing; display_name mirrors name.
update public.healthcare_centers
set
  registry_name = coalesce(nullif(trim(registry_name), ''), nullif(trim(name), ''), nullif(trim(client_payload->>'raw_name'), '')),
  display_name = coalesce(nullif(trim(display_name), ''), nullif(trim(name), ''))
where registry_name is null
   or display_name is null
   or trim(coalesce(registry_name, '')) = ''
   or trim(coalesce(display_name, '')) = '';

update public.pharmacies
set
  registry_name = coalesce(nullif(trim(registry_name), ''), nullif(trim(client_payload->>'raw_name'), ''), nullif(trim(name), '')),
  display_name = coalesce(nullif(trim(display_name), ''), nullif(trim(name), ''))
where registry_name is null
   or display_name is null
   or trim(coalesce(registry_name, '')) = ''
   or trim(coalesce(display_name, '')) = '';

create index if not exists centers_display_name_trgm_idx
  on public.healthcare_centers using gin (display_name gin_trgm_ops);

create index if not exists centers_registry_name_trgm_idx
  on public.healthcare_centers using gin (registry_name gin_trgm_ops);

create index if not exists pharmacies_display_name_trgm_idx
  on public.pharmacies using gin (display_name gin_trgm_ops);

create index if not exists pharmacies_registry_name_trgm_idx
  on public.pharmacies using gin (registry_name gin_trgm_ops);

-- Public discovery views expose both cleaned + registry names.
-- Must DROP first: CREATE OR REPLACE cannot insert columns mid-list
-- (Postgres error: cannot change name of view column "type" to "display_name").
drop view if exists public.v_healthcare_centers_public;
drop view if exists public.v_pharmacies_public;

create view public.v_healthcare_centers_public
with (security_invoker = true) as
select
  c.id,
  c.org_id,
  c.name,
  c.display_name,
  c.registry_name,
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

create view public.v_pharmacies_public
with (security_invoker = true) as
select
  ph.id,
  ph.org_id,
  ph.center_id,
  ph.name,
  ph.display_name,
  ph.registry_name,
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

grant select on public.v_healthcare_centers_public to anon, authenticated;
grant select on public.v_pharmacies_public to anon, authenticated;

comment on column public.healthcare_centers.display_name is
  'Cleaned facility label for UI. Prefer over raw registry name.';
comment on column public.healthcare_centers.registry_name is
  'Original HF registry name. Search matches display_name and registry_name.';
comment on column public.pharmacies.display_name is
  'Cleaned pharmacy label for UI. Prefer over raw DDA name.';
comment on column public.pharmacies.registry_name is
  'Original DDA pharmacy name. Search matches display_name and registry_name.';
