/** Human labels for guest route activity. Auth screens are omitted. */

const PLACES = {
  '/': 'Home',
  '/treat': 'Treat',
  '/pharmacy': 'Pharmacy',
  '/centers': 'Centers',
  '/settings': 'Settings',
  '/chat': 'Messages',
  '/notifications': 'Notifications',
  '/calendar': 'Centers',
  '/pharmacy/browse': 'All pharmacies',
  '/pharmacy/cart': 'Pharmacy cart',
  '/pharmacy/checkout': 'Pharmacy checkout',
  '/pharmacy/orders': 'Pharmacy orders',
  '/profile': 'Guest profile',
  '/booking': 'Booking',
  '/booking/slot': 'Choose a time',
  '/booking/patient': 'Patient details',
  '/booking/confirm': 'Confirm booking',
}

const AUTH = new Set([
  '/login',
  '/register',
  '/forgot',
  '/reset',
  '/verify',
  '/otp',
  '/auth/confirm',
  '/auth/callback',
])

export function describeGuestRoute(pathname) {
  const path = String(pathname || '/').split(/[?#]/)[0] || '/'
  if (AUTH.has(path)) return null
  if (PLACES[path]) return { label: PLACES[path], href: path, kind: 'place' }

  const doctor = path.match(/^\/doctor\/([^/]+)$/)
  if (doctor) return { label: 'Doctor profile', href: path, kind: 'viewed', entityType: 'doctor', entityId: decodeURIComponent(doctor[1]) }

  const article = path.match(/^\/insights\/([^/]+)$/)
  if (article) return { label: 'Article', href: path, kind: 'viewed', entityType: 'insight', entityId: decodeURIComponent(article[1]) }

  const product = path.match(/^\/pharmacy\/product\/([^/]+)$/)
  if (product) return { label: 'Pharmacy product', href: path, kind: 'viewed', entityType: 'product', entityId: decodeURIComponent(product[1]) }

  const store = path.match(/^\/pharmacy\/store\/([^/]+)$/)
  if (store) return { label: 'Pharmacy', href: path, kind: 'viewed', entityType: 'pharmacy', entityId: decodeURIComponent(store[1]) }

  const pharmacy = path.match(/^\/pharmacy\/([^/]+)$/)
  if (pharmacy && !['browse', 'cart', 'checkout', 'orders', 'product', 'store'].includes(pharmacy[1])) {
    return { label: 'Pharmacy', href: path, kind: 'viewed', entityType: 'pharmacy', entityId: decodeURIComponent(pharmacy[1]) }
  }

  const center = path.match(/^\/centers\/([^/]+)$/)
  if (center) return { label: 'Care center', href: path, kind: 'viewed', entityType: 'center', entityId: decodeURIComponent(center[1]) }

  const specialty = path.match(/^\/explore\/([^/]+)$/)
  if (specialty) return { label: 'Specialty', href: path, kind: 'viewed', entityType: 'specialty', entityId: decodeURIComponent(specialty[1]) }

  return { label: 'Page', href: path, kind: 'place' }
}
