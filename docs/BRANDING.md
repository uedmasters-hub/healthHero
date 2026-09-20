# Branding — eMedicalls

Product name: **eMedicalls**  
Logo: `https://www.emedicalls.com/img/health_hero.svg` (also `/img/health_hero.svg` in-app)  
Support: `support@emedicalls.com`  
Legal: eMedicalls Technologies Private Limited

## Source of truth

| Concern | Location |
| --- | --- |
| Name, logo, support, storage key names | `src/lib/brand.js` |
| Legacy → new localStorage copy | `src/lib/migrateBrandStorage.js` |
| Browser title / OG / PWA | `index.html`, `public/manifest.webmanifest` |

## Auth emails

In the Supabase dashboard, set sender name and all email templates to **eMedicalls** (see `docs/AUTHENTICATION.md`).

## Intentionally unchanged

- Asset filename `health_hero.svg` (matches production CDN path)
- Historical SQL `stable_uuid('healthhero.*')` namespaces (changing would break IDs)
- Icon pack folder names under `icons/`
