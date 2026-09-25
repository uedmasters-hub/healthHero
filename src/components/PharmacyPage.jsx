import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageSearchHeader from './PageSearchHeader'
import AppFooter from './AppFooter'
import { useDemoPreview } from './DemoPreviewModal'
import { clearLock } from '../lib/scrollLock'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import {
  queryPharmacies,
  clearPharmaciesQueryCache,
} from '../features/providers/pharmaciesRepository'
import { flowState } from '../lib/careFlow'
import { useAppLocation } from '../features/location'
import ExpandRadiusEmpty from './ExpandRadiusEmpty'
import './ExpandRadiusEmpty.css'
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
import {
  PharmacyEntityCard,
  EntityCardSkeletonStack,
} from './directory'
import './pharmacy/PharmacyPage.css'
import './Services.css'
import './SelectProvider.css'

const PREVIEW_ACTIONS = new Set(['refill', 'upload-rx', 'essentials', 'order-medicine', 'category', 'recent', 'orders', 'tip'])
const NEARBY_PAGE_SIZE = 24

function formatResultsCount({ shown, total }) {
  const shownLabel = Number(shown || 0).toLocaleString('en-NP')
  const totalLabel = Number(total || 0).toLocaleString('en-NP')
  return `Showing ${shownLabel} of ${totalLabel}`
}

export default function PharmacyPage() {
  const navigate = useNavigate()
  const { show: showDemoPreview } = useDemoPreview()
  const {
    locality,
    origin,
    radiusKm,
    ready: locationReady,
    status: locationStatus,
    nextExpandRadiusKm,
    expandRadius,
  } = useAppLocation()
  const scrollRef = useRef(null)
  const searchBarRef = useRef(null)
  const requestIdRef = useRef(0)

  const [nearbySearch, setNearbySearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
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

  const loadNearby = useCallback(async ({ page: nextPage = 0, append = false } = {}) => {
    const reqId = ++requestIdRef.current
    if (!locationReady || !origin) {
      setLoadingNearby(false)
      setLoadingMore(false)
      if (!append) {
        setPharmacies([])
        setTotalCount(0)
        setHasMore(false)
        setNearbyError(null)
      }
      return
    }

    if (append) setLoadingMore(true)
    else {
      setLoadingNearby(true)
      setNearbyError(null)
    }

    const result = await queryPharmacies({
      q: debouncedSearch,
      city: locality,
      page: nextPage,
      pageSize: NEARBY_PAGE_SIZE,
      force: !append,
      origin,
      radiusKm,
      sort: 'nearest',
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
  }, [debouncedSearch, locality, origin, radiusKm, locationReady])

  useEffect(() => {
    if (locationStatus === 'locating') {
      setLoadingNearby(true)
      return
    }
    loadNearby({ page: 0, append: false })
  }, [loadNearby, locationStatus])

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

  const openLiveChat = useCallback(() => {
    navigate('/chat', { state: { origin: 'pharmacy', returnTo: '/pharmacy' } })
  }, [navigate])

  const openBrowse = useCallback(() => {
    navigate('/pharmacy/browse', {
      state: flowState(null, {
        origin: 'pharmacy',
        returnTo: '/pharmacy',
        location: locality,
        q: debouncedSearch,
      }),
    })
  }, [navigate, locality, debouncedSearch])

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

  const nearbyHeading = locality
    ? `Nearby Pharmacies · ${locality}`
    : 'Nearby Pharmacies'

  const waitingForLocation = !locationReady && (locationStatus === 'locating' || locationStatus === 'idle')
  const needsLocation = !locationReady && !waitingForLocation

  return (
    <div className="pharmacy-page">
      <PageSearchHeader
        title="Pharmacy"
        scrollRef={scrollRef}
        searchBarRef={searchBarRef}
        scope="pharmacy"
        placeholder={PHARMACY_SEARCH_PLACEHOLDER || 'Search pharmacies or medicines…'}
        query={nearbySearch}
        onQueryChange={setNearbySearch}
        dockClassName="pharmacy-search-dock"
      />

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
                {!loadingNearby && !nearbyError && locationReady ? (
                  <p className="pharmacy-nearby-count">{countLabel} · {radiusKm} km</p>
                ) : null}
              </div>
              <button type="button" className="pharmacy-nearby-viewall" onClick={openBrowse}>
                View all
              </button>
            </div>

            {(loadingNearby || waitingForLocation) ? <EntityCardSkeletonStack count={3} /> : null}

            {!loadingNearby && !waitingForLocation && nearbyError ? (
              <div className="pharmacy-nearby-empty">
                <p>{nearbyError}</p>
                <button type="button" className="pharmacy-nearby-retry" onClick={() => loadNearby({ page: 0 })}>
                  Try again
                </button>
              </div>
            ) : null}

            {!loadingNearby && needsLocation ? (
              <div className="pharmacy-nearby-empty">
                <p>Set your location to see nearby pharmacies.</p>
              </div>
            ) : null}

            {!loadingNearby && !nearbyError && locationReady && !pharmacies.length ? (
              <ExpandRadiusEmpty
                radiusKm={radiusKm}
                nextRadiusKm={nextExpandRadiusKm}
                locality={locality}
                entityLabel="pharmacies"
                onExpand={() => expandRadius()}
                onChangeLocation={openBrowse}
              />
            ) : null}

            {!loadingNearby && !nearbyError && pharmacies.length ? (
              <ul className="pharmacy-nearby-list">
                {pharmacies.map((pharmacy) => (
                  <li key={pharmacy.pharmacyUuid || pharmacy.id}>
                    <PharmacyEntityCard
                      pharmacy={pharmacy}
                      variant="nearby"
                      onOpen={openPharmacy}
                    />
                  </li>
                ))}
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
    </div>
  )
}
