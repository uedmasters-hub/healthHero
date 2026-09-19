-- Backfill public.users / patients for auth.users created before the trigger.

INSERT INTO public.users (id, email, full_name, phone, is_verified)
SELECT
  u.id,
  u.email,
  NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), ''),
  NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'phone', u.phone, '')), ''),
  COALESCE(u.email_confirmed_at IS NOT NULL, false)
FROM auth.users u
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
      phone = COALESCE(public.users.phone, EXCLUDED.phone),
      is_verified = public.users.is_verified OR EXCLUDED.is_verified,
      updated_at = now();

INSERT INTO public.patients (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;
