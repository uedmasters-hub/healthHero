import { useEffect, useMemo, useState } from 'react'
import { highlightMatch, loadRecentSearches } from '../../features/search'
import { queryPharmacies } from '../../features/providers/pharmaciesRepository'
import { pharmacyDisplayTitle } from '../../lib/pharmacyModel'
import '../SearchSuggestions.css'
import './PharmacySearchSuggestions.css'

const SUGGEST_LIMIT = 8
const RECENT_LIMIT = 4
const NEARBY_LIMIT = 6

const SuggestIcon = () => (
  <svg className="search-suggest-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
)

const RecentIcon = () => (
  <svg className="search-suggest-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)

function HighlightedLabel({ text, query }) {
  const parts = highlightMatch(text, query)
  if (typeof parts === 'string') return parts
  return (
    <>
      {parts.before}
      <b>{parts.match}</b>
      {parts.after}
    </>
  )
}

function pharmacyLocation(row) {
  return row?.locationLabel
    || [row?.area || row?.place, row?.city].filter(Boolean).join(', ')
    || row?.address
    || ''
}

function toPharmacySuggestion(row) {
  return {
    type: 'pharmacy',
    id: row.pharmacyUuid || row.id,
    label: pharmacyDisplayTitle(row) || row.name || 'Pharmacy',
    meta: [row.distance, pharmacyLocation(row)].filter(Boolean).join(' · ') || 'Pharmacy',
  }
}

/**
 * Pharmacy-scoped suggestions for the View All search — same rows and motion
 * as Home search, but only pharmacies and pharmacy searches.
 *
 * `searchParams` mirrors the list query so suggestions match the results.
 */
export default function PharmacySearchSuggestions({
  query = '',
  active = false,
  nearby = [],
  searchParams,
  onSelect,
  onSubmit,
}) {
  const trimmed = String(query || '').trim()
  const paramsKey = JSON.stringify(searchParams || {})
  const requestKey = active && trimmed ? `${trimmed}|${paramsKey}` : ''
  const [result, setResult] = useState({ key: '', items: [] })

  useEffect(() => {
    if (!requestKey) return undefined
    let cancelled = false
    const timer = window.setTimeout(() => {
      queryPharmacies({ ...JSON.parse(paramsKey), q: trimmed, page: 0, pageSize: SUGGEST_LIMIT })
        .then((res) => {
          if (cancelled) return
          setResult({
            key: requestKey,
            items: (res.pharmacies || []).slice(0, SUGGEST_LIMIT).map(toPharmacySuggestion),
          })
        })
        .catch(() => {
          if (!cancelled) setResult({ key: requestKey, items: [] })
        })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [requestKey, trimmed, paramsKey])

  const hits = requestKey ? result.items : []
  const loading = Boolean(requestKey) && result.key !== requestKey

  const recents = useMemo(() => {
    if (!active || trimmed) return []
    return loadRecentSearches()
      .filter((item) => item.scope === 'pharmacy')
      .slice(0, RECENT_LIMIT)
  }, [active, trimmed])

  const nearbyItems = useMemo(
    () => (trimmed ? [] : nearby.slice(0, NEARBY_LIMIT).map(toPharmacySuggestion)),
    [nearby, trimmed],
  )

  const renderRow = (item, { icon = <SuggestIcon />, key } = {}) => (
    <button
      type="button"
      key={key || `${item.type}-${item.id ?? item.label}`}
      className="search-suggest-row"
      onClick={() => onSelect?.(item)}
    >
      {icon}
      <span className="search-suggest-text">
        <span className="search-suggest-label">
          <HighlightedLabel text={item.label} query={trimmed} />
        </span>
        {item.meta ? <span className="search-suggest-meta">{item.meta}</span> : null}
      </span>
    </button>
  )

  return (
    <div
      className={`search-suggest rx-search-suggest ${active ? 'is-active' : ''}`}
      aria-hidden={!active}
      {...(active ? {} : { inert: true })}
    >
      {!active ? null : trimmed ? (
        <>
          <button
            type="button"
            className="search-suggest-row"
            onClick={() => onSubmit?.(trimmed)}
          >
            <SuggestIcon />
            <span className="search-suggest-text">
              <span className="search-suggest-label">Search pharmacies for “{trimmed}”</span>
            </span>
          </button>
          {hits.map((item) => renderRow(item))}
          {!loading && !hits.length ? (
            <p className="search-suggest-empty">No pharmacies match “{trimmed}”</p>
          ) : null}
        </>
      ) : (
        <>
          {recents.length ? (
            <>
              <p className="search-suggest-section">Recent searches</p>
              {recents.map((item) => renderRow(item, {
                icon: <RecentIcon />,
                key: `recent-${item.type}-${item.id ?? item.label}`,
              }))}
            </>
          ) : null}
          {nearbyItems.length ? (
            <>
              <p className="search-suggest-section">Nearby pharmacies</p>
              {nearbyItems.map((item) => renderRow(item))}
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
