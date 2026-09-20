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

Vite client keys (Vercel Project → Environment Variables):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key only |
| `VITE_APP_ORIGIN` | Canonical public origin for **all** auth redirects (production: `https://www.emedicalls.com`) |
| `VITE_APPLE_SIGNIN_ENABLED` | Optional; enable Apple button when provider is configured |

Never put the Secret or Service Role key in the client.

`getAppOrigin()` prefers `VITE_APP_ORIGIN` so email / OAuth callbacks never target a protected `*.vercel.app` preview URL.

## Shared auth callback

Google OAuth, email confirmation, and password recovery all redirect to:

`{VITE_APP_ORIGIN}/auth/callback`

Flow:

1. Supabase redirects the browser to `/auth/callback?code=…`
2. `AuthGate` renders `AuthCallbackPage` **before** Login / Onboarding guards
3. PKCE `?code=` is exchanged once (`detectSessionInUrl` + idempotent `exchangeCodeForSession`)
4. Query params are scrubbed so refresh does not re-process the code
5. Session established → navigate `/` (Onboarding overlay only if first-time)
6. Recovery (`?next=reset`) → `/reset`

## Supabase URL configuration

Dashboard → Authentication → URL Configuration:

| Setting | Value |
| --- | --- |
| Site URL | `https://www.emedicalls.com` |
| Redirect URLs | `https://www.emedicalls.com/auth/callback` |
| | `https://www.emedicalls.com/**` |
| | `http://localhost:5173/auth/callback` |
| | `http://localhost:5173/**` |

Google provider authorized redirect stays the Supabase callback  
`https://<project>.supabase.co/auth/v1/callback` — Supabase then forwards to Site URL `/auth/callback`.

## Vercel Deployment Protection (critical)

If Vercel Authentication / Deployment Protection is enabled on **Production**, email verification and OAuth land on the Vercel login wall instead of Health Hero.

**Required for production auth:**

1. Vercel → Project `health_hero` → **Deployment Protection**
2. Set production to **Only Preview Deployments** (or disable protection on production)
3. Keep `www.emedicalls.com` / `emedicalls.com` publicly accessible
4. Do **not** put auth redirect URLs on protected preview hostnames

Vercel cannot exclude a single path like `/auth/callback` from Deployment Protection for normal GET requests — production must be public.

## Apply the database

In the Supabase SQL editor, run the identity migrations (or `supabase db push`), including:

- `20260918120000_public_users_rls.sql`
- `20260920110000_onboarding_completed.sql`

## Routes

| Kind | Paths |
| --- | --- |
| Auth callback | `/auth/callback` (public; processes `?code=` first) |
| Guest | `/login` `/register` `/forgot` `/verify` `/reset` |
| Protected | all healthcare screens inside `AppRoutes` |
| Public | `/design` (outside phone frame) |

## Onboarding

1. Splash while `AuthProvider` waits for `INITIAL_SESSION`
2. No session → Login / Register
3. Session + `onboarding_completed = false` → Onboarding once
4. Mark complete (Supabase + per-user local cache) → Home
5. Returning users: Splash → Home

Never clear the Supabase session when onboarding finishes.

## Files

| File | Role |
| --- | --- |
| `src/lib/supabase.js` | Client + `getAppOrigin` / `authRedirectTo` |
| `src/features/auth/AuthProvider.jsx` | Session restore; wait for INITIAL_SESSION |
| `src/features/auth/pages/AuthCallbackPage.jsx` | Shared callback router |
| `src/components/auth/AuthGate.jsx` | Callback-first gate |
| `src/features/auth/services/oauth.js` | Google / Apple PKCE |
| `src/features/auth/services/authService.js` | Email auth + `exchangeCodeFromUrl` |
| `vercel.json` | SPA rewrite + no-store on `/auth/callback` |
