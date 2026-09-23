import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import EmptyState from './EmptyState'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import {
  queryCenters,
  clearCentersQueryCache,
  CENTERS_PAGE_SIZE,
} from '../features/providers/centersRepository'
import { formatPlaceParts } from '../features/geography/formatPlace'
import { flowState } from '../lib/careFlow'
import {
  NEPAL_LOCATION_OPTIONS,
  NEPAL_DEFAULT_LOCATION,
  ALL_NEPAL_LOCATION,
  NEPAL_DEFAULT_COORDS,
  detectNepalCityFromDevice,
} from '../data/nepalGeography'
import './CentersPage.css'
import './SelectProvider.css'

const PAGE_SIZE = CENTERS_PAGE_SIZE || 24

function formatResultsHeading(location) {
  if (location === ALL_NEPAL_LOCATION) return 'Facilities across Nepal'
  if (location) return `Facilities near ${location}`
  return 'Healthcare Centers'
}

function formatResultsCount({ shown, total }) {
  const shownLabel = Number(shown || 0).toLocaleString('en-NP')
  const totalLabel = Number(total || 0).toLocaleString('en-NP')
  return `Showing ${shownLabel} of ${totalLabel}`
}

function CentersSkeleton({ count = 4 }) {
  return (
    <div className="centers-skel-stack" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="centers-skel-card">
          <div className="centers-skel-img shimmer" />
          <div className="centers-skel-copy">
            <div className="centers-skel-line wide shimmer" />
            <div className="centers-skel-line mid shimmer" />
            <div className="centers-skel-line short shimmer" />
          </div>
        </div>
      ))}
    </div>
  )
}

function readDeviceOrigin() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 },
    )
  })
}

export default function CentersPage() {
  const navigate = useNavigate()
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const scrollRef = useRef(null)
  const requestIdRef = useRef(0)
  const gpsTriedRef = useRef(false)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(NEPAL_DEFAULT_LOCATION)
  const [origin, setOrigin] = useState(NEPAL_DEFAULT_COORDS)
  const [centers, setCenters] = useState([])
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

  // Nearby-first: detect device city once; fall back stays Kathmandu.
  useEffect(() => {
    if (gpsTriedRef.current) return undefined
    gpsTriedRef.current = true
    let cancelled = false
    Promise.all([
      detectNepalCityFromDevice(),
      readDeviceOrigin(),
    ]).then(([city, coords]) => {
      if (cancelled) return
      if (coords) setOrigin(coords)
      if (city) {
        setSelectedLocation((prev) => (
          prev === NEPAL_DEFAULT_LOCATION || prev === ALL_NEPAL_LOCATION ? city : prev
        ))
      }
    })
    return () => { cancelled = true }
  }, [])

  const loadPage = useCallback(async ({ page: nextPage, append = false } = {}) => {
    const reqId = ++requestIdRef.current
    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setError(null)
    }

    const result = await queryCenters({
      q: debouncedSearch,
      city: selectedLocation,
      sort: 'name',
      page: nextPage,
      pageSize: PAGE_SIZE,
      force: !append,
      origin,
    })

    if (reqId !== requestIdRef.current) return

    if (result.error && !result.centers?.length) {
      setError(result.error)
      if (!append) {
        setCenters([])
        setTotalCount(0)
        setHasMore(false)
      }
    } else {
      setError(null)
      setCenters((prev) => (append ? [...prev, ...result.centers] : result.centers))
      setTotalCount(result.total || 0)
      setHasMore(Boolean(result.hasMore))
      setPage(result.page)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [debouncedSearch, selectedLocation, origin])

  useEffect(() => {
    loadPage({ page: 0, append: false })
  }, [loadPage])

  const onRefresh = useCallback(async () => {
    clearCentersQueryCache()
    await loadPage({ page: 0, append: false })
  }, [loadPage])

  const ptr = usePullToRefresh(scrollRef, onRefresh)

  const loadMore = () => {
    if (loadingMore || loading || !hasMore) return
    loadPage({ page: page + 1, append: true })
  }

  const openFacility = (center) => {
    const id = center.providerUuid || center.hfCode || center.id
    if (!id) return
    navigate(`/centers/${id}`, {
      state: flowState(null, { origin: 'centers', returnTo: '/centers' }),
    })
  }

  const openLocationFilter = () => show()
  const closeLocationFilter = () => hide()

  const heading = useMemo(
    () => formatResultsHeading(selectedLocation),
    [selectedLocation],
  )

  const countLabel = useMemo(
    () => formatResultsCount({ shown: centers.length, total: totalCount }),
    [centers.length, totalCount],
  )

  return (
    <div className="centers-page">
      <header className="centers-page-header">
        <h1 className="centers-page-title">Healthcare Centers</h1>
        <p className="centers-page-subtitle">Discover nearby hospitals and clinics</p>
      </header>

      <div className="centers-page-toolbar">
        <SearchBar
          mode="inline"
          scope="centers"
          placeholder="Search hospitals, clinics, and labs…"
          query={search}
          onQueryChange={setSearch}
        />
        <div className="centers-filter-row" role="toolbar" aria-label="Facility filters">
          <button type="button" className="centers-filter-chip is-active" onClick={openLocationFilter}>
            {selectedLocation || NEPAL_DEFAULT_LOCATION}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        {!loading && !error ? (
          <div className="centers-results-meta">
            <h2 className="centers-results-heading">{heading}</h2>
            <p className="centers-results-count">{countLabel}</p>
          </div>
        ) : null}
      </div>

      <div className="centers-page-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />

        {loading ? <CentersSkeleton /> : null}

        {!loading && error ? (
          <div className="centers-state">
            <EmptyState
              image="/img/empty_state/hospital.png"
              alt=""
              title="Couldn’t load facilities"
              message={error}
            />
            <button type="button" className="centers-retry" onClick={() => loadPage({ page: 0 })}>
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && !centers.length ? (
          <div className="centers-state">
            <EmptyState
              image="/img/empty_state/hospital.png"
              alt=""
              title="No facilities found"
              message={
                selectedLocation === ALL_NEPAL_LOCATION
                  ? 'Try a different search term.'
                  : `Nothing matched near ${selectedLocation}. Try searching all of Nepal.`
              }
            />
            <div className="centers-empty-actions">
              {search ? (
                <button type="button" className="centers-retry is-secondary" onClick={() => setSearch('')}>
                  Clear search
                </button>
              ) : null}
              {selectedLocation !== ALL_NEPAL_LOCATION ? (
                <button
                  type="button"
                  className="centers-retry"
                  onClick={() => setSelectedLocation(ALL_NEPAL_LOCATION)}
                >
                  Search all of Nepal
                </button>
              ) : (
                <button
                  type="button"
                  className="centers-retry"
                  onClick={() => setSelectedLocation(NEPAL_DEFAULT_LOCATION)}
                >
                  Near Kathmandu
                </button>
              )}
            </div>
          </div>
        ) : null}

        {!loading && !error && centers.length ? (
          <ul className="centers-list">
            {centers.map((center, index) => {
              const locationLabel = formatPlaceParts(center.city, center.district) || center.address
              const metaBits = [
                center.type,
                center.isVerified ? 'Verified' : null,
                center.rating != null ? `★ ${Number(center.rating).toFixed(1)}` : null,
              ].filter(Boolean)
              const extras = [
                center.departmentCount > 0 ? `${center.departmentCount} dept${center.departmentCount === 1 ? '' : 's'}` : null,
                center.serviceCount > 0 ? `${center.serviceCount} service${center.serviceCount === 1 ? '' : 's'}` : null,
                center.openLabel,
                center.distance,
              ].filter(Boolean)

              return (
                <li key={center.providerUuid || center.id}>
                  <button type="button" className="centers-card" onClick={() => openFacility(center)}>
                    {center.image ? (
                      <img
                        src={center.image}
                        alt=""
                        className="centers-card-img"
                        loading={index < 4 ? 'eager' : 'lazy'}
                        decoding={index < 4 ? 'sync' : 'async'}
                      />
                    ) : (
                      <span className="centers-card-img is-placeholder" aria-hidden="true" />
                    )}
                    <div className="centers-card-body">
                      <div className="centers-card-top">
                        <strong className="centers-card-name">{center.name}</strong>
                        {center.isVerified ? (
                          <span className="centers-card-badge">Verified</span>
                        ) : null}
                      </div>
                      <span className="centers-card-meta">{metaBits.join(' · ')}</span>
                      {locationLabel ? (
                        <span className="centers-card-location">{locationLabel}</span>
                      ) : null}
                      {extras.length ? (
                        <span className="centers-card-extras">{extras.join(' · ')}</span>
                      ) : null}
                    </div>
                    <svg className="centers-card-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}

        {!loading && !error && hasMore ? (
          <button
            type="button"
            className="centers-load-more"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more facilities'}
          </button>
        ) : null}
      </div>

      {isPresented ? (
        <AppBottomSheet
          open
          closing={isClosing}
          onClose={closeLocationFilter}
          labelledBy="centers-location-title"
          sheetClassName="filter-sheet"
        >
          <div className="ds-sheet-header">
            <h3 id="centers-location-title">Location</h3>
            <button type="button" className="ds-sheet-close" onClick={closeLocationFilter} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="filter-options">
            {NEPAL_LOCATION_OPTIONS.map((opt) => {
              const isActive = selectedLocation === opt
              return (
                <button
                  type="button"
                  key={opt}
                  className={`filter-option ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedLocation(opt)
                    closeLocationFilter()
                  }}
                >
                  <div className="filter-option-circle" />
                  <span className="filter-option-label">{opt}</span>
                </button>
              )
            })}
          </div>
        </AppBottomSheet>
      ) : null}
    </div>
  )
}
