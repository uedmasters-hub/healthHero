-- Conversation Center: persistent messaging for provider + support chats.
-- Keeps telehealth_messages separate (in-visit only).
-- Ticket IDs: SUP-YYMM-###### via next_support_ticket_id().

begin;

-- ── Enums ──────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'conversation_kind') then
    create type public.conversation_kind as enum ('provider', 'support');
  end if;
  if not exists (select 1 from pg_type where typname = 'conversation_status') then
    create type public.conversation_status as enum ('open', 'resolved', 'closed', 'escalated');
  end if;
  if not exists (select 1 from pg_type where typname = 'conversation_participant_role') then
    create type public.conversation_participant_role as enum (
      'patient', 'provider', 'support_agent', 'system'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'conversation_message_type') then
    create type public.conversation_message_type as enum (
      'text', 'system', 'attachment', 'image', 'file', 'voice_note'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'support_category') then
    create type public.support_category as enum (
      'general', 'billing', 'technical', 'booking', 'clinical', 'pharmacy', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'support_ticket_status') then
    create type public.support_ticket_status as enum (
      'open', 'pending', 'escalated', 'resolved', 'closed'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'conversation_event_type') then
    create type public.conversation_event_type as enum (
      'created', 'assigned', 'escalated', 'resolved', 'reopened', 'closed', 'participant_joined', 'participant_left'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'attachment_kind') then
    create type public.attachment_kind as enum (
      'prescription', 'lab_report', 'invoice', 'medical_image', 'pdf', 'voice_note', 'other'
    );
  end if;
end
$$;

-- ── Ticket ID generator: SUP-YYMM-###### ───────────────────────────────────
create sequence if not exists public.support_ticket_seq;

create or replace function public.next_support_ticket_id()
returns text
language plpgsql
as $$
declare
  seq bigint;
  yy text;
  mm text;
begin
  seq := nextval('public.support_ticket_seq');
  yy := to_char(timezone('utc', now()), 'YY');
  mm := to_char(timezone('utc', now()), 'MM');
  return 'SUP-' || yy || mm || '-' || lpad(seq::text, 6, '0');
end;
$$;

create or replace function public.is_support_agent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('staff', 'admin'), false);
$$;

-- ── conversations ──────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id                uuid primary key default gen_random_uuid(),
  kind              public.conversation_kind not null,
  status            public.conversation_status not null default 'open',
  subject           text,
  booking_ref       text,
  appointment_id    uuid references public.appointments (id) on delete set null,
  pharmacy_order_id uuid references public.pharmacy_orders (id) on delete set null,
  created_by        uuid not null references public.users (id) on delete restrict,
  last_message_at   timestamptz,
  last_message_preview text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint conversations_provider_needs_booking check (
    kind <> 'provider' or booking_ref is not null or appointment_id is not null or pharmacy_order_id is not null
  )
);

create index if not exists conversations_kind_idx on public.conversations (kind);
create index if not exists conversations_created_by_idx on public.conversations (created_by);
create index if not exists conversations_booking_ref_idx on public.conversations (booking_ref);
create index if not exists conversations_appointment_idx on public.conversations (appointment_id);
create index if not exists conversations_pharmacy_order_idx on public.conversations (pharmacy_order_id);
create index if not exists conversations_last_message_idx on public.conversations (last_message_at desc nulls last);

-- One active provider conversation per booking_ref
create unique index if not exists conversations_provider_booking_unique
  on public.conversations (booking_ref)
  where kind = 'provider' and booking_ref is not null and status in ('open', 'escalated');

create unique index if not exists conversations_provider_pharmacy_unique
  on public.conversations (pharmacy_order_id)
  where kind = 'provider' and pharmacy_order_id is not null and status in ('open', 'escalated');

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ── support_tickets ────────────────────────────────────────────────────────
create table if not exists public.support_tickets (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  ticket_id       text not null unique,
  category        public.support_category not null default 'general',
  status          public.support_ticket_status not null default 'open',
  assigned_team   text,
  assigned_to     uuid references public.users (id) on delete set null,
  booking_ref     text,
  appointment_id  uuid references public.appointments (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_category_idx on public.support_tickets (category);
create index if not exists support_tickets_assigned_to_idx on public.support_tickets (assigned_to);

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ── conversation_participants ──────────────────────────────────────────────
create table if not exists public.conversation_participants (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.users (id) on delete cascade,
  role            public.conversation_participant_role not null,
  joined_at       timestamptz not null default now(),
  left_at         timestamptz,
  last_read_at    timestamptz,
  metadata        jsonb not null default '{}'::jsonb
);

create unique index if not exists conversation_participants_active_unique
  on public.conversation_participants (conversation_id, user_id)
  where left_at is null;

create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id)
  where left_at is null;

create index if not exists conversation_participants_conversation_idx
  on public.conversation_participants (conversation_id);

-- ── messages ───────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid references public.users (id) on delete set null,
  sender_role     public.conversation_participant_role not null default 'patient',
  message_type    public.conversation_message_type not null default 'text',
  body            text,
  metadata        jsonb not null default '{}'::jsonb,
  client_id       text,
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  deleted_at      timestamptz
);

create unique index if not exists messages_client_id_unique
  on public.messages (conversation_id, client_id)
  where client_id is not null;

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists messages_sender_idx on public.messages (sender_id);

-- Keep conversation preview fresh
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(coalesce(new.body, ''), 160),
    updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- ── message_attachments ────────────────────────────────────────────────────
create table if not exists public.message_attachments (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid not null references public.messages (id) on delete cascade,
  kind            public.attachment_kind not null default 'other',
  storage_path    text not null,
  file_name       text,
  mime_type       text,
  size_bytes      bigint,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists message_attachments_message_idx on public.message_attachments (message_id);

-- ── conversation_events (system timeline) ──────────────────────────────────
create table if not exists public.conversation_events (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  event_type      public.conversation_event_type not null,
  actor_id        uuid references public.users (id) on delete set null,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists conversation_events_conversation_idx
  on public.conversation_events (conversation_id, created_at);

-- ── Access helpers ─────────────────────────────────────────────────────────
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
      and cp.left_at is null
  );
$$;

create or replace function public.can_access_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or public.is_conversation_participant(p_conversation_id)
    or (
      public.is_support_agent()
      and exists (
        select 1 from public.conversations c
        where c.id = p_conversation_id and c.kind = 'support'
      )
    );
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.support_tickets enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.conversation_events enable row level security;

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated
  using (public.can_access_conversation(id));

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check (created_by = auth.uid() or public.is_admin() or public.is_support_agent());

drop policy if exists conversations_update on public.conversations;
create policy conversations_update on public.conversations
  for update to authenticated
  using (public.can_access_conversation(id))
  with check (public.can_access_conversation(id));

drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets
  for select to authenticated
  using (public.can_access_conversation(conversation_id));

drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets
  for insert to authenticated
  with check (public.can_access_conversation(conversation_id) or public.is_support_agent() or public.is_admin());

drop policy if exists support_tickets_update on public.support_tickets;
create policy support_tickets_update on public.support_tickets
  for update to authenticated
  using (public.is_support_agent() or public.is_admin() or public.can_access_conversation(conversation_id))
  with check (public.is_support_agent() or public.is_admin() or public.can_access_conversation(conversation_id));

drop policy if exists conversation_participants_select on public.conversation_participants;
create policy conversation_participants_select on public.conversation_participants
  for select to authenticated
  using (public.can_access_conversation(conversation_id));

drop policy if exists conversation_participants_insert on public.conversation_participants;
create policy conversation_participants_insert on public.conversation_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.is_support_agent()
    or public.is_admin()
    or public.can_access_conversation(conversation_id)
  );

drop policy if exists conversation_participants_update on public.conversation_participants;
create policy conversation_participants_update on public.conversation_participants
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_support_agent()
    or public.is_admin()
  )
  with check (
    user_id = auth.uid()
    or public.is_support_agent()
    or public.is_admin()
  );

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (public.can_access_conversation(conversation_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    public.is_conversation_participant(conversation_id)
    or public.is_support_agent()
    or public.is_admin()
  );

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated
  using (sender_id = auth.uid() or public.is_admin())
  with check (sender_id = auth.uid() or public.is_admin());

drop policy if exists message_attachments_select on public.message_attachments;
create policy message_attachments_select on public.message_attachments
  for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.can_access_conversation(m.conversation_id)
    )
  );

drop policy if exists message_attachments_insert on public.message_attachments;
create policy message_attachments_insert on public.message_attachments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and (
          public.is_conversation_participant(m.conversation_id)
          or public.is_support_agent()
          or public.is_admin()
        )
    )
  );

drop policy if exists conversation_events_select on public.conversation_events;
create policy conversation_events_select on public.conversation_events
  for select to authenticated
  using (public.can_access_conversation(conversation_id));

drop policy if exists conversation_events_insert on public.conversation_events;
create policy conversation_events_insert on public.conversation_events
  for insert to authenticated
  with check (
    public.is_conversation_participant(conversation_id)
    or public.is_support_agent()
    or public.is_admin()
  );

-- ── Grants ─────────────────────────────────────────────────────────────────
grant usage on schema public to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert, update on public.conversation_participants to authenticated;
grant select, insert, update on public.messages to authenticated;
grant select, insert on public.message_attachments to authenticated;
grant select, insert on public.conversation_events to authenticated;
grant usage, select on sequence public.support_ticket_seq to authenticated;
grant execute on function public.next_support_ticket_id() to authenticated;
grant execute on function public.is_support_agent() to authenticated;
grant execute on function public.is_conversation_participant(uuid) to authenticated;
grant execute on function public.can_access_conversation(uuid) to authenticated;

-- ── Realtime ───────────────────────────────────────────────────────────────
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversation_events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null;
  end;
end
$$;

-- ── Storage bucket for chat attachments ────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/wav'
  ]
)
on conflict (id) do nothing;

drop policy if exists chat_attachments_select on storage.objects;
create policy chat_attachments_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.can_access_conversation((split_part(name, '/', 1))::uuid)
  );

drop policy if exists chat_attachments_insert on storage.objects;
create policy chat_attachments_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (
      public.is_conversation_participant((split_part(name, '/', 1))::uuid)
      or public.is_support_agent()
      or public.is_admin()
    )
  );

drop policy if exists chat_attachments_delete on storage.objects;
create policy chat_attachments_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (public.is_admin() or owner = auth.uid())
  );

commit;
