-- Atomic support conversation create:
-- ticket id + conversation + participant + ticket + first user message
-- in one transaction. Rolls back entirely on any failure.

begin;

create or replace function public.create_support_conversation(
  p_category public.support_category default 'general',
  p_body text default null,
  p_subject text default 'Support request',
  p_booking_ref text default null,
  p_appointment_id uuid default null,
  p_assigned_team text default 'Care Support'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tid text;
  cid uuid;
  mid uuid;
  body_text text := nullif(trim(coalesce(p_body, '')), '');
  subject_text text := nullif(trim(coalesce(p_subject, '')), '');
begin
  if uid is null then
    raise exception 'Sign in to contact support.' using errcode = '42501';
  end if;

  if body_text is null then
    raise exception 'Describe your issue before creating a ticket.' using errcode = '22023';
  end if;

  tid := public.next_support_ticket_id();

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
    'support',
    'open',
    coalesce(subject_text, 'Support request'),
    nullif(trim(coalesce(p_booking_ref, '')), ''),
    p_appointment_id,
    uid,
    jsonb_build_object('category', p_category::text)
  )
  returning id into cid;

  insert into public.conversation_participants (
    conversation_id,
    user_id,
    role
  )
  values (cid, uid, 'patient');

  insert into public.support_tickets (
    conversation_id,
    ticket_id,
    category,
    status,
    assigned_team,
    booking_ref,
    appointment_id
  )
  values (
    cid,
    tid,
    p_category,
    'open',
    coalesce(nullif(trim(coalesce(p_assigned_team, '')), ''), 'Care Support'),
    nullif(trim(coalesce(p_booking_ref, '')), ''),
    p_appointment_id
  );

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
    jsonb_build_object('ticket_id', tid, 'category', p_category::text)
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
    format('Support ticket %s created. Our team will reply here.', tid)
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
    uid,
    'patient',
    'text',
    body_text
  )
  returning id into mid;

  -- last_message_at / preview updated by messages_touch_conversation trigger

  return jsonb_build_object(
    'ok', true,
    'conversation_id', cid,
    'ticket_id', tid,
    'message_id', mid,
    'category', p_category::text,
    'status', 'open'
  );
end;
$$;

revoke all on function public.create_support_conversation(
  public.support_category, text, text, text, uuid, text
) from public;

grant execute on function public.create_support_conversation(
  public.support_category, text, text, text, uuid, text
) to authenticated;

notify pgrst, 'reload schema';

commit;
