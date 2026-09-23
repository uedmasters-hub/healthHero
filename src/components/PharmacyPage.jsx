import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from './SearchBar'
import TabPageHeader from './TabPageHeader'
import AppFooter from './AppFooter'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { useDemoPreview } from './DemoPreviewModal'
import { clearLock } from '../lib/scrollLock'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import {
  queryPharmacies,
  clearPharmaciesQueryCache,
  mapsPharmacyDirectionsUrl,
} from '../features/providers/pharmaciesRepository'
import { formatPlaceParts } from '../features/geography/formatPlace'
import { flowState } from '../lib/careFlow'
import {
  NEPAL_DEFAULT_LOCATION,
  NEPAL_DEFAULT_COORDS,
  detectNepalCityFromDevice,
} from '../data/nepalGeography'
import {
  PHARMACY_CATEGORIES,
  PHARMACY_ORDERS,
  PHARMACY_PROMO_SLIDES,
  PHARMACY_RECENT,
  PHARMACY_SEARCH_PLACEHOLDER,
  PHARMACY_SERVICES,
  PHARMACY_TIP,
} from '../data/pharmacy'
import {
  CategoryChips,
  OrderList,
  PharmacySupportCard,
  PharmacyTipCard,
  PromoCarousel,
  RecentStrip,
  ServiceTileGrid,
} from './pharmacy'
import './TabPageHeader.css'
import './pharmacy/PharmacyPage.css'
import './Services.css'

const PREVIEW_ACTIONS = new Set(['refill', 'upload-rx', 'essentials', 'order-medicine', 'category', 'recent', 'orders', 'tip'])
const NEARBY_PAGE_SIZE = 24

const FILTER_OPTIONS = [
  { id: 'all', label: 'All medicines' },
  { id: 'rx', label: 'Prescription only' },
  { id: 'otc', label: 'Over the counter' },
  { id: 'refill', label: 'Refillable' },
]

function formatResultsCount({ shown, total }) {
  const shownLabel = Number(shown || 0).toLocaleString('en-NP')
  const totalLabel = Number(total || 0).toLocaleString('en-NP')
  return `Showing ${shownLabel} of ${totalLabel}`
}

function NearbySkeleton({ count = 3 }) {
  return (
    <div className="pharmacy-nearby-skel" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pharmacy-nearby-skel-card">
          <div className="pharmacy-nearby-skel-line wide shimmer" />
          <div className="pharmacy-nearby-skel-line mid shimmer" />
          <div className="pharmacy-nearby-skel-line short shimmer" />
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
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 },
    )
  })
}

export default function PharmacyPage() {
  const navigate = useNavigate()
  const { show: showDemoPreview } = useDemoPreview()
  const [filterId, setFilterId] = useState('all')
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const scrollRef = useRef(null)
  const requestIdRef = useRef(0)
  const gpsTriedRef = useRef(false)

  const [nearbySearch, setNearbySearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(NEPAL_DEFAULT_LOCATION)
  const [origin, setOrigin] = useState(NEPAL_DEFAULT_COORDS)
  const [pharmacies, setPharmacies] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loadingNearby, setLoadingNearby] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nearbyError, setNearbyError] = useState(null)

  useEffect(() => {
    clearLock('pharmacy')
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(nearbySearch.trim()), 280)
    return () => clearTimeout(t)
  }, [nearbySearch])

  useEffect(() => {
    if (gpsTriedRef.current) return undefined
    gpsTriedRef.current = true
    let cancelled = false
    Promise.all([detectNepalCityFromDevice(), readDeviceOrigin()]).then(([city, coords]) => {
      if (cancelled) return
      if (coords) setOrigin(coords)
      if (city) {
        setSelectedLocation((prev) => (prev === NEPAL_DEFAULT_LOCATION ? city : prev))
      }
    })
    return () => { cancelled = true }
  }, [])

  const loadNearby = useCallback(async ({ page: nextPage = 0, append = false } = {}) => {
    const reqId = ++requestIdRef.current
    if (append) setLoadingMore(true)
    else {
      setLoadingNearby(true)
      setNearbyError(null)
    }

    const result = await queryPharmacies({
      q: debouncedSearch,
      city: selectedLocation,
      page: nextPage,
      pageSize: NEARBY_PAGE_SIZE,
      force: !append,
      origin,
    })

    if (reqId !== requestIdRef.current) return

    if (result.error && !result.pharmacies?.length) {
      setNearbyError(result.error)
      if (!append) {
        setPharmacies([])
        setTotalCount(0)
        setHasMore(false)
      }
    } else {
      setNearbyError(null)
      setPharmacies((prev) => (append ? [...prev, ...result.pharmacies] : result.pharmacies))
      setTotalCount(result.total || 0)
      setHasMore(Boolean(result.hasMore))
      setPage(result.page)
    }

    setLoadingNearby(false)
    setLoadingMore(false)
  }, [debouncedSearch, selectedLocation, origin])

  useEffect(() => {
    loadNearby({ page: 0, append: false })
  }, [loadNearby])

  const onRefresh = useCallback(async () => {
    clearPharmaciesQueryCache()
    await loadNearby({ page: 0, append: false })
  }, [loadNearby])

  const ptr = usePullToRefresh(scrollRef, onRefresh)

  const openPharmacy = useCallback((pharmacy) => {
    const id = pharmacy.pharmacyUuid || pharmacy.pharmacyCode || pharmacy.id
    if (!id) return
    navigate(`/pharmacy/${id}`, {
      state: flowState(null, { origin: 'pharmacy', returnTo: '/pharmacy' }),
    })
  }, [navigate])

  const openFullSearch = useCallback(() => {
    navigate('/search', {
      state: {
        searchOrigin: 'pharmacy',
        searchPlaceholder: PHARMACY_SEARCH_PLACEHOLDER,
        returnTo: '/pharmacy',
      },
    })
  }, [navigate])

  const openFilter = useCallback(() => show(), [show])
  const closeFilter = useCallback(() => hide(), [hide])

  const openLiveChat = useCallback(() => {
    navigate('/chat', { state: { origin: 'pharmacy', returnTo: '/pharmacy' } })
  }, [navigate])

  const openBrowse = useCallback(() => {
    navigate('/pharmacy/browse', {
      state: flowState(null, {
        origin: 'pharmacy',
        returnTo: '/pharmacy',
        location: selectedLocation,
        q: debouncedSearch,
      }),
    })
  }, [navigate, selectedLocation, debouncedSearch])

  const runPharmacyAction = useCallback((action) => {
    if (action === 'consult') {
      openLiveChat()
      return
    }
    if (action === 'orders-view-all' || action === 'orders') {
      showDemoPreview?.()
      return
    }
    if (PREVIEW_ACTIONS.has(action)) {
      showDemoPreview?.()
    }
  }, [openLiveChat, showDemoPreview])

  useEffect(() => {
    const onOrderMedicine = () => runPharmacyAction('order-medicine')
    window.addEventListener('fab:order-medicine', onOrderMedicine)
    return () => window.removeEventListener('fab:order-medicine', onOrderMedicine)
  }, [runPharmacyAction])

  const countLabel = useMemo(
    () => formatResultsCount({ shown: pharmacies.length, total: totalCount }),
    [pharmacies.length, totalCount],
  )

  const nearbyHeading = selectedLocation
    ? `Nearby Pharmacies · ${selectedLocation}`
    : 'Nearby Pharmacies'

  return (
    <div className="pharmacy-page">
      <TabPageHeader
        title="Pharmacy"
        subtitle="Order medicines and manage your prescriptions"
        actions={(
          <>
            <button
              type="button"
              className="ds-icon-btn is-subtle is-md"
              aria-label="Search medicines"
              onClick={openFullSearch}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <button
              type="button"
              className="ds-icon-btn is-subtle is-md"
              aria-label="Filter medicines"
              onClick={openFilter}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
          </>
        )}
      />

      <div className="pharmacy-search">
        <SearchBar
          mode="inline"
          scope="pharmacy"
          placeholder="Search pharmacies or medicines…"
          query={nearbySearch}
          onQueryChange={setNearbySearch}
        />
      </div>

      <div className="pharmacy-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        <div className="pharmacy-page__feed">
          <PromoCarousel
            slides={PHARMACY_PROMO_SLIDES}
            onAction={(slide) => runPharmacyAction(slide.action)}
          />

          <ServiceTileGrid
            items={PHARMACY_SERVICES}
            onSelect={(item) => runPharmacyAction(item.action)}
          />

          <OrderList
            orders={PHARMACY_ORDERS}
            onViewAll={() => runPharmacyAction('orders-view-all')}
            onSelect={() => runPharmacyAction('orders')}
          />

          <CategoryChips
            items={PHARMACY_CATEGORIES}
            onSelect={() => runPharmacyAction('category')}
          />

          <RecentStrip
            items={PHARMACY_RECENT}
            onSelect={() => runPharmacyAction('recent')}
          />

          <section className="pharmacy-nearby" aria-label="Nearby pharmacies">
            <div className="pharmacy-nearby-head">
              <div>
                <h2 className="ds-section-title">{nearbyHeading}</h2>
                {!loadingNearby && !nearbyError ? (
                  <p className="pharmacy-nearby-count">{countLabel}</p>
                ) : null}
              </div>
              <button type="button" className="pharmacy-nearby-viewall" onClick={openBrowse}>
                View all
              </button>
            </div>

            {loadingNearby ? <NearbySkeleton /> : null}

            {!loadingNearby && nearbyError ? (
              <div className="pharmacy-nearby-empty">
                <p>{nearbyError}</p>
                <button type="button" className="pharmacy-nearby-retry" onClick={() => loadNearby({ page: 0 })}>
                  Try again
                </button>
              </div>
            ) : null}

            {!loadingNearby && !nearbyError && !pharmacies.length ? (
              <div className="pharmacy-nearby-empty">
                <p>No pharmacies found near {selectedLocation}.</p>
                <button type="button" className="pharmacy-nearby-retry" onClick={openBrowse}>
                  Browse all pharmacies
                </button>
              </div>
            ) : null}

            {!loadingNearby && !nearbyError && pharmacies.length ? (
              <ul className="pharmacy-nearby-list">
                {pharmacies.map((pharmacy) => {
                  const locationLabel = formatPlaceParts(
                    pharmacy.place,
                    pharmacy.city,
                    pharmacy.district,
                  ) || pharmacy.address
                  const directionsUrl = mapsPharmacyDirectionsUrl(pharmacy)
                  const meta = [
                    pharmacy.pharmacyType,
                    pharmacy.licenseNumber ? `Lic. ${pharmacy.licenseNumber}` : null,
                  ].filter(Boolean).join(' · ')

                  return (
                    <li key={pharmacy.pharmacyUuid || pharmacy.id}>
                      <article className="pharmacy-nearby-card">
                        <button
                          type="button"
                          className="pharmacy-nearby-main"
                          onClick={() => openPharmacy(pharmacy)}
                        >
                          <div className="pharmacy-nearby-body">
                            <strong className="pharmacy-nearby-name">{pharmacy.name}</strong>
                            {meta ? <span className="pharmacy-nearby-meta">{meta}</span> : null}
                            {locationLabel ? (
                              <span className="pharmacy-nearby-location">{locationLabel}</span>
                            ) : null}
                            <span className="pharmacy-nearby-extras">
                              {[
                                pharmacy.delivers ? 'Delivery available' : null,
                                pharmacy.distance,
                                pharmacy.openLabel,
                              ].filter(Boolean).join(' · ') || 'Registered pharmacy'}
                            </span>
                          </div>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                        <div className="pharmacy-nearby-actions">
                          {directionsUrl ? (
                            <a
                              className="pharmacy-nearby-action"
                              href={directionsUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Directions
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="pharmacy-nearby-action is-primary"
                            onClick={() => openPharmacy(pharmacy)}
                          >
                            Order
                          </button>
                        </div>
                      </article>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {!loadingNearby && !nearbyError && hasMore ? (
              <button
                type="button"
                className="pharmacy-nearby-more"
                onClick={() => loadNearby({ page: page + 1, append: true })}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more pharmacies'}
              </button>
            ) : null}
          </section>

          <PharmacyTipCard
            tip={PHARMACY_TIP}
            onClick={() => runPharmacyAction('tip')}
          />

          <PharmacySupportCard onClick={openLiveChat} />

          <AppFooter page="pharmacy" />
        </div>
      </div>

      <AppBottomSheet
        open={isPresented}
        closing={isClosing}
        onClose={closeFilter}
        labelledBy="pharmacy-filter-title"
      >
        <div className="ds-sheet-header">
          <h3 id="pharmacy-filter-title">Filter medicines</h3>
          <button type="button" className="ds-sheet-close" onClick={closeFilter} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="pharmacy-filter-list">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`pharmacy-filter-option${filterId === option.id ? ' is-active' : ''}`}
              onClick={() => {
                setFilterId(option.id)
                closeFilter()
              }}
            >
              <span>{option.label}</span>
              {filterId === option.id ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      </AppBottomSheet>
    </div>
  )
}
