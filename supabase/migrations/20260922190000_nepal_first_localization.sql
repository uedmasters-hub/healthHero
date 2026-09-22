-- Nepal-first geography hardening.
-- Additive: localization defaults, Nepal address view, safe seed cleanup.
-- Does NOT delete or rewrite government registry identifiers.

begin;

-- Default country / currency toward Nepal for new rows
alter table public.healthcare_centers
  alter column country set default 'NP';

alter table public.pharmacies
  alter column country set default 'NP';

alter table public.providers
  alter column currency set default 'NPR';

alter table public.organizations
  alter column country set default 'NP';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'patient_addresses' and column_name = 'country'
  ) then
    execute 'alter table public.patient_addresses alter column country set default ''NP''';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'addresses' and column_name = 'country'
  ) then
    execute 'alter table public.addresses alter column country set default ''NP''';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'invoices' and column_name = 'currency'
  ) then
    execute 'alter table public.invoices alter column currency set default ''NPR''';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'currency'
  ) then
    execute 'alter table public.payments alter column currency set default ''NPR''';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lab_orders' and column_name = 'currency'
  ) then
    execute 'alter table public.lab_orders alter column currency set default ''NPR''';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'home_care_orders' and column_name = 'currency'
  ) then
    execute 'alter table public.home_care_orders alter column currency set default ''NPR''';
  end if;
end $$;

-- Localize non-registry seeded centers (preserve hf:* government rows)
update public.healthcare_centers
set
  country = 'NP',
  city = case
    when lower(coalesce(city, '')) in ('delhi', 'new delhi', 'mumbai', 'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune')
      then 'Kathmandu'
    else coalesce(nullif(city, ''), 'Kathmandu')
  end,
  state = case
    when state is null or state = '' or state ~* 'delhi|maharashtra|karnataka|tamil|west bengal|telangana|india'
      then 'Bagmati'
    else state
  end,
  address_line1 = case
    when address_line1 ~* 'delhi|mumbai|bengaluru|bangalore|hyderabad|chennai|kolkata|bandra|connaught|brigade|banjara|anna salai|park street'
      then 'Kathmandu, Nepal'
    else address_line1
  end,
  latitude = coalesce(latitude, 27.7172),
  longitude = coalesce(longitude, 85.3240)
where (source_key is null or source_key not like 'hf:%')
  and (
    coalesce(country, '') in ('', 'India', 'IN')
    or city ~* 'delhi|mumbai|bengaluru|bangalore|hyderabad|chennai|kolkata|pune'
    or address_line1 ~* 'delhi|mumbai|bengaluru|india'
  );

-- Registry facilities: ensure country NP, keep district/city from import
update public.healthcare_centers
set country = 'NP'
where source_key like 'hf:%'
  and (country is null or country = '' or country in ('India', 'IN'));

update public.pharmacies
set country = 'NP'
where source_key like 'dda:%'
  and (country is null or country = '' or country in ('India', 'IN'));

update public.providers
set
  currency = 'NPR',
  city = case
    when lower(coalesce(city, '')) in ('delhi', 'new delhi', 'mumbai', 'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune')
      then 'Kathmandu'
    else city
  end,
  address_line1 = case
    when address_line1 ~* 'delhi|mumbai|bengaluru|bangalore|hyderabad|chennai|kolkata|bandra|connaught|brigade'
      then coalesce(nullif(district, ''), 'Kathmandu') || ', Nepal'
    else address_line1
  end
where source_key is null or source_key not like 'nmc:%';

update public.providers
set currency = coalesce(nullif(currency, ''), 'NPR')
where source_key like 'nmc:%'
  and (currency is null or currency = '' or currency = 'INR');

update public.organizations
set
  country = 'NP',
  city = coalesce(nullif(city, ''), 'Kathmandu')
where country is null or country = '' or country in ('India', 'IN')
   or city ~* 'delhi|mumbai|bengaluru|india';

-- Nepal address lookup view (districts from HF registry + major cities)
create or replace view public.v_nepal_address_lookup
with (security_invoker = true) as
select distinct
  'district'::text as place_type,
  c.district as name,
  c.district as district,
  c.city as city,
  'NP'::text as country_code,
  'Nepal'::text as country_name,
  count(*) over (partition by c.district) as facility_count
from public.healthcare_centers c
where c.is_active = true
  and c.district is not null
  and length(trim(c.district)) > 0
union all
select distinct
  'city'::text as place_type,
  c.city as name,
  c.district as district,
  c.city as city,
  'NP'::text as country_code,
  'Nepal'::text as country_name,
  count(*) over (partition by c.city) as facility_count
from public.healthcare_centers c
where c.is_active = true
  and c.city is not null
  and length(trim(c.city)) > 0;

grant select on public.v_nepal_address_lookup to anon, authenticated;

comment on view public.v_nepal_address_lookup is
  'Nepal place lookup derived from government HF registry districts/cities.';

-- Default map fallback helper (Kathmandu)
create or replace function public.nepal_default_coords()
returns table (latitude numeric, longitude numeric, label text)
language sql
immutable
as $$
  select 27.7172::numeric, 85.3240::numeric, 'Kathmandu, Nepal'::text;
$$;

grant execute on function public.nepal_default_coords() to anon, authenticated;

commit;
