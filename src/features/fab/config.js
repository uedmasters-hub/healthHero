/**
 * Central FAB configuration — add routes here; do not edit the FAB component.
 *
 * Modes:
 *   hub      — Action Hub (+ expands to Book / Emergency / Live Chat)
 *   utility  — single contextual action (icon on the FAB itself)
 *   hidden   — no FAB
 *
 * Motion (interaction rule):
 *   scroll — Home-style: may ride bottom-nav hide/show while scrolling
 *   fixed  — never translates with scroll (required near sticky CTAs)
 *
 * Sticky-footer rule: screens with a persistent bottom CTA must NEVER use
 * scroll motion. Prefer HIDDEN (secondary actions live in chrome), or FIXED
 * parked above the CTA with --fab-cta-gap clearance.
 */

export const FAB_MODE = Object.freeze({
  HUB: 'hub',
  UTILITY: 'utility',
  HIDDEN: 'hidden',
})

export const FAB_MOTION = Object.freeze({
  /** Home / tab discovery — travels with nav hide/show. */
  SCROLL: 'scroll',
  /** Sticky-footer or non-tab surfaces — position stays put while scrolling. */
  FIXED: 'fixed',
})

/** Shared Action Hub pills (Home / discovery). */
export const HUB_ACTIONS = Object.freeze([
  { id: 'book', label: 'Book Appointment', tone: 'book', icon: 'calendar' },
  { id: 'emergency', label: 'Emergency', tone: 'emergency', icon: 'shield' },
  { id: 'chat', label: 'Live Chat', tone: 'chat', icon: 'chat' },
])

/**
 * Routes that own a sticky bottom CTA (app-flow-footer or StickyFooterCta).
 * The CTA reserves the bottom safe area — FABs must not enter this zone.
 */
export const STICKY_CTA_RULES = Object.freeze([
  (p) => /^\/doctor\/[^/]+\/?$/.test(p),
  (p) => p.startsWith('/appointment'),
  (p) => p.startsWith('/prepare-visit'),
  (p) => p.startsWith('/pre-checkin'),
  (p) => p.startsWith('/process-payment'),
  (p) => p.startsWith('/verify-payment'),
  (p) => p.startsWith('/booking'),
  (p) => p.startsWith('/reschedule'),
  (p) => p.startsWith('/confirm-reschedule'),
  (p) => p.startsWith('/cancel-checkin'),
  (p) => p.startsWith('/video'),
])

export function hasStickyCta(pathname) {
  const path = normalizePath(pathname)
  return STICKY_CTA_RULES.some((test) => test(path))
}

function normalizePath(pathname) {
  if (!pathname) return '/'
  const bare = String(pathname).split('?')[0].split('#')[0]
  if (bare.length > 1 && bare.endsWith('/')) return bare.slice(0, -1)
  return bare || '/'
}

/**
 * Ordered route rules — first match wins.
 * `test` receives pathname (no query). Prefer specific paths before catch-alls.
 *
 * Sticky-CTA screens: mode HIDDEN (or FIXED with explicit clearance). Never SCROLL.
 */
export const FAB_ROUTE_RULES = Object.freeze([
  // ── Hidden (focused workflows + sticky-CTA owners) ───────────────────
  { test: (p) => p.startsWith('/chat'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/booking'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/process-payment'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/auth/confirm'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/auth/callback'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/verify-payment'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/verify'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/login'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/register'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/forgot'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/reset'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/appointment'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/prepare-visit'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/pre-checkin'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/cancel-checkin'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/reschedule'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/confirm-reschedule'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/cart'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/video'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/emergency'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/otp'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p === '/search', mode: FAB_MODE.HIDDEN },
  // Doctor Profile — sticky Book CTA owns the bottom; Share lives in the header.
  { test: (p) => /^\/doctor\/[^/]+\/?$/.test(p), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/doctor/'), mode: FAB_MODE.HIDDEN },

  // ── Action Hub (discovery) — scroll motion with bottom nav ───────────
  {
    test: (p) => p === '/' || p.startsWith('/explore'),
    mode: FAB_MODE.HUB,
    motion: FAB_MOTION.SCROLL,
    actions: HUB_ACTIONS,
  },

  // ── Utility on tab roots — scroll with nav ───────────────────────────
  {
    test: (p) => p === '/treat' || p.startsWith('/treat/'),
    mode: FAB_MODE.UTILITY,
    motion: FAB_MOTION.SCROLL,
    action: {
      id: 'find-treatment',
      label: 'Find treatment',
      icon: 'stethoscope',
      to: '/explore',
    },
  },
  {
    test: (p) => p.startsWith('/pharmacy/') && p !== '/pharmacy/',
    mode: FAB_MODE.UTILITY,
    motion: FAB_MOTION.SCROLL,
    action: {
      id: 'add-to-cart',
      label: 'Add to Cart',
      icon: 'cart',
      kind: 'event',
      event: 'fab:add-to-cart',
    },
  },
  {
    test: (p) => p === '/pharmacy' || p.startsWith('/pharmacy'),
    mode: FAB_MODE.UTILITY,
    motion: FAB_MOTION.SCROLL,
    action: {
      id: 'order-medicine',
      label: 'Order Medicine',
      icon: 'pill',
      kind: 'event',
      event: 'fab:order-medicine',
    },
  },
  {
    test: (p) => p.startsWith('/labs') || p.startsWith('/pathology'),
    mode: FAB_MODE.UTILITY,
    motion: FAB_MOTION.SCROLL,
    action: {
      id: 'book-lab',
      label: 'Book Lab Test',
      icon: 'flask',
      to: '/booking',
    },
  },
  {
    test: (p) => p === '/centers' || p.startsWith('/centers') || p === '/calendar',
    mode: FAB_MODE.UTILITY,
    motion: FAB_MOTION.SCROLL,
    action: {
      id: 'directions',
      label: 'Get Directions',
      icon: 'nav',
      kind: 'directions',
    },
  },
  {
    test: (p) => p === '/settings' || p.startsWith('/settings/'),
    mode: FAB_MODE.UTILITY,
    motion: FAB_MOTION.SCROLL,
    action: {
      id: 'help-center',
      label: 'Help Center',
      icon: 'help',
      to: '/profile/support',
    },
  },

  // ── Utility on non-tab surfaces — fixed (no scroll ride) ─────────────
  {
    test: (p) => p.startsWith('/post-visit-summary') || p.startsWith('/reports'),
    mode: FAB_MODE.UTILITY,
    motion: FAB_MOTION.FIXED,
    action: {
      id: 'share-report',
      label: 'Share Report',
      icon: 'share',
      kind: 'share',
      share: { title: 'Health report', text: 'My health report from eMedicalls' },
    },
  },
  {
    test: (p) => p.startsWith('/profile/records'),
    mode: FAB_MODE.UTILITY,
    motion: FAB_MOTION.FIXED,
    action: {
      id: 'share-report',
      label: 'Share Report',
      icon: 'share',
      kind: 'share',
      share: { title: 'Health records', text: 'My health records from eMedicalls' },
    },
  },
  {
    test: (p) => p.startsWith('/profile/medical') || p.startsWith('/passport'),
    mode: FAB_MODE.UTILITY,
    motion: FAB_MOTION.FIXED,
    action: {
      id: 'upload-record',
      label: 'Upload Record',
      icon: 'upload',
      to: '/profile/records',
    },
  },

  // Default — hide on unlisted screens (notifications, profile hub, etc.)
  { test: () => true, mode: FAB_MODE.HIDDEN },
])
