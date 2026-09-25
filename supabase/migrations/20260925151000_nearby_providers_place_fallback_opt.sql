-- Optimize nearby_providers place-fallback: previous DISTINCT ON + multi-OR
-- timed out listing rows even though count_nearby_providers succeeded.

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
    select greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) as radius_km
  ),
  place_centroids(name, latitude, longitude) as (
    values
      ('kathmandu', 27.7172, 85.3240),
      ('lalitpur', 27.6588, 85.3247),
      ('bhaktapur', 27.6710, 85.4298),
      ('pokhara', 28.2096, 83.9856),
      ('biratnagar', 26.4525, 87.2718),
      ('birgunj', 27.0104, 84.8774),
      ('dharan', 26.8121, 87.2832),
      ('butwal', 27.7006, 83.4484),
      ('nepalgunj', 28.05, 81.6167),
      ('dhangadhi', 28.6852, 80.6216),
      ('hetauda', 27.4284, 85.0322),
      ('janakpur', 26.7288, 85.9263),
      ('itahari', 26.6630, 87.2770),
      ('chitwan', 27.5291, 84.3542),
      ('bharatpur', 27.6833, 84.4333),
      ('tokha', 27.7780, 85.3270),
      ('kirtipur', 27.6780, 85.2750),
      ('madhyapur thimi', 27.6800, 85.3900),
      ('banepa', 27.6333, 85.5167),
      ('dhulikhel', 27.6190, 85.5490),
      ('delhi', 28.6139, 77.2090),
      ('gurugram', 28.4595, 77.0266),
      ('gurgaon', 28.4595, 77.0266),
      ('noida', 28.5355, 77.3910)
  ),
  nearby_places as (
    select
      pc.name,
      public.haversine_km(p_lat, p_lng, pc.latitude, pc.longitude) as distance_km
    from place_centroids pc
    cross join bounds b
    where public.haversine_km(p_lat, p_lng, pc.latitude, pc.longitude) <= b.radius_km
  ),
  place_pattern as (
    select
      case
        when exists (select 1 from nearby_places) then
          '(^|[^a-z])(' || string_agg(replace(name, ' ', '[[:space:]]+'), '|' order by length(name) desc) || ')([^a-z]|$)'
        else null
      end as re
    from nearby_places
  ),
  via_center_ids as (
    select
      p.id,
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
  ),
  via_place_ids as (
    select
      p.id,
      (
        select np.distance_km
        from nearby_places np
        where lower(
          coalesce(p.city, '') || ' ' ||
          coalesce(p.district, '') || ' ' ||
          coalesce(p.address_line1, '')
        ) like '%' || np.name || '%'
        order by length(np.name) desc, np.distance_km asc
        limit 1
      ) as distance_km
    from public.providers p
    cross join place_pattern pp
    left join public.provider_specializations ps
      on ps.provider_id = p.id and ps.is_primary = true
    left join public.specializations s on s.id = ps.specialization_id
    where p.is_active = true
      and p.provider_type = 'doctor'
      and p.primary_center_id is null
      and pp.re is not null
      and lower(
        coalesce(p.city, '') || ' ' ||
        coalesce(p.district, '') || ' ' ||
        coalesce(p.address_line1, '')
      ) ~ pp.re
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
        or p.city ilike '%' || trim(p_q) || '%'
        or p.address_line1 ilike '%' || trim(p_q) || '%'
      )
  ),
  ranked as (
    select id, min(distance_km) as distance_km
    from (
      select id, distance_km from via_center_ids
      union all
      select id, distance_km from via_place_ids where distance_km is not null
    ) u
    group by id
    order by min(distance_km) asc, id asc
    limit greatest(1, least(100, coalesce(p_limit, 24)))
    offset greatest(0, coalesce(p_offset, 0))
  )
  select
    p.id,
    p.org_id,
    p.provider_type,
    p.title,
    p.first_name,
    p.last_name,
    p.display_name,
    p.nmc_number,
    p.license_number,
    p.gender,
    p.degree,
    p.about,
    p.avatar_url,
    p.consultation_fee,
    p.currency,
    p.visit_modes,
    p.languages,
    p.is_active,
    p.is_verified,
    p.verification_status,
    p.primary_center_id,
    s.name as primary_specialty,
    s.slug as primary_specialty_slug,
    hc.name as primary_center_name,
    coalesce(nullif(trim(p.city), ''), hc.city) as city,
    coalesce(nullif(trim(p.district), ''), hc.district) as district,
    p.rating_avg,
    p.rating_count,
    p.source_key,
    p.external_ref,
    r.distance_km
  from ranked r
  join public.providers p on p.id = r.id
  left join public.healthcare_centers hc on hc.id = p.primary_center_id
  left join public.provider_specializations ps
    on ps.provider_id = p.id and ps.is_primary = true
  left join public.specializations s on s.id = ps.specialization_id
  order by r.distance_km asc, p.display_name asc;
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
    select greatest(1.0, least(100.0, coalesce(p_radius_km, 20))) as radius_km
  ),
  place_centroids(name, latitude, longitude) as (
    values
      ('kathmandu', 27.7172, 85.3240),
      ('lalitpur', 27.6588, 85.3247),
      ('bhaktapur', 27.6710, 85.4298),
      ('pokhara', 28.2096, 83.9856),
      ('biratnagar', 26.4525, 87.2718),
      ('birgunj', 27.0104, 84.8774),
      ('dharan', 26.8121, 87.2832),
      ('butwal', 27.7006, 83.4484),
      ('nepalgunj', 28.05, 81.6167),
      ('dhangadhi', 28.6852, 80.6216),
      ('hetauda', 27.4284, 85.0322),
      ('janakpur', 26.7288, 85.9263),
      ('itahari', 26.6630, 87.2770),
      ('chitwan', 27.5291, 84.3542),
      ('bharatpur', 27.6833, 84.4333),
      ('tokha', 27.7780, 85.3270),
      ('kirtipur', 27.6780, 85.2750),
      ('madhyapur thimi', 27.6800, 85.3900),
      ('banepa', 27.6333, 85.5167),
      ('dhulikhel', 27.6190, 85.5490),
      ('delhi', 28.6139, 77.2090),
      ('gurugram', 28.4595, 77.0266),
      ('gurgaon', 28.4595, 77.0266),
      ('noida', 28.5355, 77.3910)
  ),
  nearby_places as (
    select pc.name
    from place_centroids pc
    cross join bounds b
    where public.haversine_km(p_lat, p_lng, pc.latitude, pc.longitude) <= b.radius_km
  ),
  place_pattern as (
    select
      case
        when exists (select 1 from nearby_places) then
          '(^|[^a-z])(' || string_agg(replace(name, ' ', '[[:space:]]+'), '|' order by length(name) desc) || ')([^a-z]|$)'
        else null
      end as re
    from nearby_places
  ),
  matched as (
    select p.id
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
      )
    union
    select p.id
    from public.providers p
    cross join place_pattern pp
    left join public.provider_specializations ps
      on ps.provider_id = p.id and ps.is_primary = true
    left join public.specializations s on s.id = ps.specialization_id
    where p.is_active = true
      and p.provider_type = 'doctor'
      and p.primary_center_id is null
      and pp.re is not null
      and lower(
        coalesce(p.city, '') || ' ' ||
        coalesce(p.district, '') || ' ' ||
        coalesce(p.address_line1, '')
      ) ~ pp.re
      and (
        nullif(trim(coalesce(p_specialty, '')), '') is null
        or s.slug = trim(p_specialty)
        or s.name ilike trim(p_specialty)
      )
      and (
        nullif(trim(coalesce(p_q, '')), '') is null
        or p.display_name ilike '%' || trim(p_q) || '%'
        or p.city ilike '%' || trim(p_q) || '%'
        or p.address_line1 ilike '%' || trim(p_q) || '%'
      )
  )
  select count(*)::bigint from matched;
$$;
