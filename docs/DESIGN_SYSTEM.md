# eMedicalls design system

HealthHero's UI speaks the **PocketPills** production language. Every screen is
composed from one set of tokens and one set of primitives; page stylesheets only
position those primitives. Live reference: **`/design/components/primitives`**
(renders the real components, so it cannot drift).

## Language in one screen

| Area | Rule |
| --- | --- |
| Type | Satoshi 400 / 500 / 700 only. Sizes 11 · 12 · 13 · 15 · 16 · 18 · 20 · 23 · 26 · 29 · 41 through `--text-*-size` roles. Headings 500 at 1.2 with 0 tracking; body 400 at 1.5 with 0.02em; caps 13px / 700 / 0.04em. Leading only via `--leading-*`; tracking via `--tracking` so each element resolves em against its own size. Nothing below 11px. |
| Colour | CTA = neutral-800 ink (hover neutral-600). Links and headline ink = primary-950. Eyebrow = primary-600. |
| Canvas | Lavender page (`--bg` = neutral-100) with **white islands** (cards, lists, fields). |
| Edges | Hairlines only: primary-800 at 12% (default), 9% (divider), 20% (strong). No resting shadows. |
| Radius | 8 / 16 / 24 / 36 / full. Cards 24, compact cards 16, fields 16, **every button is a pill**. |
| Interaction | Colour only: hover primary-300, pressed mix, selected lavender or ink fill. No scale. |
| Focus | 3px primary-500 ring, 2px offset (`--focus-ring`). Fields show a primary-600 edge. |
| Motion | 200ms ease-in-out for state; reveals 380ms `cubic(0.22,1,0.36,1)`; enters use fadeUp `cubic(0.16,1,0.3,1)`. |
| Loading | Lavender skeleton with a white sheen, 1.55s (`.shimmer` / `.ds-skel`). |
| Icons | 24px grid, stroke 1.7, round caps (enforced globally for `stroke="currentColor"`). |

## Layers

`src/index.css` imports, in order:

1. **`styles/tokens.css`** — PP primitives → semantic roles (`--color-cta`, `--color-link`,
   `--surface-*`, `--border-*`, `--state-*`) → component tokens (`--btn-*`, `--card-*`,
   `--chip-*`, `--field-*`, `--badge-*`, `--island-*`, `--map-*`) → legacy aliases that
   map old names onto PP values. **Never write a hex outside this file.**
2. **`styles/base.css`** — fonts, reset, focus ring, typography roles
   (`.ds-display/-heading/-title/-body/-label/-caption/-overline`), `.ds-link`.
3. **`styles/motion.css`** — every keyframe defined once (`fadeIn/Out`, `fadeUp`,
   `slideUp`, `sheetUp/Down`, `ds-spin`, `shimmer`…), skeleton sheen, reveal host.
4. **`styles/primitives.css`** — the component library (below).
5. **`styles/overlays.css`** — bottom sheet, sheet header/options, dialog.
6. **`styles/flow.css`** — flow CTA bars (`.app-flow-*`, `.sticky-footer-cta*`) and the
   care-journey status tone maps (`.upcoming-badge`, `.relay-chip`, `.relay-panel`).

## Primitives (`src/components/ui`)

| React | Class | Notes |
| --- | --- | --- |
| `Button` | `.ds-btn--{primary,secondary,outline,ghost,text,danger,danger-quiet,glass,inverse}` `--{sm,md,lg}` `--block` | `icon`, `trailingIcon`, `loading`, `as="a"` |
| `IconButton`, `BackButton` | `.ds-icon-btn` `is-{subtle,filled,brand,muted,glass,sm-size}` | Always pass `label` |
| `AppBar` | `.ds-app-bar` | `title`, `subtitle`, `onBack`, `actions`, `lead={null}` for no back |
| `Card` | `.ds-card` `is-{padded,compact,interactive,selected,tinted,muted}` | No shadows |
| `List`, `ListRow`, `DetailRow` | `.ds-list`, `.ds-list-row` | Grouped rows; `DetailRow` = caption label over value |
| `Disclosure` | `.ds-disclosure` | FAQ / guidance rows inside a `List` |
| `SectionHead` | `.ds-section-head` (+ `group` → caps `.ds-section-title`) | `action` slot for text buttons |
| `Chip`, `ChipRow`, `ChoiceChips` | `.ds-chip` (`--soft`, `--sm`), `.ds-chip-row` (`is-bleed`, `is-wrap`) | Selected via `aria-pressed` |
| — | `.ds-segmented` / `__item` | Visit type, tabs |
| `Badge` | `.ds-badge is-{neutral,primary,info,success,warning,danger,ready,solid,glass,muted}` | `caps` |
| `QuantityStepper` | `.ds-qty` `--{sm,md,lg}` `--block` `is-{active,disabled}` | "Add" morphs into `[− n +]` and back at 0; stateless (`value`/`onChange`); focus follows the morph |
| `CountBadge` | `.ds-count.is-anchored` on `.ds-icon-btn--count` | Header cart / bell count; re-keyed so each change bumps (`ds-bump`) |
| `TextField`, `FormGroup` | `.ds-field` (`is-multiline`, `is-button`), `.ds-field-label/-hint/-error`, `.ds-form`, `.ds-form-row` | Inputs/textarea take `className="ds-field"` directly |
| `SearchField` | `.ds-search` | |
| `Switch`, `CheckboxMark`, `Choice`, `ChoiceList` | `.ds-switch`, `.ds-checkbox`, `.ds-choice`, `.ds-radio` | Rows carry `role`/`aria-checked` |
| `Callout` | `.ds-callout is-{info,success,warning,danger,neutral}` | `title`, `icon` |
| `EmptyState` | `.ds-empty` (`is-card`, `is-compact`) | `icon` or `image`, `action` |
| `Skeleton`, `SkeletonText` | `.ds-skel` / `.shimmer` | |
| `Steps` | `.ds-steps` / `.ds-step is-{done,active}` | `marker` override |
| `InfoGrid`, `InfoCell`, `QuickAction` | `.ds-info-grid`, `.ds-action-row` | Appointment summaries |
| `Progress` | `.ds-progress` (`is-thin`, `is-brand`) | |
| `SheetHeader` | `.ds-sheet-header` | Every sheet title + close |
| `EndOfPage` | `.end-of-page-placeholder` | "You've reached the end" |
| `Icon.*` | — | Stroke 1.7 set (Back, Close, Chevron*, Calendar, Clock, User(s), Pin, Phone, Video, Card, Info, Alert, Share, Download, Upload, File, Message, Pill, Heart, Bell, Refresh, ArrowRight…) |

Page shell: `.ds-page` + `AppBar` + `.ds-page__body` (`has-fixed-footer` above
`StickyFooterCta`). Tab roots clear the nav with `--tab-root-clearance`.

## Pharmacy commerce

- **Cart state** lives in `src/features/pharmacy/cartStore.js` — one store for every
  pharmacy screen (`useCart`, `useCartCount`, `useCartItem`, `setCartQuantity`,
  `flushCart`). Taps update the UI immediately; writes are coalesced per product and
  upserted to Supabase (`setDrugQuantity`), with rollback on failure.
- **Header cart**: `components/pharmacy/CartButton` — add it to the header actions of
  any new pharmacy screen (not Cart or Checkout). It appears once the cart has items.
- **Product bits** (`components/pharmacy/ProductBits.jsx`): `ProductArt`, `PriceTag`,
  `CartStepper` (a `QuantityStepper` bound to the cart), `ProductMiniCard` (rails) and
  `TrustStrip`. Shop tiles, the medicine page, cart and checkout all use these.
- **Medicine content** comes from `drugs.monograph` (jsonb; keys `dosage`,
  `side_effects`, `uses`, `warnings`, `precautions`, `interactions`, `how_to_take`,
  `storage`) and `drugs.salt_composition`. Missing entries show neutral guidance —
  never invent clinical detail in the UI.

## Rules for screen stylesheets

1. A screen file may set layout: grid/flex, gaps, widths, order, positioning,
   page-specific choreography. It may **not** restate a primitive's colour, border,
   radius, type or interaction.
2. Need a variant? Add a modifier to the primitive (and to the Primitives docs page),
   then use it everywhere.
3. Values come from tokens. `rem` for fixed sizes; spacing from `--space-*`.
4. No local keyframes for generic motion — use `motion.css`.
5. Docs chrome (`src/design-system`) uses its own `ds-doc-*` names and a
   `:where()` reset so it never leaks into the product.

## Verification

- `npx vite build` — must pass.
- `node scripts/sanity-*.mjs` — accessibility/behaviour checks assert primitives
  (five scripts fail on extensionless ESM imports, unrelated to UI).
- `npm run lint` (oxlint).
- `/design/components/primitives` — visual check of every primitive.

Remaining raw colours live only in `PhoneFrame.css` (the desktop device mock, not
product UI).
