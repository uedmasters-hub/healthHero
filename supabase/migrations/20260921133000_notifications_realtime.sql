-- Enable live postgres_changes for notifications (+ appointments).
-- Without this, clients only see updates after a full refresh/pull.
-- REPLICA IDENTITY FULL is required so UPDATE/DELETE payloads include
-- user_id (needed for realtime filters).

DO $$
BEGIN
  ALTER TABLE public.notifications REPLICA IDENTITY FULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.appointments REPLICA IDENTITY FULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
