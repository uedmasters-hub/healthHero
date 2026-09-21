-- Fix ambiguous booking_ref variable in create_provider_conversation.

begin;

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
  v_booking_ref text := nullif(trim(coalesce(p_booking_ref, '')), '');
  v_status text := lower(nullif(trim(coalesce(p_booking_status, '')), ''));
  v_subject text := nullif(trim(coalesce(p_subject, '')), '');
  v_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_appointment_id uuid := p_appointment_id;
  appt public.appointments%rowtype;
  existing public.conversations%rowtype;
  cid uuid;
  created boolean := false;
  eligible boolean := false;
  provider_id uuid := p_provider_user_id;
begin
  if uid is null then
    raise exception 'Sign in to message your care provider.' using errcode = '42501';
  end if;

  if v_booking_ref is null and v_appointment_id is null then
    raise exception 'Choose a booking to chat with your care provider.' using errcode = '22023';
  end if;

  if v_appointment_id is not null then
    select * into appt from public.appointments a where a.id = v_appointment_id;
  elsif v_booking_ref is not null then
    select * into appt
    from public.appointments a
    where a.client_id = v_booking_ref
    order by a.updated_at desc nulls last
    limit 1;
  end if;

  if appt.id is not null then
    if appt.user_id is distinct from uid then
      raise exception 'You can only open chat for your own booking.' using errcode = '42501';
    end if;

    v_status := lower(appt.status::text);
    if v_booking_ref is null and appt.client_id is not null then
      v_booking_ref := appt.client_id;
    end if;
    if v_appointment_id is null then
      v_appointment_id := appt.id;
    end if;

    if provider_id is null and appt.provider_id is not null then
      select d.user_id into provider_id
      from public.doctors d
      where d.id = appt.provider_id
        and d.user_id is not null
      limit 1;
    end if;
  end if;

  if v_status = 'consultation_active' then
    v_status := 'in_progress';
  end if;

  eligible := v_status in ('checked_in', 'in_progress', 'completed');

  if appt.id is null then
    if v_booking_ref is null then
      raise exception 'Choose a booking to chat with your care provider.' using errcode = '22023';
    end if;
    if not eligible then
      raise exception 'Message your provider after you check in for the visit.' using errcode = '22023';
    end if;
  elsif not eligible then
    raise exception 'Message your provider after you check in for the visit.' using errcode = '22023';
  end if;

  if v_booking_ref is not null then
    select * into existing
    from public.conversations c
    where c.kind = 'provider'
      and c.booking_ref = v_booking_ref
      and c.status in ('open', 'escalated')
    limit 1;
  elsif v_appointment_id is not null then
    select * into existing
    from public.conversations c
    where c.kind = 'provider'
      and c.appointment_id = v_appointment_id
      and c.status in ('open', 'escalated')
    limit 1;
  end if;

  if existing.id is not null then
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
      'booking_ref', v_booking_ref,
      'appointment_id', v_appointment_id
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
    coalesce(v_subject, 'Care conversation'),
    v_booking_ref,
    v_appointment_id,
    uid,
    v_meta || jsonb_build_object('booking_status', coalesce(v_status, v_meta->>'booking_status'))
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
      'booking_ref', v_booking_ref,
      'appointment_id', v_appointment_id
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
    'booking_ref', v_booking_ref,
    'appointment_id', v_appointment_id
  );
end;
$$;

notify pgrst, 'reload schema';

commit;
