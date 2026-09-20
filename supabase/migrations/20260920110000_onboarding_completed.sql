-- Persist product onboarding separately from auth credentials.
-- Client may cache locally for fast startup; public.users remains source of truth.

begin;

alter table public.users
  add column if not exists onboarding_completed boolean not null default false;

comment on column public.users.onboarding_completed is
  'True after the user finishes the first-run product onboarding. Independent of auth.users session.';

commit;
