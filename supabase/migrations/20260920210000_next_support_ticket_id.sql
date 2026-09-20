-- Ensure parameterless public.next_support_ticket_id() exists and is callable
-- via supabase.rpc('next_support_ticket_id') with no arguments.
-- Format: SUP-YYMM-###### (UTC), concurrency-safe via support_ticket_seq.

begin;

create sequence if not exists public.support_ticket_seq;

create or replace function public.next_support_ticket_id()
returns text
language plpgsql
security definer
set search_path = public
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

revoke all on function public.next_support_ticket_id() from public;
grant execute on function public.next_support_ticket_id() to authenticated;
grant usage, select on sequence public.support_ticket_seq to authenticated;

-- Refresh PostgREST schema cache so RPC is visible immediately.
notify pgrst, 'reload schema';

commit;
