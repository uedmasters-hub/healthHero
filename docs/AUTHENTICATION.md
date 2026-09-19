# Authentication

Health Hero identity is Supabase Auth. Care data stays in the existing `src/user` health chart, keyed by `auth.users.id`. Do not create a second login system or store passwords in the client.

```
auth.users          Supabase-managed credentials / JWT
    ↓ trigger
public.users        app profile + RBAC (patient | doctor | staff | admin)
    ↓
patients/doctors/staff   future clinical isolation tables
    ↓
src/user store      local health chart (records, insurance, addresses)
```

## Environment

Vite reads only these client keys from `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never put the Secret or Service Role key in the client. Optional: `VITE_APPLE_SIGNIN_ENABLED=true` when Apple credentials exist in Supabase.

## Apply the database

In the Supabase SQL editor, run `supabase/migrations/20260918120000_public_users_rls.sql`, or use the CLI (`supabase db push`) once linked.

The migration:

1. Creates `public.users` referencing `auth.users(id)`
2. Creates stub `patients`, `doctors`, `staff` tables
3. Inserts a `public.users` + `patients` row from a trigger on `auth.users` insert
4. Enables RLS: users read/update themselves; admin helper `public.is_admin()` is ready for later modules

Profile rows are never created from the browser.

## Routes

| Kind | Paths |
| --- | --- |
| Guest | `/login` `/register` `/forgot` `/verify` `/reset` |
| Protected | all healthcare screens inside `AppRoutes` |
| Public | `/design` (outside `AuthProvider` / phone frame) |

Unauthenticated users are redirected to `/login`. Password-recovery sessions can only finish on `/reset`.

## Files

| File | Role |
| --- | --- |
| `src/lib/supabase.js` | Browser client (PKCE, persist, auto-refresh) |
| `src/features/auth/AuthProvider.jsx` | Session restore, auth methods |
| `src/features/auth/hooks/useSession.js` | Session selector |
| `src/features/auth/hooks/useAuth.js` | Provider consumer |
| `src/features/auth/services/authService.js` | Email auth + error mapping |
| `src/features/auth/services/oauth.js` | Google live, Apple prepared |
| `src/features/auth/components/ProtectedRoute.jsx` | Healthcare gate |
| `src/features/auth/components/GuestRoute.jsx` | Guest-only gate |
| `src/features/auth/pages/VerifyEmailPage.jsx` | Email confirmation |
| `src/features/auth/pages/ResetPasswordPage.jsx` | Recovery password update |
| `src/components/auth/*` | Existing Health Hero auth UI |
| `src/user/store.js` `attachAuthenticatedUser` | Bind chart to auth id |

## OAuth

Google uses `signInWithOAuth` with PKCE and `redirectTo` the current origin. Enable the Google provider in the Supabase dashboard.

Apple uses the same path. The Apple button stays disabled until `VITE_APPLE_SIGNIN_ENABLED=true` and the Apple provider is configured (Services ID, key, redirect `http://localhost:5173/**`).

## Email templates

Redirect URLs already expected by the app:

- Site URL: `http://localhost:5173`
- Confirm signup → `/verify`
- Reset password → `/reset`
