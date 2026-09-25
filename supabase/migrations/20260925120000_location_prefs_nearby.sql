-- GPS-first location preferences + server-side nearby radius RPCs.
-- Haversine (no PostGIS). Bounding-box prefilter for performance.

create table if not exists public.user_location_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  locality text,
  source text not null default 'cached'
    check (source in ('gps', 'manual', 'cached')),
  radius_km integer not null default 20
    check (radius_km between 10 and 100),
  recent_locations jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_location_preferences enable row level security;

drop policy if exists user_location_prefs_select_own on public.user_location_preferences;
create policy user_location_prefs_select_own
  on public.user_location_preferences for select
  using (auth.uid() = user_id);

drop policy if exists user_location_prefs_insert_own on public.user_location_preferences;
create policy user_location_prefs_insert_own
  on public.user_location_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists user_location_prefs_update_own on public.user_location_preferences;
create policy user_location_prefs_update_own
  on public.user_location_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_location_prefs_delete_own on public.user_location_preferences;
create policy user_location_prefs_delete_own
  on public.user_location_preferences for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_location_preferences to authenticated;

create or replace function public.haversine_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
) returns double precision
language sql
immutable
parallel safe
as $$
  select case
    when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else 6371.0 * acos(least(1.0, greatest(-1.0,
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1))
      + sin(radians(lat1)) * sin(radians(lat2))
    )))
  end;
$$;

create or replace function public.nearby_healthcare_centers(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 20,
  p_q text default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  display_name text,
  registry_name text,
  type text,
  hf_code text,
  facility_level text,
  address_line1 text,
  city text,
  district text,
  phone text,
  image_url text,
  logo_url text,
  rating_avg numeric,
  rating_count integer,
  verification_status text,
  source_key text,
  external_ref text,
  latitude double precision,
  longitude double precision,
  is_active boolean,
  client_payload jsonb,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) as radius_km,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) / 111.0 as lat_delta,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20)))
        / (111.0 * greatest(0.2, cos(radians(p_lat)))) as lng_delta
  ),
  filtered as (
    select
      c.*,
      public.haversine_km(p_lat, p_lng, c.latitude, c.longitude) as distance_km
    from public.healthcare_centers c, bounds b
    where c.is_active = true
      and c.latitude is not null
      and c.longitude is not null
      and c.latitude between p_lat - b.lat_delta and p_lat + b.lat_delta
      and c.longitude between p_lng - b.lng_delta and p_lng + b.lng_delta
      and public.haversine_km(p_lat, p_lng, c.latitude, c.longitude) <= b.radius_km
      and (
        nullif(trim(coalesce(p_q, '')), '') is null
        or c.name ilike '%' || trim(p_q) || '%'
        or c.display_name ilike '%' || trim(p_q) || '%'
        or c.registry_name ilike '%' || trim(p_q) || '%'
        or c.hf_code ilike '%' || trim(p_q) || '%'
        or c.city ilike '%' || trim(p_q) || '%'
        or c.district ilike '%' || trim(p_q) || '%'
        or c.facility_level ilike '%' || trim(p_q) || '%'
        or c.type ilike '%' || trim(p_q) || '%'
      )
  )
  select
    f.id,
    f.name,
    f.display_name,
    f.registry_name,
    f.type,
    f.hf_code,
    f.facility_level,
    f.address_line1,
    f.city,
    f.district,
    f.phone,
    f.image_url,
    f.logo_url,
    f.rating_avg,
    f.rating_count,
    f.verification_status,
    f.source_key,
    f.external_ref,
    f.latitude,
    f.longitude,
    f.is_active,
    f.client_payload,
    f.distance_km
  from filtered f
  order by
    f.distance_km asc nulls last,
    case when f.verification_status = 'verified' then 0 else 1 end,
    f.rating_avg desc nulls last,
    f.name asc
  limit greatest(1, least(60, coalesce(p_limit, 24)))
  offset greatest(0, coalesce(p_offset, 0));
$$;

create or replace function public.nearby_pharmacies(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 20,
  p_q text default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  display_name text,
  registry_name text,
  name_local text,
  pharmacy_code text,
  license_number text,
  place text,
  district text,
  system_type text,
  address_line1 text,
  city text,
  phone text,
  email text,
  image_url text,
  rating_avg numeric,
  delivers boolean,
  verification_status text,
  source_key text,
  external_ref text,
  latitude double precision,
  longitude double precision,
  is_active boolean,
  center_id uuid,
  client_payload jsonb,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) as radius_km,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) / 111.0 as lat_delta,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20)))
        / (111.0 * greatest(0.2, cos(radians(p_lat)))) as lng_delta
  ),
  filtered as (
    select
      ph.*,
      public.haversine_km(p_lat, p_lng, ph.latitude, ph.longitude) as distance_km
    from public.pharmacies ph, bounds b
    where ph.is_active = true
      and ph.latitude is not null
      and ph.longitude is not null
      and ph.name ~* '^[A-Za-z]'
      and ph.latitude between p_lat - b.lat_delta and p_lat + b.lat_delta
      and ph.longitude between p_lng - b.lng_delta and p_lng + b.lng_delta
      and public.haversine_km(p_lat, p_lng, ph.latitude, ph.longitude) <= b.radius_km
      and (
        nullif(trim(coalesce(p_q, '')), '') is null
        or ph.name ilike '%' || trim(p_q) || '%'
        or ph.display_name ilike '%' || trim(p_q) || '%'
        or ph.registry_name ilike '%' || trim(p_q) || '%'
        or ph.name_local ilike '%' || trim(p_q) || '%'
        or ph.pharmacy_code ilike '%' || trim(p_q) || '%'
        or ph.license_number ilike '%' || trim(p_q) || '%'
        or ph.city ilike '%' || trim(p_q) || '%'
        or ph.district ilike '%' || trim(p_q) || '%'
        or ph.place ilike '%' || trim(p_q) || '%'
      )
  )
  select
    f.id,
    f.name,
    f.display_name,
    f.registry_name,
    f.name_local,
    f.pharmacy_code,
    f.license_number,
    f.place,
    f.district,
    f.system_type,
    f.address_line1,
    f.city,
    f.phone,
    f.email,
    f.image_url,
    f.rating_avg,
    f.delivers,
    f.verification_status,
    f.source_key,
    f.external_ref,
    f.latitude,
    f.longitude,
    f.is_active,
    f.center_id,
    f.client_payload,
    f.distance_km
  from filtered f
  order by
    f.distance_km asc nulls last,
    case when f.delivers then 0 else 1 end,
    case when f.verification_status = 'verified' then 0 else 1 end,
    f.name asc
  limit greatest(1, least(60, coalesce(p_limit, 24)))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- Doctors near origin via primary healthcare center coordinates.
create or replace function public.nearby_providers(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 20,
  p_q text default null,
  p_specialty text default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid,
  org_id uuid,
  provider_type public.staff_role,
  title text,
  first_name text,
  last_name text,
  display_name text,
  nmc_number text,
  license_number text,
  gender text,
  degree text,
  about text,
  avatar_url text,
  consultation_fee numeric,
  currency text,
  visit_modes public.visit_type_enum[],
  languages text[],
  is_active boolean,
  is_verified boolean,
  verification_status text,
  primary_center_id uuid,
  primary_specialty text,
  primary_specialty_slug text,
  primary_center_name text,
  city text,
  district text,
  rating_avg numeric,
  rating_count integer,
  source_key text,
  external_ref text,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) as radius_km,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) / 111.0 as lat_delta,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20)))
        / (111.0 * greatest(0.2, cos(radians(p_lat)))) as lng_delta
  ),
  filtered as (
    select
      p.*,
      s.name as primary_specialty,
      s.slug as primary_specialty_slug,
      hc.name as primary_center_name,
      public.haversine_km(p_lat, p_lng, hc.latitude, hc.longitude) as distance_km
    from public.providers p
    join public.healthcare_centers hc on hc.id = p.primary_center_id
    left join public.provider_specializations ps
      on ps.provider_id = p.id and ps.is_primary = true
    left join public.specializations s on s.id = ps.specialization_id
    cross join bounds b
    where p.is_active = true
      and p.provider_type = 'doctor'
      and hc.is_active = true
      and hc.latitude is not null
      and hc.longitude is not null
      and hc.latitude between p_lat - b.lat_delta and p_lat + b.lat_delta
      and hc.longitude between p_lng - b.lng_delta and p_lng + b.lng_delta
      and public.haversine_km(p_lat, p_lng, hc.latitude, hc.longitude) <= b.radius_km
      and (
        nullif(trim(coalesce(p_specialty, '')), '') is null
        or s.slug = trim(p_specialty)
        or s.name ilike trim(p_specialty)
      )
      and (
        nullif(trim(coalesce(p_q, '')), '') is null
        or p.display_name ilike '%' || trim(p_q) || '%'
        or p.first_name ilike '%' || trim(p_q) || '%'
        or p.last_name ilike '%' || trim(p_q) || '%'
        or p.nmc_number ilike '%' || trim(p_q) || '%'
        or hc.name ilike '%' || trim(p_q) || '%'
        or hc.city ilike '%' || trim(p_q) || '%'
      )
  )
  select
    f.id,
    f.org_id,
    f.provider_type,
    f.title,
    f.first_name,
    f.last_name,
    f.display_name,
    f.nmc_number,
    f.license_number,
    f.gender,
    f.degree,
    f.about,
    f.avatar_url,
    f.consultation_fee,
    f.currency,
    f.visit_modes,
    f.languages,
    f.is_active,
    f.is_verified,
    f.verification_status,
    f.primary_center_id,
    f.primary_specialty,
    f.primary_specialty_slug,
    f.primary_center_name,
    f.city,
    f.district,
    f.rating_avg,
    f.rating_count,
    f.source_key,
    f.external_ref,
    f.distance_km
  from filtered f
  order by
    f.distance_km asc nulls last,
    case when f.is_verified or f.verification_status = 'verified' then 0 else 1 end,
    f.rating_avg desc nulls last,
    f.display_name asc
  limit greatest(1, least(60, coalesce(p_limit, 24)))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- Count helpers for empty-state expand UX (direct count, no giant page).
create or replace function public.count_nearby_healthcare_centers(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 20,
  p_q text default null
) returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) as radius_km,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) / 111.0 as lat_delta,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20)))
        / (111.0 * greatest(0.2, cos(radians(p_lat)))) as lng_delta
  )
  select count(*)::bigint
  from public.healthcare_centers c, bounds b
  where c.is_active = true
    and c.latitude is not null
    and c.longitude is not null
    and c.latitude between p_lat - b.lat_delta and p_lat + b.lat_delta
    and c.longitude between p_lng - b.lng_delta and p_lng + b.lng_delta
    and public.haversine_km(p_lat, p_lng, c.latitude, c.longitude) <= b.radius_km
    and (
      nullif(trim(coalesce(p_q, '')), '') is null
      or c.name ilike '%' || trim(p_q) || '%'
      or c.display_name ilike '%' || trim(p_q) || '%'
      or c.city ilike '%' || trim(p_q) || '%'
      or c.district ilike '%' || trim(p_q) || '%'
    );
$$;

create or replace function public.count_nearby_pharmacies(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 20,
  p_q text default null
) returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) as radius_km,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) / 111.0 as lat_delta,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20)))
        / (111.0 * greatest(0.2, cos(radians(p_lat)))) as lng_delta
  )
  select count(*)::bigint
  from public.pharmacies ph, bounds b
  where ph.is_active = true
    and ph.latitude is not null
    and ph.longitude is not null
    and ph.name ~* '^[A-Za-z]'
    and ph.latitude between p_lat - b.lat_delta and p_lat + b.lat_delta
    and ph.longitude between p_lng - b.lng_delta and p_lng + b.lng_delta
    and public.haversine_km(p_lat, p_lng, ph.latitude, ph.longitude) <= b.radius_km
    and (
      nullif(trim(coalesce(p_q, '')), '') is null
      or ph.name ilike '%' || trim(p_q) || '%'
      or ph.display_name ilike '%' || trim(p_q) || '%'
      or ph.city ilike '%' || trim(p_q) || '%'
      or ph.district ilike '%' || trim(p_q) || '%'
    );
$$;

create or replace function public.count_nearby_providers(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 20,
  p_q text default null,
  p_specialty text default null
) returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) as radius_km,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) / 111.0 as lat_delta,
      greatest(1.0, least(100.0, coalesce(p_radius_km, 20)))
        / (111.0 * greatest(0.2, cos(radians(p_lat)))) as lng_delta
  )
  select count(*)::bigint
  from public.providers p
  join public.healthcare_centers hc on hc.id = p.primary_center_id
  left join public.provider_specializations ps
    on ps.provider_id = p.id and ps.is_primary = true
  left join public.specializations s on s.id = ps.specialization_id
  cross join bounds b
  where p.is_active = true
    and p.provider_type = 'doctor'
    and hc.is_active = true
    and hc.latitude is not null
    and hc.longitude is not null
    and hc.latitude between p_lat - b.lat_delta and p_lat + b.lat_delta
    and hc.longitude between p_lng - b.lng_delta and p_lng + b.lng_delta
    and public.haversine_km(p_lat, p_lng, hc.latitude, hc.longitude) <= b.radius_km
    and (
      nullif(trim(coalesce(p_specialty, '')), '') is null
      or s.slug = trim(p_specialty)
      or s.name ilike trim(p_specialty)
    )
    and (
      nullif(trim(coalesce(p_q, '')), '') is null
      or p.display_name ilike '%' || trim(p_q) || '%'
      or hc.city ilike '%' || trim(p_q) || '%'
    );
$$;

grant execute on function public.haversine_km(double precision, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.nearby_healthcare_centers(double precision, double precision, double precision, text, int, int) to anon, authenticated;
grant execute on function public.nearby_pharmacies(double precision, double precision, double precision, text, int, int) to anon, authenticated;
grant execute on function public.nearby_providers(double precision, double precision, double precision, text, text, int, int) to anon, authenticated;
grant execute on function public.count_nearby_healthcare_centers(double precision, double precision, double precision, text) to anon, authenticated;
grant execute on function public.count_nearby_pharmacies(double precision, double precision, double precision, text) to anon, authenticated;
grant execute on function public.count_nearby_providers(double precision, double precision, double precision, text, text) to anon, authenticated;

create index if not exists healthcare_centers_lat_lng_idx
  on public.healthcare_centers (latitude, longitude)
  where is_active = true and latitude is not null and longitude is not null;

create index if not exists pharmacies_lat_lng_idx
  on public.pharmacies (latitude, longitude)
  where is_active = true and latitude is not null and longitude is not null;

comment on table public.user_location_preferences is
  'Per-user discovery location + search radius (10–100 km). GPS is preferred; never force Kathmandu.';
comment on function public.nearby_healthcare_centers is
  'Server-side radius filter for healthcare centers. Sorted by distance.';
comment on function public.nearby_pharmacies is
  'Server-side radius filter for pharmacies. Sorted by distance.';
comment on function public.nearby_providers is
  'Server-side radius filter for doctors via primary center coordinates.';
