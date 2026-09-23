/**
 * Contextual search engine — live Supabase + local taxonomy.
 * Voice and typed queries share this pipeline.
 */

import { pickDoctorCredentials, searchProviders } from '../providers'
import { searchCenters } from '../providers/centersRepository'
import { queryPharmacies, searchDrugs } from '../providers/pharmaciesRepository'
import { SEARCH_SERVICES } from '../../data/searchCatalog'
import { getTreatSearchSuggestions } from '../../lib/treatSearch'
import { normalizeSearchQuery, textMatchesQuery } from './searchMatch'
import { SCOPE_DOMAINS } from './scopes'
import { searchSpecialties } from './specialtyTerms'
import { loadRecentSearches } from './recentSearches'

function doctorHit(doc) {
  const creds = pickDoctorCredentials(doc)
  const name = String(doc.name || '').replace(/^Dr\.?\s*/i, '')
  return {
    type: 'doctor',
    id: doc.providerUuid || doc.id,
    label: `Dr. ${name}`,
    meta: [doc.specialty, creds.line].filter(Boolean).join(' · '),
    kindRank: 0,
  }
}

function pharmacyHit(row) {
  return {
    type: 'pharmacy',
    id: row.id,
    label: row.name,
    meta: [row.city || row.district || row.place, 'Pharmacy'].filter(Boolean).join(' · '),
    kindRank: 2,
  }
}

function centerHit(row) {
  return {
    type: 'center',
    id: row.id || row.hfCode || row.sourceKey,
    label: row.name,
    meta: [row.typeLabel || row.type, row.city || row.district].filter(Boolean).join(' · '),
    kindRank: 3,
  }
}

function medicineHit(row) {
  return {
    type: 'medicine',
    id: row.id,
    label: row.name,
    meta: [row.genericName, row.form, 'Medicine'].filter(Boolean).join(' · '),
    kindRank: 1,
  }
}

function serviceHits(query) {
  return SEARCH_SERVICES
    .filter((service) => textMatchesQuery(service.name, query))
    .slice(0, 4)
    .map((service) => ({
      type: 'service',
      label: service.name,
      to: service.to,
      meta: 'Service',
      kindRank: 4,
    }))
}

function dedupe(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = `${item.type}:${item.id ?? item.label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * @param {object} options
 * @param {string} options.scope
 * @param {string} options.query
 * @param {object} [options.treatContext] — { visits, health } for treat/universal records
 * @param {number} [options.limit]
 */
export async function runContextualSearch({
  scope = 'home',
  query = '',
  treatContext = null,
  limit = 12,
} = {}) {
  const domains = SCOPE_DOMAINS[scope] || SCOPE_DOMAINS.home
  const needle = normalizeSearchQuery(query)

  if (!needle) {
    const recent = loadRecentSearches().map((item) => ({
      ...item,
      meta: item.meta || 'Recent',
      isRecent: true,
      kindRank: -1,
    }))
    if (domains.includes('specialties')) {
      return dedupe([...recent, ...searchSpecialties('', { limit: 6 })]).slice(0, limit)
    }
    if (domains.includes('records') && treatContext) {
      return getTreatSearchSuggestions('', treatContext).slice(0, limit)
    }
    return recent.slice(0, limit)
  }

  const tasks = []

  if (domains.includes('doctors')) {
    tasks.push(
      searchProviders(query, { limit: 8 })
        .then((rows) => (rows || []).map(doctorHit))
        .catch(() => []),
    )
  }

  if (domains.includes('specialties')) {
    tasks.push(Promise.resolve(searchSpecialties(query, { limit: 6 })))
  }

  if (domains.includes('pharmacies')) {
    tasks.push(
      queryPharmacies({ q: query, page: 0, pageSize: 8, force: true })
        .then((result) => (result.pharmacies || []).map(pharmacyHit))
        .catch(() => []),
    )
  }

  if (domains.includes('centers')) {
    tasks.push(
      searchCenters(query, { limit: 8 })
        .then((rows) => (rows || []).map(centerHit))
        .catch(() => []),
    )
  }

  if (domains.includes('medicines')) {
    tasks.push(
      searchDrugs(query, { limit: 6 })
        .then((rows) => (rows || []).map(medicineHit))
        .catch(() => []),
    )
  }

  if (domains.includes('services')) {
    tasks.push(Promise.resolve(serviceHits(query)))
  }

  if (domains.includes('records') && treatContext) {
    tasks.push(Promise.resolve(getTreatSearchSuggestions(query, treatContext)))
  }

  const chunks = await Promise.all(tasks)
  const merged = dedupe(chunks.flat())

  merged.sort((a, b) => {
    const ka = a.kindRank ?? 9
    const kb = b.kindRank ?? 9
    if (ka !== kb) return ka - kb
    return String(a.label || '').localeCompare(String(b.label || ''))
  })

  // Soft keep — domain queries already constrain relevance.
  return merged.slice(0, limit)
}
