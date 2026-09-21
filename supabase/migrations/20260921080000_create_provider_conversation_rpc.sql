-- Secure provider conversation create (SECURITY DEFINER).
-- Patients must not insert conversation_participants from the client —
-- RETURNING/SELECT chicken-and-egg and least-privilege both require an RPC.
-- Also tighten RLS: read via participation; creates go through RPCs.

begin;

-- Helper: ensure an active participant row (respects partial unique index).
create or replace function public.ensure_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid,
  p_role public.conversation_participant_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_conversation_id is null or p_user_id is null then
    return;
  end if;

  update public.conversation_participants
  set left_at = null,
      role = p_role
  where conversation_id = p_conversation_id
    and user_id = p_user_id
    and left_at is not null;

  if found then
    return;
  end if;

  if exists (
    select 1
    from public.conversation_participants
    where conversation_id = p_conversation_id
      and user_id = p_user_id
      and left_at is null
  ) then
    return;
  end if;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values (p_conversation_id, p_user_id, p_role);
end;
$$;

revoke all on function public.ensure_conversation_participant(
  uuid, uuid, public.conversation_participant_role
) from public;

-- ── RPC: get-or-create provider conversation for an eligible booking ───────
create or replace function public.create_provider_conversation(
  p_booking_ref text default null,
  p_booking_status text default null,
  p_appointment_id uuid default null,
  p_subject text default 'Care conversation',
  p_metadata jsonb default '{}'::jsonb,
  p_provider_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  booking_ref text := nullif(trim(coalesce(p_booking_ref, '')), '');
  status_text text := lower(nullif(trim(coalesce(p_booking_status, '')), ''));
  subject_text text := nullif(trim(coalesce(p_subject, '')), '');
  meta jsonb := coalesce(p_metadata, '{}'::jsonb);
  appt public.appointments%rowtype;
  existing public.conversations%rowtype;
  cid uuid;
  created boolean := false;
  eligible boolean := false;
  owns boolean := false;
  provider_id uuid := p_provider_user_id;
begin
  if uid is null then
    raise exception 'Sign in to message your care provider.' using errcode = '42501';
  end if;

  if booking_ref is null and p_appointment_id is null then
    raise exception 'Choose a booking to chat with your care provider.' using errcode = '22023';
  end if;

  -- Resolve remote appointment when linked (by id or local client_id / booking_ref).
  if p_appointment_id is not null then
    select * into appt from public.appointments where id = p_appointment_id;
  elsif booking_ref is not null then
    select * into appt
    from public.appointments
    where client_id = booking_ref
    order by updated_at desc nulls last
    limit 1;
  end if;

  if appt.id is not null then
    owns := (appt.user_id = uid);
    if not owns then
      raise exception 'You can only open chat for your own booking.' using errcode = '42501';
    end if;

    -- Prefer canonical appointment status when a remote row exists.
    status_text := lower(appt.status::text);
    if booking_ref is null and appt.client_id is not null then
      booking_ref := appt.client_id;
    end if;
    if p_appointment_id is null then
      p_appointment_id := appt.id;
    end if;

    -- Optional: resolve provider auth user from appointments.provider_id → doctors/users
    if provider_id is null and appt.provider_id is not null then
      select d.user_id into provider_id
      from public.doctors d
      where d.id = appt.provider_id
        and d.user_id is not null
      limit 1;
    end if;
  end if;

  -- Normalize aliases
  if status_text = 'consultation_active' then
    status_text := 'in_progress';
  end if;

  eligible := status_text in ('checked_in', 'in_progress', 'completed');

  -- Local booking engine path (no remote appointment yet): require eligible status
  -- and ensure any existing conversation for this booking belongs to this patient.
  if appt.id is null then
    if booking_ref is null then
      raise exception 'Choose a booking to chat with your care provider.' using errcode = '22023';
    end if;
    if not eligible then
      raise exception 'Message your provider after you check in for the visit.' using errcode = '22023';
    end if;
    owns := true;
  elsif not eligible then
    raise exception 'Message your provider after you check in for the visit.' using errcode = '22023';
  end if;

  -- Reuse existing open/escalated provider conversation for this booking.
  if booking_ref is not null then
    select * into existing
    from public.conversations c
    where c.kind = 'provider'
      and c.booking_ref = booking_ref
      and c.status in ('open', 'escalated')
    limit 1;
  elsif p_appointment_id is not null then
    select * into existing
    from public.conversations c
    where c.kind = 'provider'
      and c.appointment_id = p_appointment_id
      and c.status in ('open', 'escalated')
    limit 1;
  end if;

  if existing.id is not null then
    -- Only the owning patient (or an existing participant) may reopen.
    if existing.created_by is distinct from uid
      and not exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = existing.id
          and cp.user_id = uid
          and cp.left_at is null
      )
    then
      raise exception 'You can only open chat for your own booking.' using errcode = '42501';
    end if;

    cid := existing.id;

    perform public.ensure_conversation_participant(cid, uid, 'patient');

    if provider_id is not null and provider_id is distinct from uid then
      perform public.ensure_conversation_participant(cid, provider_id, 'provider');
    end if;

    return jsonb_build_object(
      'ok', true,
      'conversation_id', cid,
      'created', false,
      'booking_ref', booking_ref,
      'appointment_id', p_appointment_id
    );
  end if;

  insert into public.conversations (
    kind,
    status,
    subject,
    booking_ref,
    appointment_id,
    created_by,
    metadata
  )
  values (
    'provider',
    'open',
    coalesce(subject_text, 'Care conversation'),
    booking_ref,
    p_appointment_id,
    uid,
    meta || jsonb_build_object('booking_status', coalesce(status_text, meta->>'booking_status'))
  )
  returning id into cid;

  created := true;

  perform public.ensure_conversation_participant(cid, uid, 'patient');

  if provider_id is not null and provider_id is distinct from uid then
    perform public.ensure_conversation_participant(cid, provider_id, 'provider');
  end if;

  insert into public.conversation_events (
    conversation_id,
    event_type,
    actor_id,
    payload
  )
  values (
    cid,
    'created',
    uid,
    jsonb_build_object(
      'kind', 'provider',
      'booking_ref', booking_ref,
      'appointment_id', p_appointment_id
    )
  );

  insert into public.messages (
    conversation_id,
    sender_id,
    sender_role,
    message_type,
    body
  )
  values (
    cid,
    null,
    'system',
    'system',
    'Conversation started for your booking. Messages stay with this visit.'
  );

  return jsonb_build_object(
    'ok', true,
    'conversation_id', cid,
    'created', created,
    'booking_ref', booking_ref,
    'appointment_id', p_appointment_id
  );
end;
$$;

revoke all on function public.create_provider_conversation(
  text, text, uuid, text, jsonb, uuid
) from public;

grant execute on function public.create_provider_conversation(
  text, text, uuid, text, jsonb, uuid
) to authenticated;

-- ── Tighten RLS (least privilege; creates via SECURITY DEFINER RPCs) ───────

-- Patients/providers read only conversations they participate in.
-- Support agents retain access to support threads; admins unrestricted via helper.
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated
  using (public.can_access_conversation(id));

-- Client inserts disabled for patients — use create_*_conversation RPCs.
drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check (public.is_admin() or public.is_support_agent());

-- Participants: read own membership or via conversation access.
drop policy if exists conversation_participants_select on public.conversation_participants;
create policy conversation_participants_select on public.conversation_participants
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_access_conversation(conversation_id)
  );

-- No broad patient INSERT into participants — RPC / agents only.
drop policy if exists conversation_participants_insert on public.conversation_participants;
create policy conversation_participants_insert on public.conversation_participants
  for insert to authenticated
  with check (
    public.is_admin()
    or public.is_support_agent()
    or (
      -- Allow a participant to add themselves only when they already have access
      -- (e.g. support agent joining an open support thread after being granted access).
      user_id = auth.uid()
      and public.can_access_conversation(conversation_id)
    )
  );

-- Messages: participants only (unchanged intent, reaffirm).
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

notify pgrst, 'reload schema';

commit;
