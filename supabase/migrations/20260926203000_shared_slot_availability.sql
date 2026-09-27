-- One availability row per visit mode. Schedules that include video and
-- in-person used to store only visit_types[1], so Video Consultation listed
-- a doctor whose profile had no video times.

drop index if exists public.available_slots_provider_date_time_null_center_uidx;

create unique index if not exists available_slots_provider_date_time_visit_null_center_uidx
  on public.available_slots (provider_id, slot_date, start_time, visit_type)
  where center_id is null;

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
  mode public.visit_type_enum;
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
      foreach mode in array coalesce(sched.visit_types, array['in_person']::public.visit_type_enum[])
      loop
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
            mode,
            true
          )
          on conflict (provider_id, slot_date, start_time, visit_type) where center_id is null do nothing;
          slot_start := slot_end;
        end loop;
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

-- Clinic clocks are stored without a time zone. Compare them in Nepal local time,
-- the same clock the booking screens use.
create or replace function public.provider_has_bookable_video(p_provider_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.available_slots s
    where s.provider_id = p_provider_id
      and s.is_available = true
      and s.visit_type = 'video'
      and (s.slot_date + s.start_time) > timezone('Asia/Kathmandu', now())
  );
$$;

do $$
declare
  provider uuid;
begin
  for provider in
    select distinct s.provider_id
    from public.provider_schedules s
    where s.is_active
      and 'video'::public.visit_type_enum = any (s.visit_types)
  loop
    perform public.generate_provider_slots(provider, 60);
  end loop;
end $$;

notify pgrst, 'reload schema';
