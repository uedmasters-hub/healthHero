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
| `VITE_APP_ORIGIN` | Fallback public origin (production: `https://www.emedicalls.com`) |
| `VITE_APPLE_SIGNIN_ENABLED` | Optional; enable Apple button when provider is configured |

Never put the Secret or Service Role key in the client.

Redirects use **`${window.location.origin}/auth/confirm`** at runtime (localhost ↔ production). `VITE_APP_ORIGIN` is only a fallback when `window` is unavailable; Vercel `*.vercel.app` hosts are never used.

## Shared auth confirm (`/auth/confirm`)

Google OAuth, Magic Link, email confirmation, and password recovery all resolve here:

`{origin}/auth/confirm`

Flow:

1. Supabase redirects the browser to `/auth/confirm?code=…`
2. `AuthGate` renders `AuthConfirmPage` **before** Login / Onboarding guards
3. Waits for AuthProvider session restore, then exchanges PKCE `?code=` if still present
4. Query params are scrubbed so refresh does not re-process the code
5. Session established → `replace` navigate `/` (Onboarding overlay only if first-time)
6. Recovery (`?next=reset`) → `/reset`
7. Legacy `/auth/callback` permanently redirects to `/auth/confirm`

## Email OTP (primary) + Magic Link (fallback)

1. Login collects email → `signInWithOtp` with `emailRedirectTo = /auth/confirm`
2. App navigates immediately to `/otp`
3. User enters the 6-digit code → `verifyOtp` in-app → Home / Onboarding
4. If the user opens the Magic Link instead, `/auth/confirm` completes the session the same way

Password sign-in remains available via “Sign in with password” on Login.

## Supabase URL configuration

Dashboard → Authentication → URL Configuration:

| Setting | Value |
| --- | --- |
| Site URL | `https://www.emedicalls.com` |
| Redirect URLs | `https://www.emedicalls.com/auth/confirm` |
| | `https://www.emedicalls.com/auth/callback` |
| | `https://www.emedicalls.com/**` |
| | `http://localhost:5173/auth/confirm` |
| | `http://localhost:5173/auth/callback` |
| | `http://localhost:5173/**` |

Google provider authorized redirect stays the Supabase callback  
`https://<project>.supabase.co/auth/v1/callback` — Supabase then forwards to `/auth/confirm`.

## Google Sign-In production checklist

1. Open the app only at **https://www.emedicalls.com** (not `*.vercel.app`).
2. Supabase → Authentication → URL Configuration:
   - **Site URL:** `https://www.emedicalls.com`
   - **Redirect URLs** include `/auth/confirm` (and legacy `/auth/callback`) for production + localhost
3. Remove any `*.vercel.app` entries from Site URL / Redirect URLs.
4. Vercel → Deployment Protection: production = **Only Preview Deployments** (or off).
5. Optional: `VITE_APP_ORIGIN=https://www.emedicalls.com`

If Site URL still points at a protected Vercel host, Google will finish on Google’s consent screen and then open `vercel.com/login?next=…`.

## Apply the database

In the Supabase SQL editor, run the identity migrations (or `supabase db push`), including:

- `20260918120000_public_users_rls.sql`
- `20260920110000_onboarding_completed.sql`

## Routes

| Kind | Paths |
| --- | --- |
| Auth confirm | `/auth/confirm` (public; SSOT for OAuth / Magic Link / recovery) |
| Legacy alias | `/auth/callback` → `/auth/confirm` |
| Guest | `/login` `/otp` `/register` `/forgot` `/verify` `/reset` |
| Protected | all healthcare screens inside `AppRoutes` |
| Public | `/design` (outside phone frame) |

## Onboarding

1. Splash while `AuthProvider` waits for `INITIAL_SESSION`
2. No session → Login / Register
3. Session + `onboarding_completed = false` → Onboarding once
4. Mark complete (Supabase + per-user local cache) → Home
5. Returning users: Splash → Home

Never clear the Supabase session when onboarding finishes.

## Session ownership (no duplicates)

| Concern | Owner |
| --- | --- |
| `onAuthStateChange` / boot | `AuthProvider` only |
| OAuth / Magic Link completion | `AuthConfirmPage` only |
| Onboarding once | `OnboardingProvider` + `public.users.onboarding_completed` |
| Guest / protected redirects | `AuthGate` + `GuestRoute` / `ProtectedRoute` |

Do not add extra `getSession` / `onAuthStateChange` / login redirects in Splash, Layout, or page components.

## Files

| File | Role |
| --- | --- |
| `src/lib/appOrigin.js` | Dynamic `${origin}/auth/confirm` |
| `src/lib/supabase.js` | Client + `authRedirectTo` |
| `src/features/auth/AuthProvider.jsx` | Session restore; wait for INITIAL_SESSION |
| `src/features/auth/pages/AuthConfirmPage.jsx` | Shared confirm router |
| `src/components/auth/AuthGate.jsx` | Confirm-first gate |
| `src/components/auth/LoginPage.jsx` | OTP-primary + Google |
| `src/components/auth/OtpPage.jsx` | In-app OTP verify |
| `src/features/auth/services/oauth.js` | Google / Apple PKCE |
| `src/features/auth/services/authService.js` | OTP + email + exchange |
| `vercel.json` | SPA rewrite + no-store on `/auth/confirm` |
