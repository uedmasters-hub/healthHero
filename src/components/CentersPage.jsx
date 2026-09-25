import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import EmptyState from './EmptyState'
import ExpandRadiusEmpty from './ExpandRadiusEmpty'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import {
  queryCenters,
  clearCentersQueryCache,
  CENTERS_PAGE_SIZE,
} from '../features/providers/centersRepository'
import { flowState } from '../lib/careFlow'
import { useAppLocation } from '../features/location'
import {
  DirectoryShell,
  FacilityEntityCard,
  EntityCardSkeletonStack,
} from './directory'
import './SelectProvider.css'
import './ExpandRadiusEmpty.css'

const PAGE_SIZE = CENTERS_PAGE_SIZE || 24

const SORT_OPTIONS = [
  { id: 'nearest', label: 'Nearest' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'rating', label: 'Highest Rated' },
]

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
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const scrollRef = useRef(null)
  const requestIdRef = useRef(0)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState('nearest')
  const [activeSheet, setActiveSheet] = useState(null)
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

  const loadPage = useCallback(async ({ page: nextPage, append = false } = {}) => {
    const reqId = ++requestIdRef.current
    if (!locationReady || !origin) {
      setLoading(false)
      setLoadingMore(false)
      if (!append) {
        setCenters([])
        setTotalCount(0)
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
      q: debouncedSearch,
      city: locality,
      sort: sortBy,
      page: nextPage,
      pageSize: PAGE_SIZE,
      force: !append,
      origin,
      radiusKm,
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
  }, [debouncedSearch, locality, sortBy, origin, radiusKm, locationReady])

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

  const openSheet = (id) => {
    setActiveSheet(id)
    show()
  }

  const closeSheet = () => {
    hide(() => setActiveSheet(null))
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
    <>
      <DirectoryShell
        title="Healthcare Centers"
        showBack={false}
        searchScope="centers"
        searchPlaceholder="Search hospitals, clinics…"
        searchQuery={search}
        onSearchChange={setSearch}
        shown={centers.length}
        total={totalCount}
        loading={loading || waitingForLocation}
        onSort={() => openSheet('sort')}
        sortActive={sortBy !== 'nearest'}
        scrollRef={scrollRef}
      >
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />

        {(loading || waitingForLocation) ? <EntityCardSkeletonStack count={4} /> : null}

        {!loading && !waitingForLocation && error ? (
          <div className="dir-shell__empty">
            <EmptyState
              image="/img/empty_state/hospital.png"
              alt=""
              title="Couldn’t load facilities"
              message={error}
            />
            <button type="button" className="dir-shell__load-more" onClick={() => loadPage({ page: 0 })}>
              Try again
            </button>
          </div>
        ) : null}

        {!loading && needsLocation ? (
          <div className="dir-shell__empty">
            <EmptyState
              image="/img/empty_state/hospital.png"
              alt=""
              title="Set your location"
              message="Allow precise location or pick a place to find nearby facilities."
            />
          </div>
        ) : null}

        {!loading && !error && locationReady && !centers.length ? (
          <div className="dir-shell__empty">
            <ExpandRadiusEmpty
              radiusKm={radiusKm}
              nextRadiusKm={nextExpandRadiusKm}
              locality={locality}
              entityLabel="facilities"
              onExpand={() => expandRadius()}
              onChangeLocation={() => navigate('/')}
            />
            {search ? (
              <div className="doctors-empty-suggestions">
                <button type="button" onClick={() => setSearch('')}>Clear search</button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && centers.length ? (
          <ul className="dir-shell__list">
            {centers.map((center) => (
              <li key={center.providerUuid || center.id}>
                <FacilityEntityCard center={center} onOpen={openFacility} />
              </li>
            ))}
            {hasMore ? (
              <li>
                <button
                  type="button"
                  className="dir-shell__load-more"
                  onClick={() => loadPage({ page: page + 1, append: true })}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading…' : 'Load more facilities'}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </DirectoryShell>

      {isPresented && activeSheet === 'sort' ? (
        <AppBottomSheet open closing={isClosing} onClose={closeSheet} labelledBy="centers-sort-title" sheetClassName="filter-sheet">
          <div className="ds-sheet-header">
            <h3 id="centers-sort-title">Sort</h3>
            <button type="button" className="ds-sheet-close" onClick={closeSheet} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="filter-options">
            {SORT_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.id}
                className={`filter-option ${sortBy === opt.id ? 'active' : ''}`}
                onClick={() => { setSortBy(opt.id); closeSheet() }}
              >
                <div className="filter-option-circle" />
                <span className="filter-option-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </AppBottomSheet>
      ) : null}
    </>
  )
}
