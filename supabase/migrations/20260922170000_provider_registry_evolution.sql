-- Evolve provider / facility / pharmacy catalog for Nepal registry imports.
-- Additive only: no drops, no data loss. Supports HF Code, NMC Number, Pharmacy Code.
-- Futures: branches, delegates, contacts, hours, verification, services, documents, media.

begin;

-- ─── Verification status (shared) ────────────────────────────────────────────
do $$ begin
  create type public.verification_status as enum (
    'unverified',
    'pending',
    'verified',
    'rejected',
    'suspended'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.entity_kind as enum (
    'provider',
    'center',
    'pharmacy',
    'organization',
    'branch'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.contact_kind as enum (
    'phone',
    'email',
    'whatsapp',
    'fax',
    'website',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.media_kind as enum (
    'avatar',
    'logo',
    'cover',
    'gallery',
    'document_preview',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_kind as enum (
    'license',
    'registration',
    'identity',
    'qualification',
    'insurance',
    'other'
  );
exception when duplicate_object then null;
end $$;

-- ─── Providers (NMC doctors) ─────────────────────────────────────────────────
alter table public.providers
  add column if not exists nmc_number text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists gender text,
  add column if not exists degree text,
  add column if not exists verification_status public.verification_status
    not null default 'unverified',
  add column if not exists verified_at timestamptz,
  add column if not exists primary_center_id uuid,
  add column if not exists district text;

-- Preserve official NMC Number exactly (unique when present).
create unique index if not exists providers_nmc_number_uidx
  on public.providers (nmc_number)
  where nmc_number is not null;

create index if not exists providers_district_idx on public.providers (district);
create index if not exists providers_verification_idx on public.providers (verification_status);

do $$ begin
  alter table public.providers
    add constraint providers_primary_center_fkey
    foreign key (primary_center_id) references public.healthcare_centers(id)
    on delete set null;
exception when duplicate_object then null;
end $$;

-- ─── Healthcare centers / facilities (HF registry) ───────────────────────────
alter table public.healthcare_centers
  add column if not exists hf_code text,
  add column if not exists facility_level text,
  add column if not exists district text,
  add column if not exists parent_id uuid,
  add column if not exists branch_code text,
  add column if not exists verification_status public.verification_status
    not null default 'unverified',
  add column if not exists verified_at timestamptz;

create unique index if not exists centers_hf_code_uidx
  on public.healthcare_centers (hf_code)
  where hf_code is not null;

create index if not exists centers_district_idx on public.healthcare_centers (district);
create index if not exists centers_parent_idx on public.healthcare_centers (parent_id);
create index if not exists centers_verification_idx on public.healthcare_centers (verification_status);

do $$ begin
  alter table public.healthcare_centers
    add constraint centers_parent_fkey
    foreign key (parent_id) references public.healthcare_centers(id)
    on delete set null;
exception when duplicate_object then null;
end $$;

-- ─── Pharmacies (DDA Registration No → pharmacy_code) ────────────────────────
alter table public.pharmacies
  add column if not exists pharmacy_code text,
  add column if not exists place text,
  add column if not exists district text,
  add column if not exists system_type text,
  add column if not exists name_local text,
  add column if not exists address_line2 text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text default 'NP',
  add column if not exists verification_status public.verification_status
    not null default 'unverified',
  add column if not exists verified_at timestamptz;

create unique index if not exists pharmacies_pharmacy_code_uidx
  on public.pharmacies (pharmacy_code)
  where pharmacy_code is not null;

create unique index if not exists pharmacies_source_key_uidx
  on public.pharmacies (source_key)
  where source_key is not null;

create index if not exists pharmacies_district_idx on public.pharmacies (district);
create index if not exists pharmacies_verification_idx on public.pharmacies (verification_status);

-- ─── Pharmacy hours (parallel to center_hours) ───────────────────────────────
create table if not exists public.pharmacy_hours (
  id              uuid primary key default gen_random_uuid(),
  pharmacy_id     uuid not null references public.pharmacies(id) on delete cascade,
  day_of_week     int not null check (day_of_week between 0 and 6),
  open_time       time,
  close_time      time,
  is_closed       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (is_closed or (open_time is not null and close_time is not null and open_time < close_time))
);

create index if not exists pharmacy_hours_pharmacy_idx on public.pharmacy_hours (pharmacy_id);
create unique index if not exists pharmacy_hours_day_uidx
  on public.pharmacy_hours (pharmacy_id, day_of_week);

-- ─── Provider delegates (onboarding expansion) ───────────────────────────────
create table if not exists public.provider_delegates (
  id              uuid primary key default gen_random_uuid(),
  provider_id     uuid not null references public.providers(id) on delete cascade,
  user_id         uuid references public.users(id) on delete set null,
  display_name    text not null,
  role            text not null default 'assistant',
  phone           text,
  email           text,
  permissions     jsonb not null default '{}'::jsonb,
  is_active       boolean not null default true,
  valid_from      date,
  valid_until     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists provider_delegates_provider_idx
  on public.provider_delegates (provider_id);
create index if not exists provider_delegates_user_idx
  on public.provider_delegates (user_id);

-- ─── Polymorphic contacts ────────────────────────────────────────────────────
create table if not exists public.entity_contacts (
  id              uuid primary key default gen_random_uuid(),
  entity_kind     public.entity_kind not null,
  entity_id       uuid not null,
  kind            public.contact_kind not null default 'phone',
  label           text,
  value           text not null,
  is_primary      boolean not null default false,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists entity_contacts_entity_idx
  on public.entity_contacts (entity_kind, entity_id);
create unique index if not exists entity_contacts_primary_uidx
  on public.entity_contacts (entity_kind, entity_id, kind)
  where is_primary;

-- ─── Services catalog (provider / center / pharmacy offerings) ───────────────
create table if not exists public.entity_services (
  id              uuid primary key default gen_random_uuid(),
  entity_kind     public.entity_kind not null,
  entity_id       uuid not null,
  name            text not null,
  slug            text,
  description     text,
  fee             numeric(10,2),
  currency        varchar(3) default 'NPR',
  is_active       boolean not null default true,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists entity_services_entity_idx
  on public.entity_services (entity_kind, entity_id);

-- ─── Documents (licenses, registration proofs) ───────────────────────────────
create table if not exists public.entity_documents (
  id              uuid primary key default gen_random_uuid(),
  entity_kind     public.entity_kind not null,
  entity_id       uuid not null,
  kind            public.document_kind not null default 'other',
  title           text not null,
  storage_path    text,
  public_url      text,
  issued_on       date,
  expires_on      date,
  verification_status public.verification_status not null default 'unverified',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists entity_documents_entity_idx
  on public.entity_documents (entity_kind, entity_id);

-- ─── Media gallery ───────────────────────────────────────────────────────────
create table if not exists public.entity_media (
  id              uuid primary key default gen_random_uuid(),
  entity_kind     public.entity_kind not null,
  entity_id       uuid not null,
  kind            public.media_kind not null default 'gallery',
  storage_path    text,
  public_url      text not null,
  alt_text        text,
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists entity_media_entity_idx
  on public.entity_media (entity_kind, entity_id);

-- ─── Import run ledger (idempotent migration observability) ──────────────────
create table if not exists public.registry_import_runs (
  id              uuid primary key default gen_random_uuid(),
  dataset         text not null,
  source_path     text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  source_rows     int not null default 0,
  inserted        int not null default 0,
  updated         int not null default 0,
  skipped         int not null default 0,
  failed          int not null default 0,
  report          jsonb not null default '{}'::jsonb,
  status          text not null default 'running'
);

create index if not exists registry_import_runs_dataset_idx
  on public.registry_import_runs (dataset, started_at desc);

-- ─── RLS for new catalog tables (public read of active/public rows) ──────────
alter table public.pharmacy_hours enable row level security;
alter table public.provider_delegates enable row level security;
alter table public.entity_contacts enable row level security;
alter table public.entity_services enable row level security;
alter table public.entity_documents enable row level security;
alter table public.entity_media enable row level security;
alter table public.registry_import_runs enable row level security;

drop policy if exists pharmacy_hours_public_read on public.pharmacy_hours;
create policy pharmacy_hours_public_read on public.pharmacy_hours
  for select using (true);

drop policy if exists entity_contacts_public_read on public.entity_contacts;
create policy entity_contacts_public_read on public.entity_contacts
  for select using (is_public = true);

drop policy if exists entity_services_public_read on public.entity_services;
create policy entity_services_public_read on public.entity_services
  for select using (is_active = true);

drop policy if exists entity_media_public_read on public.entity_media;
create policy entity_media_public_read on public.entity_media
  for select using (is_active = true);

-- Delegates / documents / import runs: no anon write; service role bypasses RLS.
-- Authenticated users can read their own delegate rows later via app policies.

commit;
