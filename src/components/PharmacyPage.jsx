import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageSearchHeader from './PageSearchHeader'
import CartButton from './pharmacy/CartButton'
import ParentFooter from './ParentFooter'
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
import { formatRupees, listOrders } from '../features/pharmacy/shopApi'
import {
  PHARMACY_ALL_CATEGORIES,
  PHARMACY_COMMITMENTS,
  PHARMACY_HERO_SLIDES,
  PHARMACY_HERO_START,
  PHARMACY_OFFERS,
  PHARMACY_POPULAR_CATEGORIES,
  PHARMACY_SEARCH_PLACEHOLDER,
  PHARMACY_SHOP_CATEGORIES,
  PHARMACY_SUPPORT,
  PHARMACY_TIP,
  PHARMACY_TRUST,
} from '../data/pharmacy'
import {
  CommitmentList,
  OfferRail,
  OrderList,
  PharmacyCategoriesSheet,
  PharmacyHelpList,
  PopularCategories,
  PromoCarousel,
  ShopCategoryGrid,
  TrustSection,
} from './pharmacy'
import {
  PharmacyEntityCard,
  EntityCardSkeletonStack,
} from './directory'
import './pharmacy/PharmacyPage.css'
import { Button, EmptyState, Icon, SectionHead } from './ui'

const PREVIEW_ACTIONS = new Set(['refill', 'upload-rx', 'order-medicine', 'category', 'offer', 'tip'])
const NEARBY_PREVIEW_LIMIT = 5
const NEARBY_QUERY_SIZE = 12
const HOME_ORDER_LIMIT = 3

function shortDate(value) {
  return new Date(value).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })
}

function toOrderCard(order) {
  const arriving = order.estimated_delivery && order.status !== 'delivered'
  return {
    id: order.id,
    name: `Order · ${formatRupees(order.total_amount)}`,
    status: order.status,
    window: arriving ? `Arriving ${shortDate(order.estimated_delivery)}` : `Placed ${shortDate(order.created_at)}`,
  }
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
  const [orders, setOrders] = useState([])
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  useEffect(() => {
    let alive = true
    listOrders()
      .then((rows) => {
        if (alive) setOrders(rows.slice(0, HOME_ORDER_LIMIT).map(toOrderCard))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  const [totalCount, setTotalCount] = useState(0)
  const [loadingNearby, setLoadingNearby] = useState(true)
  const [nearbyError, setNearbyError] = useState(null)

  useEffect(() => {
    clearLock('pharmacy')
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(nearbySearch.trim()), 280)
    return () => clearTimeout(t)
  }, [nearbySearch])

  const loadNearby = useCallback(async () => {
    const reqId = ++requestIdRef.current
    if (!locationReady || !origin) {
      setLoadingNearby(false)
      setPharmacies([])
      setTotalCount(0)
      setNearbyError(null)
      return
    }

    setLoadingNearby(true)
    setNearbyError(null)

    const result = await queryPharmacies({
      q: debouncedSearch,
      city: locality,
      page: 0,
      pageSize: NEARBY_QUERY_SIZE,
      force: true,
      origin,
      radiusKm,
      sort: 'nearest',
    })

    if (reqId !== requestIdRef.current) return

    if (result.error && !result.pharmacies?.length) {
      setNearbyError(result.error)
      setPharmacies([])
      setTotalCount(0)
    } else {
      setNearbyError(null)
      setPharmacies((result.pharmacies || []).slice(0, NEARBY_PREVIEW_LIMIT))
      setTotalCount(result.total || 0)
    }

    setLoadingNearby(false)
  }, [debouncedSearch, locality, origin, radiusKm, locationReady])

  useEffect(() => {
    if (locationStatus === 'locating') {
      setLoadingNearby(true)
      return
    }
    loadNearby()
  }, [loadNearby, locationStatus])

  const onRefresh = useCallback(async () => {
    clearPharmaciesQueryCache()
    await loadNearby()
  }, [loadNearby])

  const ptr = usePullToRefresh(scrollRef, onRefresh)

  const openStore = useCallback((pharmacy) => {
    const id = pharmacy.pharmacyUuid || pharmacy.id
    if (!id) return
    navigate(`/pharmacy/store/${id}`, {
      state: flowState(null, {
        origin: 'pharmacy',
        returnTo: '/pharmacy',
        storeName: pharmacy.name || pharmacy.displayName,
      }),
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
    if (action === 'shop') {
      openBrowse()
      return
    }
    if (PREVIEW_ACTIONS.has(action)) {
      showDemoPreview?.()
    }
  }, [openLiveChat, openBrowse, showDemoPreview])

  useEffect(() => {
    const onOrderMedicine = () => runPharmacyAction('order-medicine')
    window.addEventListener('fab:order-medicine', onOrderMedicine)
    return () => window.removeEventListener('fab:order-medicine', onOrderMedicine)
  }, [runPharmacyAction])

  const countLabel = useMemo(
    () => `${Number(totalCount || 0).toLocaleString('en-NP')} within ${radiusKm} km`,
    [totalCount, radiusKm],
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
        trailing={<CartButton />}
      />

      <div className="pharmacy-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        <div className="pharmacy-page__feed">
          <PromoCarousel
            slides={PHARMACY_HERO_SLIDES}
            startIndex={PHARMACY_HERO_START}
            onAction={(slide) => runPharmacyAction(slide.action)}
          />

          <ShopCategoryGrid
            items={PHARMACY_SHOP_CATEGORIES}
            onSelect={() => runPharmacyAction('category')}
          />

          <PopularCategories
            items={PHARMACY_POPULAR_CATEGORIES}
            onSelect={() => runPharmacyAction('category')}
            onSeeAll={() => setCategoriesOpen(true)}
          />

          <OfferRail
            offers={PHARMACY_OFFERS}
            onSelect={() => runPharmacyAction('offer')}
          />

          <OrderList
            orders={orders}
            onViewAll={() => navigate('/pharmacy/orders')}
            onSelect={(order) => navigate(`/pharmacy/orders/${order.id}`)}
          />

          <section className="pharmacy-nearby" aria-label="Nearby pharmacies">
            <SectionHead
              className="rx-section-head"
              title={nearbyHeading}
              sub={!loadingNearby && !nearbyError && locationReady ? countLabel : null}
              action={(
                <button type="button" className="ds-link rx-section-head__link" onClick={openBrowse}>
                  View All
                  <Icon.ChevronRight />
                </button>
              )}
            />

            {(loadingNearby || waitingForLocation) ? <EntityCardSkeletonStack count={3} /> : null}

            {!loadingNearby && !waitingForLocation && nearbyError ? (
              <EmptyState
                card
                compact
                title="Couldn’t load pharmacies"
                message={nearbyError}
                action={(
                  <Button size="sm" onClick={() => loadNearby()}>
                    Try again
                  </Button>
                )}
              />
            ) : null}

            {!loadingNearby && needsLocation ? (
              <EmptyState card compact message="Set your location to see nearby pharmacies." />
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
                      onOpen={openStore}
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            {!loadingNearby && !nearbyError && totalCount > pharmacies.length ? (
              <button
                type="button"
                className="pharmacy-nearby-more ds-btn ds-btn--secondary ds-btn--md ds-btn--block"
                onClick={openBrowse}
              >
                {`View all ${totalCount.toLocaleString('en-NP')} pharmacies`}
              </button>
            ) : null}
          </section>

          <PharmacyHelpList
            tip={PHARMACY_TIP}
            support={PHARMACY_SUPPORT}
            onTip={() => runPharmacyAction('tip')}
            onChat={openLiveChat}
          />

          <TrustSection trust={PHARMACY_TRUST} />

          <CommitmentList items={PHARMACY_COMMITMENTS} />

          <ParentFooter page="pharmacy" />
        </div>
      </div>

      <PharmacyCategoriesSheet
        open={categoriesOpen}
        items={PHARMACY_ALL_CATEGORIES}
        onClose={() => setCategoriesOpen(false)}
        onSelect={() => runPharmacyAction('category')}
      />
    </div>
  )
}
