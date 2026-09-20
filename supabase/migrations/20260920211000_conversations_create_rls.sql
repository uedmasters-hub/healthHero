-- Fix Conversation Center create flow:
-- PostgREST .insert().select() uses RETURNING, which requires SELECT RLS.
-- Creators were blocked until a participant row existed (chicken-and-egg).
-- Also allow ticket insert right after create for the conversation owner.

begin;

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.can_access_conversation(id)
  );

drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets
  for insert to authenticated
  with check (
    public.can_access_conversation(conversation_id)
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.created_by = auth.uid()
    )
    or public.is_support_agent()
    or public.is_admin()
  );

drop policy if exists conversation_events_insert on public.conversation_events;
create policy conversation_events_insert on public.conversation_events
  for insert to authenticated
  with check (
    public.is_conversation_participant(conversation_id)
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.created_by = auth.uid()
    )
    or public.is_support_agent()
    or public.is_admin()
  );

notify pgrst, 'reload schema';

commit;
