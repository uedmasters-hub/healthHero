-- Identity and RBAC foundation for Health Hero.
-- auth.users remains the credential store.
-- public.users is the app profile; patients/doctors/staff extend it later.
-- Apply with: supabase db push   or paste into the SQL editor.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('patient', 'doctor', 'staff', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'app_status') then
    create type public.app_status as enum ('active', 'inactive', 'suspended');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role public.app_role not null default 'patient',
  status public.app_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);
create index if not exists users_role_idx on public.users (role);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  mrn text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  license_no text,
  specialty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

drop trigger if exists doctors_set_updated_at on public.doctors;
create trigger doctors_set_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

drop trigger if exists staff_set_updated_at on public.staff;
create trigger staff_set_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.protect_user_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'user id cannot be changed';
  end if;
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and not public.is_admin() then
    raise exception 'role and status can only be changed by an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists users_protect_privileges on public.users;
create trigger users_protect_privileges
  before update on public.users
  for each row execute function public.protect_user_privileges();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.staff enable row level security;

drop policy if exists users_select_self_or_admin on public.users;
create policy users_select_self_or_admin
  on public.users
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists users_update_self on public.users;
create policy users_update_self
  on public.users
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists patients_select_own_or_admin on public.patients;
create policy patients_select_own_or_admin
  on public.patients
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists patients_update_own_or_admin on public.patients;
create policy patients_update_own_or_admin
  on public.patients
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists doctors_select_own_or_admin on public.doctors;
create policy doctors_select_own_or_admin
  on public.doctors
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists doctors_update_own_or_admin on public.doctors;
create policy doctors_update_own_or_admin
  on public.doctors
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists staff_select_own_or_admin on public.staff;
create policy staff_select_own_or_admin
  on public.staff
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists staff_update_own_or_admin on public.staff;
create policy staff_update_own_or_admin
  on public.staff
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

grant usage on schema public to authenticated;
grant select, update on public.users to authenticated;
grant select, update on public.patients to authenticated;
grant select, update on public.doctors to authenticated;
grant select, update on public.staff to authenticated;

commit;
