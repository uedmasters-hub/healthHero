import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageSearchHeader from './PageSearchHeader'
import ParentFooter from './ParentFooter'
import ExpandRadiusEmpty from './ExpandRadiusEmpty'
import { useDemoPreview } from './DemoPreviewModal'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import {
  queryCenters,
  clearCentersQueryCache,
} from '../features/providers/centersRepository'
import { flowState } from '../lib/careFlow'
import { useAppLocation } from '../features/location'
import {
  CENTERS_FACILITY_FILTERS,
  CENTERS_HELP,
  CENTERS_HERO_SLIDES,
  CENTERS_HERO_START,
  CENTERS_PROMOS,
  CENTERS_QUICK_ACTIONS,
  CENTERS_SEARCH_PLACEHOLDER,
  CENTERS_SEGMENTS,
  CENTERS_SERVICES,
  CENTERS_TRUST,
} from '../data/centers'
import { CategoryChips, PromoCarousel } from './pharmacy'
import {
  CentersHelpList,
  CentersPromoRail,
  CentersSegments,
  CentersTrust,
  HcSectionHead,
  QuickActionGrid,
  ServiceGallery,
} from './centers/CentersHome'
import {
  FacilityEntityCard,
  EntityCardSkeletonStack,
} from './directory'
import { Button, EmptyState } from './ui'
import './pharmacy/PharmacyPage.css'
import './pharmacy/PharmacyHome.css'

const PAGE_SIZE = 8

function matchesKind(center, kind) {
  if (!kind) return true
  const blob = `${center?.type || ''} ${center?.classification || ''} ${center?.facilityLevel || ''} ${center?.name || ''}`.toLowerCase()
  if (kind === 'hospital') return blob.includes('hospital')
  if (kind === 'clinic') return /clinic|polyclinic|health post|phc/.test(blob)
  if (kind === 'home') return /home|nursing/.test(blob)
  if (kind === 'lab') return /lab|diagnostic|patholog/.test(blob)
  return true
}

export default function CentersPage() {
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
  const facilitiesRef = useRef(null)
  const requestIdRef = useRef(0)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [segment, setSegment] = useState('hospital')
  const [kind, setKind] = useState('hospital')
  const [centers, setCenters] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280)
    return () => clearTimeout(t)
  }, [search])

  const kindQuery = CENTERS_FACILITY_FILTERS.find((item) => item.id === kind)?.query || ''

  const loadPage = useCallback(async ({ page: nextPage, append = false } = {}) => {
    const reqId = ++requestIdRef.current
    if (!locationReady || !origin) {
      setLoading(false)
      setLoadingMore(false)
      if (!append) {
        setCenters([])
        setHasMore(false)
        setError(null)
      }
      return
    }

    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setError(null)
    }

    const result = await queryCenters({
      q: debouncedSearch || kindQuery,
      city: locality,
      sort: 'nearest',
      page: nextPage,
      pageSize: PAGE_SIZE,
      force: !append,
      origin,
      radiusKm,
    })

    if (reqId !== requestIdRef.current) return

    const rows = (result.centers || []).filter((center) => (
      debouncedSearch ? matchesKind(center, kind) : true
    ))

    if (result.error && !result.centers?.length) {
      setError(result.error)
      if (!append) {
        setCenters([])
        setHasMore(false)
      }
    } else {
      setError(null)
      setCenters((prev) => (append ? [...prev, ...rows] : rows))
      setHasMore(Boolean(result.hasMore))
      setPage(result.page)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [debouncedSearch, kind, kindQuery, locality, origin, radiusKm, locationReady])

  useEffect(() => {
    if (locationStatus === 'locating') {
      setLoading(true)
      return
    }
    loadPage({ page: 0, append: false })
  }, [loadPage, locationStatus])

  const onRefresh = useCallback(async () => {
    clearCentersQueryCache()
    await loadPage({ page: 0, append: false })
  }, [loadPage])

  const ptr = usePullToRefresh(scrollRef, onRefresh)

  const focusFacilities = useCallback((nextKind) => {
    setKind(nextKind)
    if (nextKind === 'hospital' || nextKind === 'clinic') setSegment(nextKind)
    window.requestAnimationFrame(() => {
      facilitiesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const selectSegment = (item) => {
    setSegment(item.id)
    setKind(item.id)
  }

  const openFacility = (center) => {
    const id = center.providerUuid || center.hfCode || center.id
    if (!id) return
    navigate(`/centers/${id}`, {
      state: flowState(null, { origin: 'centers', returnTo: '/centers' }),
    })
  }

  const runAction = useCallback((action) => {
    switch (action) {
      case 'book':
        navigate('/booking', {
          state: flowState(null, { origin: 'centers', returnTo: '/centers', entryReturnTo: '/centers' }),
        })
        return
      case 'ambulance':
        window.location.href = 'tel:112'
        return
      case 'chat':
        navigate('/chat', { state: { origin: 'centers', returnTo: '/centers' } })
        return
      case 'help':
        navigate('/profile/support', { state: { origin: 'centers', returnTo: '/centers' } })
        return
      case 'emergency':
      case 'surgery':
        focusFacilities('hospital')
        return
      case 'departments':
        focusFacilities(segment)
        return
      case 'hospital':
      case 'clinic':
      case 'home':
      case 'lab':
        focusFacilities(action)
        return
      default:
        showDemoPreview?.()
    }
  }, [navigate, focusFacilities, segment, showDemoPreview])

  const services = CENTERS_SERVICES[segment] || CENTERS_SERVICES.hospital
  const kindLabel = CENTERS_FACILITY_FILTERS.find((item) => item.id === kind)?.label.toLowerCase()
  const waitingForLocation = !locationReady && (locationStatus === 'locating' || locationStatus === 'idle')
  const needsLocation = !locationReady && !waitingForLocation

  return (
    <div className="pharmacy-page centers-page">
      <PageSearchHeader
        title="Healthcare center"
        scrollRef={scrollRef}
        searchBarRef={searchBarRef}
        scope="centers"
        placeholder={CENTERS_SEARCH_PLACEHOLDER}
        query={search}
        onQueryChange={setSearch}
        dockClassName="pharmacy-search-dock"
      />

      <div className="pharmacy-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        <div className="pharmacy-page__feed">
          <PromoCarousel
            slides={CENTERS_HERO_SLIDES}
            startIndex={CENTERS_HERO_START}
            label="Healthcare highlights"
            onAction={(slide) => runAction(slide.action)}
          />

          <CentersSegments items={CENTERS_SEGMENTS} activeId={segment} onSelect={selectSegment} />

          <QuickActionGrid items={CENTERS_QUICK_ACTIONS} onSelect={(item) => runAction(item.id)} />

          <CentersPromoRail promos={CENTERS_PROMOS} onSelect={(promo) => runAction(promo.action)} />

          <section className="pharmacy-nearby" aria-label="Top facilities" ref={facilitiesRef}>
            <HcSectionHead title="Top Facilities" actionLabel="See All" onAction={() => focusFacilities(null)} />

            <CategoryChips
              title="Facility type"
              hideHeader
              variant="solid"
              activeId={kind}
              items={CENTERS_FACILITY_FILTERS}
              onSelect={(item) => focusFacilities(item.id)}
            />

            {(loading || waitingForLocation) ? <EntityCardSkeletonStack count={3} /> : null}

            {!loading && !waitingForLocation && error ? (
              <EmptyState
                card
                compact
                title="Let’s try that again"
                message="Facilities near you are a tap away."
                action={(
                  <Button size="sm" onClick={() => loadPage({ page: 0 })}>
                    Try again
                  </Button>
                )}
              />
            ) : null}

            {!loading && needsLocation ? (
              <EmptyState
                card
                compact
                title="Set your location"
                message="Allow precise location or pick a place to find nearby facilities."
              />
            ) : null}

            {!loading && !error && locationReady && !centers.length ? (
              kind ? (
                <EmptyState
                  card
                  compact
                  title="Coming soon"
                  message={`${kindLabel ? kindLabel[0].toUpperCase() + kindLabel.slice(1) : 'Matching'} facilities near you are on the way.`}
                  action={(
                    <Button size="sm" variant="ghost" onClick={() => focusFacilities(null)}>
                      See all facilities
                    </Button>
                  )}
                />
              ) : (
                <ExpandRadiusEmpty
                  radiusKm={radiusKm}
                  nextRadiusKm={nextExpandRadiusKm}
                  locality={locality}
                  entityLabel="facilities"
                  onExpand={() => expandRadius()}
                  onChangeLocation={() => navigate('/')}
                />
              )
            ) : null}

            {!loading && !error && centers.length ? (
              <ul className="pharmacy-nearby-list">
                {centers.map((center) => (
                  <li key={center.providerUuid || center.id}>
                    <FacilityEntityCard center={center} variant="home" onOpen={openFacility} />
                  </li>
                ))}
              </ul>
            ) : null}

            {!loading && !error && hasMore ? (
              <button
                type="button"
                className="pharmacy-nearby-more ds-btn ds-btn--secondary ds-btn--md ds-btn--block"
                onClick={() => loadPage({ page: page + 1, append: true })}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more facilities'}
              </button>
            ) : null}
          </section>

          <ServiceGallery
            title={services.title}
            items={services.items}
            onSelect={(item) => focusFacilities(item.kind)}
            onSeeAll={() => focusFacilities(segment)}
          />

          <CentersTrust trust={CENTERS_TRUST} />

          <CentersHelpList items={CENTERS_HELP} onSelect={(item) => runAction(item.action)} />

          <ParentFooter page="centers" />
        </div>
      </div>
    </div>
  )
}
