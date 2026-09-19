# Supabase

Health Hero uses the linked project `hgfvajxmyhrckihjiswo`.

Identity: `auth.users` → `public.users` → `patients` / `doctors` / `staff`.

Clinical and operational tables come from ordered files in `migrations/`, converted from the former local SQL blueprint.

Apply with:

```bash
supabase db push
```
