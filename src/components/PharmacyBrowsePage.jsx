import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import EmptyState from './EmptyState'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { usePushBack } from '../features/pushNav'
import {
  queryPharmacies,
  clearPharmaciesQueryCache,
  mapsPharmacyDirectionsUrl,
  PHARMACIES_PAGE_SIZE,
  PHARMACY_TYPE_FILTERS,
} from '../features/providers/pharmaciesRepository'
import { formatPlaceParts } from '../features/geography/formatPlace'
import { flowState } from '../lib/careFlow'
import {
  NEPAL_LOCATION_OPTIONS,
  NEPAL_DEFAULT_LOCATION,
  ALL_NEPAL_LOCATION,
  NEPAL_DEFAULT_COORDS,
  detectNepalCityFromDevice,
} from '../data/nepalGeography'
import './PharmacyBrowsePage.css'
import './SelectProvider.css'

const PAGE_SIZE = PHARMACIES_PAGE_SIZE || 24

function formatResultsCount({ shown, total }) {
  return `Showing ${Number(shown || 0).toLocaleString('en-NP')} of ${Number(total || 0).toLocaleString('en-NP')}`
}

function BrowseSkeleton({ count = 4 }) {
  return (
    <div className="pharmacy-browse-skel" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pharmacy-browse-skel-card">
          <div className="pharmacy-browse-skel-line wide shimmer" />
          <div className="pharmacy-browse-skel-line mid shimmer" />
          <div className="pharmacy-browse-skel-line short shimmer" />
        </div>
      ))}
    </div>
  )
}

export default function PharmacyBrowsePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = usePushBack(-1)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const scrollRef = useRef(null)
  const requestIdRef = useRef(0)

  const initial = location.state || {}
  const [search, setSearch] = useState(initial.q || '')
  const [debouncedSearch, setDebouncedSearch] = useState(initial.q || '')
  const [selectedLocation, setSelectedLocation] = useState(initial.location || NEPAL_DEFAULT_LOCATION)
  const [selectedType, setSelectedType] = useState('all')
  const [activeSheet, setActiveSheet] = useState(null)
  const [origin] = useState(NEPAL_DEFAULT_COORDS)
  const [pharmacies, setPharmacies] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    detectNepalCityFromDevice().then((city) => {
      if (cancelled || !city || initial.location) return
      setSelectedLocation((prev) => (prev === NEPAL_DEFAULT_LOCATION ? city : prev))
    })
    return () => { cancelled = true }
  }, [initial.location])

  const loadPage = useCallback(async ({ page: nextPage, append = false } = {}) => {
    const reqId = ++requestIdRef.current
    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setError(null)
    }

    const result = await queryPharmacies({
      q: debouncedSearch,
      city: selectedLocation,
      type: selectedType,
      page: nextPage,
      pageSize: PAGE_SIZE,
      force: !append,
      origin,
    })

    if (reqId !== requestIdRef.current) return

    if (result.error && !result.pharmacies?.length) {
      setError(result.error)
      if (!append) {
        setPharmacies([])
        setTotalCount(0)
        setHasMore(false)
      }
    } else {
      setError(null)
      setPharmacies((prev) => (append ? [...prev, ...result.pharmacies] : result.pharmacies))
      setTotalCount(result.total || 0)
      setHasMore(Boolean(result.hasMore))
      setPage(result.page)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [debouncedSearch, selectedLocation, selectedType, origin])

  useEffect(() => {
    loadPage({ page: 0, append: false })
  }, [loadPage])

  const onRefresh = useCallback(async () => {
    clearPharmaciesQueryCache()
    await loadPage({ page: 0, append: false })
  }, [loadPage])

  const ptr = usePullToRefresh(scrollRef, onRefresh)

  const openPharmacy = (pharmacy) => {
    const id = pharmacy.pharmacyUuid || pharmacy.pharmacyCode || pharmacy.id
    if (!id) return
    navigate(`/pharmacy/${id}`, {
      state: flowState(location, { origin: 'pharmacy-browse', returnTo: '/pharmacy/browse' }),
    })
  }

  const typeLabel = PHARMACY_TYPE_FILTERS.find((t) => t.id === selectedType)?.label || 'All types'
  const countLabel = useMemo(
    () => formatResultsCount({ shown: pharmacies.length, total: totalCount }),
    [pharmacies.length, totalCount],
  )

  return (
    <div className="pharmacy-browse page-push-in">
      <header className="pharmacy-browse-header">
        <button type="button" className="pharmacy-browse-back" data-push-back onClick={goBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="pharmacy-browse-title">All pharmacies</h1>
        <span className="pharmacy-browse-spacer" />
      </header>

      <div className="pharmacy-browse-toolbar">
        <SearchBar
          mode="inline"
          scope="pharmacy"
          placeholder="Search pharmacies or medicines…"
          query={search}
          onQueryChange={setSearch}
        />
        <div className="pharmacy-browse-filters">
          <button
            type="button"
            className="pharmacy-browse-chip is-active"
            onClick={() => { setActiveSheet('location'); show() }}
          >
            {selectedLocation === ALL_NEPAL_LOCATION ? 'All Nepal' : selectedLocation}
          </button>
          <button
            type="button"
            className={`pharmacy-browse-chip ${selectedType !== 'all' ? 'is-active' : ''}`}
            onClick={() => { setActiveSheet('type'); show() }}
          >
            {typeLabel}
          </button>
        </div>
        {!loading && !error ? (
          <p className="pharmacy-browse-count">{countLabel}</p>
        ) : null}
      </div>

      <div className="pharmacy-browse-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        {loading ? <BrowseSkeleton /> : null}
        {!loading && error ? (
          <div className="pharmacy-browse-state">
            <EmptyState image="/img/empty_state/pharmacy.png" alt="" title="Couldn’t load pharmacies" message={error} />
            <button type="button" className="pharmacy-browse-retry" onClick={() => loadPage({ page: 0 })}>Try again</button>
          </div>
        ) : null}
        {!loading && !error && !pharmacies.length ? (
          <div className="pharmacy-browse-state">
            <EmptyState
              image="/img/empty_state/pharmacy.png"
              alt=""
              title="No pharmacies found"
              message="Try another location or search term."
            />
          </div>
        ) : null}
        {!loading && !error && pharmacies.length ? (
          <ul className="pharmacy-browse-list">
            {pharmacies.map((pharmacy) => {
              const locationLabel = formatPlaceParts(pharmacy.place, pharmacy.city, pharmacy.district) || pharmacy.address
              const directionsUrl = mapsPharmacyDirectionsUrl(pharmacy)
              return (
                <li key={pharmacy.pharmacyUuid || pharmacy.id}>
                  <article className="pharmacy-browse-card">
                    <button type="button" className="pharmacy-browse-main" onClick={() => openPharmacy(pharmacy)}>
                      <div>
                        <strong className="pharmacy-browse-name">{pharmacy.name}</strong>
                        <span className="pharmacy-browse-meta">
                          {[pharmacy.pharmacyType, pharmacy.licenseNumber ? `Lic. ${pharmacy.licenseNumber}` : null].filter(Boolean).join(' · ')}
                        </span>
                        {locationLabel ? <span className="pharmacy-browse-location">{locationLabel}</span> : null}
                        <span className="pharmacy-browse-extras">
                          {[pharmacy.delivers ? 'Delivery available' : null, pharmacy.distance].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    </button>
                    <div className="pharmacy-browse-actions">
                      {directionsUrl ? (
                        <a className="pharmacy-browse-action" href={directionsUrl} target="_blank" rel="noreferrer">Directions</a>
                      ) : null}
                      <button type="button" className="pharmacy-browse-action is-primary" onClick={() => openPharmacy(pharmacy)}>
                        Order
                      </button>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        ) : null}
        {!loading && !error && hasMore ? (
          <button
            type="button"
            className="pharmacy-browse-more"
            disabled={loadingMore}
            onClick={() => loadPage({ page: page + 1, append: true })}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        ) : null}
      </div>

      {isPresented && activeSheet === 'location' ? (
        <AppBottomSheet open closing={isClosing} onClose={() => { hide(); setActiveSheet(null) }} labelledBy="browse-loc" sheetClassName="filter-sheet">
          <div className="ds-sheet-header">
            <h3 id="browse-loc">Location</h3>
            <button type="button" className="ds-sheet-close" onClick={() => { hide(); setActiveSheet(null) }} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /></svg>
            </button>
          </div>
          <div className="filter-options">
            {NEPAL_LOCATION_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt}
                className={`filter-option ${selectedLocation === opt ? 'active' : ''}`}
                onClick={() => { setSelectedLocation(opt); hide(); setActiveSheet(null) }}
              >
                <div className="filter-option-circle" />
                <span className="filter-option-label">{opt}</span>
              </button>
            ))}
          </div>
        </AppBottomSheet>
      ) : null}

      {isPresented && activeSheet === 'type' ? (
        <AppBottomSheet open closing={isClosing} onClose={() => { hide(); setActiveSheet(null) }} labelledBy="browse-type" sheetClassName="filter-sheet">
          <div className="ds-sheet-header">
            <h3 id="browse-type">Pharmacy type</h3>
            <button type="button" className="ds-sheet-close" onClick={() => { hide(); setActiveSheet(null) }} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /></svg>
            </button>
          </div>
          <div className="filter-options">
            {PHARMACY_TYPE_FILTERS.map((opt) => (
              <button
                type="button"
                key={opt.id}
                className={`filter-option ${selectedType === opt.id ? 'active' : ''}`}
                onClick={() => { setSelectedType(opt.id); hide(); setActiveSheet(null) }}
              >
                <div className="filter-option-circle" />
                <span className="filter-option-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </AppBottomSheet>
      ) : null}
    </div>
  )
}
