# Nepal registry → Supabase (production)

eMedicalls uses **Supabase as the single backend** for doctors (NMC), health facilities (HF), and pharmacies (DDA).

## Ownership model

| Layer | Table / columns | Role |
|-------|-----------------|------|
| Government registry (immutable IDs) | `public.providers` (`nmc_number`, `source_key`, `external_ref`) | Canonical NMC catalog — **do not** copy into `public.doctors` |
| Claim / account | `providers.user_id` | Links an eMedicalls user to an existing registry row |
| Organization | `providers.org_id` | Network / practice ownership for multi-branch onboarding |

Claim via RPC: `claim_provider_registry(provider_id)` (authenticated). Official identifiers cannot be changed except by admins (trigger-enforced).

## Public data contract (views)

Frontend repositories query **views**, not raw tables:

| View | Purpose |
|------|---------|
| `v_provider_search` | Global provider discovery (active registry + claimed) |
| `v_verified_doctors` | Verified/claimed doctors only |
| `v_healthcare_centers_public` | Active facilities browse |
| `v_verified_healthcare_centers` | Verified facilities |
| `v_pharmacies_public` | Active pharmacies browse |
| `v_verified_pharmacies` | Verified pharmacies |
| `v_nepal_address_lookup` | District/city lookup from HF registry |

## Client discovery

Runtime doctor discovery uses `queryProviders` / `searchProviders` against `v_provider_search` (active doctors only). The listing page paginates live results; Home warm-cache uses `hydrateProviders` for a small featured window. There is **no** seeded doctor catalog in the client bundle.

## Permanent tooling

| Path | Purpose |
|------|---------|
| `scripts/migrate/run-registry-migration.mjs` | Discover → upsert → report |
| `scripts/migrate/validate-registry.mjs` | Integrity audit vs source datasets |
| `scripts/migrate/lib/*` | Shared env / IO / mappers / upsert / report |
| `scripts/data/registry/*` | Canonical UTF-8 datasets |
| `supabase/migrations/20260922170000_provider_registry_evolution.sql` | Registry columns + onboarding tables |
| `supabase/migrations/20260922183000_provider_registry_hardening.sql` | Indexes, RLS, views, claim RPC, ID protection |
| `supabase/migrations/20260922190000_nepal_first_localization.sql` | NP country defaults, address view, safe seed cleanup |

The temporary `API/` folder is **removed**. Re-imports use `scripts/data/registry` + `npm run migrate:registry` only.

## Credentials

`.env.migration` (gitignored):

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Never put the service role in `VITE_*` client env.

## Commands

```bash
supabase db push
npm run migrate:registry      # idempotent import
npm run migrate:validate      # uniqueness / orphan / count audit
npm run migrate:registry:promote
```

## Official identifiers

| Dataset | ID | Storage |
|---------|----|---------|
| NMC | **NMC Number** | `providers.nmc_number`, `source_key=nmc:{nmc}` |
| Facilities | **HF Code** | `healthcare_centers.hf_code`, `source_key=hf:{code}` |
| Pharmacies | **Registration No** (Pharmacy Code) | `pharmacies.pharmacy_code`, `source_key=dda:{code}` |

## Future onboarding (already scaffolded)

Tables ready without breaking migrations: `provider_delegates`, `entity_contacts`, `entity_services`, `entity_documents`, `entity_media`, `pharmacy_hours`, `healthcare_centers.parent_id` (branches), `verification_status` on providers/centers/pharmacies.
