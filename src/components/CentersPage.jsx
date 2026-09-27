import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageSearchHeader from './PageSearchHeader'
import AppFooter from './AppFooter'
import EmptyState from './EmptyState'
import ExpandRadiusEmpty from './ExpandRadiusEmpty'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import {
  queryCenters,
  clearCentersQueryCache,
} from '../features/providers/centersRepository'
import { flowState } from '../lib/careFlow'
import { useAppLocation } from '../features/location'
import {
  CategoryChips,
  PharmacySupportCard,
  ServiceTileGrid,
} from './pharmacy'
import {
  FacilityEntityCard,
  EntityCardSkeletonStack,
} from './directory'
import './pharmacy/PharmacyPage.css'
import './Services.css'
import './ExpandRadiusEmpty.css'

const PAGE_SIZE = 8

const SERVICES = [
  {
    id: 'hospital',
    icon: 'building',
    tone: 'sky',
    badge: 'Tertiary',
    label: 'Find Hospital',
    subtitle: 'ICU, OT & Inpatient',
  },
  {
    id: 'clinic',
    icon: 'plus',
    tone: 'mint',
    badge: 'Local',
    label: 'Find Clinic',
    subtitle: 'Polyclinic & GP visits',
  },
  {
    id: 'home',
    icon: 'home',
    tone: 'peach',
    badge: '24/7 Live',
    label: 'Home Care',
    subtitle: 'Doctor & nursing visits',
  },
  {
    id: 'lab',
    icon: 'calendar',
    tone: 'sky',
    badge: 'Fast Queue',
    label: 'Lab & Diagnostics',
    subtitle: 'Blood tests & diagnostics',
  },
]

const FACILITY_FILTERS = [
  { id: 'hospital', label: 'Hospital', query: 'hospital' },
  { id: 'clinic', label: 'Clinic', query: 'clinic' },
  { id: 'home', label: 'Home Care', query: 'home' },
  { id: 'lab', label: 'Diagnostics', query: 'diagnostic' },
]

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

  const kindQuery = FACILITY_FILTERS.find((item) => item.id === kind)?.query || ''

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

  const focusFacilities = (nextKind) => {
    setKind(nextKind)
    window.requestAnimationFrame(() => {
      facilitiesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const openFacility = (center) => {
    const id = center.providerUuid || center.hfCode || center.id
    if (!id) return
    navigate(`/centers/${id}`, {
      state: flowState(null, { origin: 'centers', returnTo: '/centers' }),
    })
  }

  const waitingForLocation = !locationReady && (locationStatus === 'locating' || locationStatus === 'idle')
  const needsLocation = !locationReady && !waitingForLocation

  return (
    <div className="pharmacy-page">
      <PageSearchHeader
        title="Healthcare Centers"
        scrollRef={scrollRef}
        searchBarRef={searchBarRef}
        scope="centers"
        placeholder="Search hospitals, clinics…"
        query={search}
        onQueryChange={setSearch}
        dockClassName="pharmacy-search-dock"
      />

      <div className="pharmacy-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        <div className="pharmacy-page__feed">
          <ServiceTileGrid
            items={SERVICES}
            onSelect={(item) => focusFacilities(item.id)}
          />

          <PharmacySupportCard
            icon="ambulance"
            title="24/7 Ambulance"
            body="Triage & Rapid Response"
            cta="Call"
            ctaAs="button"
            onClick={() => { window.location.href = 'tel:112' }}
          />

          <section className="pharmacy-nearby" aria-label="Top facilities" ref={facilitiesRef}>
            <div className="section-header">
              <h2 className="section-title">Top Facilities</h2>
              <button type="button" className="view-all-link" onClick={() => focusFacilities(null)}>
                See All
              </button>
            </div>

            <CategoryChips
              title="Facility type"
              hideHeader
              variant="solid"
              activeId={kind}
              items={FACILITY_FILTERS}
              onSelect={(item) => focusFacilities(item.id)}
            />

            {(loading || waitingForLocation) ? <EntityCardSkeletonStack count={3} /> : null}

            {!loading && !waitingForLocation && error ? (
              <div className="pharmacy-nearby-empty">
                <EmptyState
                  image="/img/empty_state/hospital.png"
                  alt=""
                  title="Couldn’t load facilities"
                  message={error}
                />
                <button type="button" className="pharmacy-nearby-retry" onClick={() => loadPage({ page: 0 })}>
                  Try again
                </button>
              </div>
            ) : null}

            {!loading && needsLocation ? (
              <div className="pharmacy-nearby-empty">
                <EmptyState
                  image="/img/empty_state/hospital.png"
                  alt=""
                  title="Set your location"
                  message="Allow precise location or pick a place to find nearby facilities."
                />
              </div>
            ) : null}

            {!loading && !error && locationReady && !centers.length ? (
              kind ? (
                <div className="pharmacy-nearby-empty">
                  <p>No {FACILITY_FILTERS.find((item) => item.id === kind)?.label.toLowerCase() || 'matching'} facilities nearby.</p>
                  <button type="button" className="pharmacy-nearby-retry" onClick={() => focusFacilities(null)}>
                    See all facilities
                  </button>
                </div>
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
                className="pharmacy-nearby-more"
                onClick={() => loadPage({ page: page + 1, append: true })}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more facilities'}
              </button>
            ) : null}
          </section>

          <AppFooter page="centers" />
        </div>
      </div>
    </div>
  )
}
