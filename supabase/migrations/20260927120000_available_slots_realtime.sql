-- Live updates for the shared slot calendar.
-- Clients subscribe to public.available_slots; events arrive only after
-- this table is in the supabase_realtime publication.

DO $$
BEGIN
  ALTER TABLE public.available_slots REPLICA IDENTITY FULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'available_slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.available_slots;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
