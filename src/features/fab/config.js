/**
 * Central FAB configuration — add routes here; do not edit the FAB component.
 *
 * Modes:
 *   hub      — Action Hub (+ expands to Book / Emergency / Live Chat)
 *   utility  — single contextual action (icon on the FAB itself)
 *   hidden   — no FAB
 */

export const FAB_MODE = Object.freeze({
  HUB: 'hub',
  UTILITY: 'utility',
  HIDDEN: 'hidden',
})

/** Shared Action Hub pills (Home / discovery). */
export const HUB_ACTIONS = Object.freeze([
  { id: 'book', label: 'Book Appointment', tone: 'book', icon: 'calendar' },
  { id: 'emergency', label: 'Emergency', tone: 'emergency', icon: 'shield' },
  { id: 'chat', label: 'Live Chat', tone: 'chat', icon: 'chat' },
])

/**
 * Ordered route rules — first match wins.
 * `test` receives pathname (no query). Prefer specific paths before catch-alls.
 */
export const FAB_ROUTE_RULES = Object.freeze([
  // ── Hidden (focused workflows) ───────────────────────────────────────
  { test: (p) => p.startsWith('/booking'), mode: FAB_MODE.HIDDEN },
  { test: (p) => p.startsWith('/process-payment'), mode: FAB_MODE.HIDDEN },
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

  // ── Action Hub (discovery) ───────────────────────────────────────────
  {
    test: (p) => p === '/' || p.startsWith('/explore'),
    mode: FAB_MODE.HUB,
    actions: HUB_ACTIONS,
  },

  // ── Utility (contextual) ─────────────────────────────────────────────
  {
    test: (p) => p === '/treat' || p.startsWith('/treat/'),
    mode: FAB_MODE.UTILITY,
    action: {
      id: 'find-treatment',
      label: 'Find treatment',
      icon: 'stethoscope',
      to: '/explore',
    },
  },
  {
    test: (p) => /^\/doctor\/[^/]+\/?$/.test(p),
    mode: FAB_MODE.UTILITY,
    action: {
      id: 'share-profile',
      label: 'Share Profile',
      icon: 'share',
      kind: 'share',
      share: { title: 'Doctor on Health Hero', text: 'Check out this doctor on Health Hero' },
    },
  },
  {
    test: (p) => p.startsWith('/pharmacy/') && p !== '/pharmacy/',
    mode: FAB_MODE.UTILITY,
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
    action: {
      id: 'directions',
      label: 'Get Directions',
      icon: 'nav',
      kind: 'directions',
    },
  },
  {
    test: (p) => p.startsWith('/post-visit-summary') || p.startsWith('/reports'),
    mode: FAB_MODE.UTILITY,
    action: {
      id: 'share-report',
      label: 'Share Report',
      icon: 'share',
      kind: 'share',
      share: { title: 'Health report', text: 'My health report from Health Hero' },
    },
  },
  {
    test: (p) => p.startsWith('/profile/records'),
    mode: FAB_MODE.UTILITY,
    action: {
      id: 'share-report',
      label: 'Share Report',
      icon: 'share',
      kind: 'share',
      share: { title: 'Health records', text: 'My health records from Health Hero' },
    },
  },
  {
    test: (p) => p.startsWith('/profile/medical') || p.startsWith('/passport'),
    mode: FAB_MODE.UTILITY,
    action: {
      id: 'upload-record',
      label: 'Upload Record',
      icon: 'upload',
      to: '/profile/records',
    },
  },
  {
    test: (p) => p === '/settings' || p.startsWith('/settings/'),
    mode: FAB_MODE.UTILITY,
    action: {
      id: 'help-center',
      label: 'Help Center',
      icon: 'help',
      to: '/profile/support',
    },
  },

  // Default — hide on unlisted screens (notifications, profile hub, etc.)
  { test: () => true, mode: FAB_MODE.HIDDEN },
])
