/**
 * Contextual search scopes for eMedicalls tabs / surfaces.
 * PocketPills pageSearch adapted to Home, Treat, Pharmacy, Centers, etc.
 */

export const SEARCH_SCOPES = {
  home: 'home',
  treat: 'treat',
  pharmacy: 'pharmacy',
  centers: 'centers',
  doctors: 'doctors',
  universal: 'universal',
}

/** Domains queried for each scope. */
export const SCOPE_DOMAINS = {
  home: ['doctors', 'specialties', 'pharmacies', 'centers', 'services', 'medicines'],
  treat: ['records', 'doctors'],
  pharmacy: ['pharmacies', 'medicines'],
  centers: ['centers'],
  doctors: ['doctors', 'specialties'],
  universal: ['doctors', 'specialties', 'pharmacies', 'centers', 'services', 'medicines', 'records'],
}

export const SCOPE_COPY = {
  home: {
    placeholder: 'Try "fever", "acne", or a doctor name…',
    idlePlaceholder: 'Search Doctor',
    ariaLabel: 'Search doctors, pharmacies, centres…',
    listeningEn: 'Listening in English… speak, then pause',
    listeningNe: 'Listening in Nepali… speak, then pause',
  },
  treat: {
    placeholder: 'Search your care, visits, and records…',
    idlePlaceholder: 'Search your care, visits, and records…',
    ariaLabel: 'Search your care, visits, and records…',
    listeningEn: 'Listening in English… speak, then pause',
    listeningNe: 'Listening in Nepali… speak, then pause',
  },
  pharmacy: {
    placeholder: 'Search pharmacies or medicines…',
    idlePlaceholder: 'Search pharmacies or medicines…',
    ariaLabel: 'Search pharmacies or medicines…',
    listeningEn: 'Listening in English… speak, then pause',
    listeningNe: 'Listening in Nepali… speak, then pause',
  },
  centers: {
    placeholder: 'Search hospitals, clinics, and labs…',
    idlePlaceholder: 'Search hospitals, clinics, and labs…',
    ariaLabel: 'Search hospitals, clinics, and labs…',
    listeningEn: 'Listening in English… speak, then pause',
    listeningNe: 'Listening in Nepali… speak, then pause',
  },
  doctors: {
    placeholder: 'Name, city or degree',
    idlePlaceholder: 'Name, city or degree',
    ariaLabel: 'Search doctors',
    listeningEn: 'Listening in English… speak, then pause',
    listeningNe: 'Listening in Nepali… speak, then pause',
  },
  universal: {
    placeholder: 'Search doctors, pharmacies, centres…',
    idlePlaceholder: 'Search doctors, pharmacies, centres…',
    ariaLabel: 'Search everything',
    listeningEn: 'Listening in English… speak, then pause',
    listeningNe: 'Listening in Nepali… speak, then pause',
  },
}

export function resolveSearchScope(pathname = '', explicit = null) {
  if (explicit && SCOPE_COPY[explicit]) return explicit
  const path = String(pathname || '')
  if (path.startsWith('/treat')) return SEARCH_SCOPES.treat
  if (path.startsWith('/pharmacy')) return SEARCH_SCOPES.pharmacy
  if (path.startsWith('/centers') || path.startsWith('/facility')) return SEARCH_SCOPES.centers
  if (path.startsWith('/booking') || path.startsWith('/explore')) return SEARCH_SCOPES.doctors
  if (path === '/search' || path === '/' || path.startsWith('/home')) return SEARCH_SCOPES.home
  return SEARCH_SCOPES.universal
}

export function getScopeCopy(scope) {
  return SCOPE_COPY[scope] || SCOPE_COPY.universal
}
