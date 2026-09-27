import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { queryProviders, countProviders, subscribeProviders, subscribeAvailability, fetchDoctorFilterFacets, peekDoctorFilterFacets } from '../features/providers'
import { ALL_SPECIALISATIONS, canonicalSpecialty, loadExploreListState, saveExploreListState } from '../data/specialisations'
import { withBookingEntry } from '../lib/careFlow'
import { getViewedDoctorIds } from '../lib/recentDoctors'
import { NEPAL_LOCATION_OPTIONS, ALL_NEPAL_LOCATION } from '../data/nepalGeography'
import { useAppLocation } from '../features/location'
import ExpandRadiusEmpty from './ExpandRadiusEmpty'
import './ExpandRadiusEmpty.css'
import SearchRadiusDial from './SearchRadiusDial'
import RadiusMapPreview from './RadiusMapPreview'
import DatePicker from './DatePicker'
import { makeDateValue, toIsoDate } from './calendar/dates'
import {
  emptyDateLabel,
  NEARBY_EMPTY_HINT,
  NATIONWIDE_EMPTY_HINT,
  nationwideEmptyTitle,
  nearbyEmptyTitle,
} from '../lib/radiusDial'
import { useAppSheet } from './PageTransition'
import AppBottomSheet from './AppBottomSheet'
import useDuplicateBookingGuard from '../hooks/useDuplicateBookingGuard'
import {
  DirectoryShell,
  DoctorEntityCard,
  EntityCardSkeletonStack,
} from './directory'
import { beginReadiness, isVideoEntry } from '../features/videoConsult/lock'
import './SelectProvider.css'
import './directory/DirectoryShell.css'

const locations = NEPAL_LOCATION_OPTIONS
const availabilities = ['All', 'Today', 'Tomorrow', 'This Week']
const PAGE_SIZE = 24
const MAP_HOLD_MS = 480
const MAP_FADE_MS = 380
const RESOLVE_MS = 280

const SORT_OPTIONS = [
  { id: 'nearest', label: 'Nearest', sort: 'nearest' },
  { id: 'recommended', label: 'Recommended', sort: 'name' },
  { id: 'rating', label: 'Highest Rated', sort: 'rating' },
  { id: 'fee', label: 'Lowest Fee', sort: 'fee' },
  { id: 'available', label: 'Earliest Available', sort: 'name' },
]

function formatFacetCount(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value).toLocaleString('en-NP')
}

function useDebouncedValue(value, delay = 280) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/**
 * Doctor directory — shared DirectoryShell chrome + live Supabase providers.
 */
export default function DoctorList({
  lockedSpecialty = null,
  origin = 'find-doctor',
  returnTo,
  persist = false,
  dataset,
  scrollRootRef,
  onBookNow,
  title = null,
  onBack = null,
  showBack = true,
  headerExtra = null,
  className = '',
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { guard, modal } = useDuplicateBookingGuard()
  const preferredVisitType = location.state?.preferredVisitType
  const videoLocked = isVideoEntry(location.state)
  const specialty = lockedSpecialty ? canonicalSpecialty(lockedSpecialty) : null
  const saved = persist && specialty ? loadExploreListState(specialty) : null

  const [search, setSearch] = useState(saved?.search ?? '')
  const [availabilityTick, setAvailabilityTick] = useState(0)
  const {
    locality,
    origin: locationOrigin,
    latitude: searchLat,
    longitude: searchLng,
    radiusKm,
    ready: locationReady,
    source: locationSource,
    nextExpandRadiusKm,
    expandRadius,
    setRadiusKm,
    selectPlaceByName,
  } = useAppLocation()
  const debouncedSearch = useDebouncedValue(search, 280)
  const [activeFilter, setActiveFilter] = useState(null)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const [selectedSpecialty, setSelectedSpecialty] = useState(specialty || saved?.selectedSpecialty || 'All')
  const [browseNationwide, setBrowseNationwide] = useState(
    saved?.selectedLocation === ALL_NEPAL_LOCATION || saved?.selectedLocation === 'All',
  )
  const selectedLocation = browseNationwide ? ALL_NEPAL_LOCATION : (locality || 'Your location')
  const [radiusDate, setRadiusDate] = useState(() => makeDateValue(new Date()))
  const [selectedAvailability, setSelectedAvailability] = useState(
    () => saved?.selectedAvailability || (persist ? 'All' : toIsoDate(makeDateValue(new Date()))),
  )
  const [sortBy, setSortBy] = useState(saved?.sortBy || 'nearest')
  const [viewedIds, setViewedIds] = useState(() => getViewedDoctorIds())
  const [facetCounts, setFacetCounts] = useState({})
  const facetRequestRef = useRef(0)

  const [doctors, setDoctors] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [registeredCount, setRegisteredCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dialReady, setDialReady] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)
  const requestIdRef = useRef(0)
  const radiusPrimedRef = useRef(false)
  const emptyUiRef = useRef(origin === 'find-doctor')
  const initialGateRef = useRef(origin === 'find-doctor')
  const revealTimerRef = useRef(0)
  const resolveTimerRef = useRef(0)
  const [resolveFade, setResolveFade] = useState(false)
  const [scopePending, setScopePending] = useState(false)
  const [listingReveal, setListingReveal] = useState(false)
  const directoryRef = useRef(null)
  const previewRef = useRef(null)
  const mapPhaseRef = useRef('idle')
  const [calmList, setCalmList] = useState(false)
  const [mapPhase, setMapPhase] = useState('idle')
  const [mapShell, setMapShell] = useState(null)
  const [mapFrame, setMapFrame] = useState(null)
  const internalScrollRef = useRef(null)
  const scrollRef = scrollRootRef || internalScrollRef

  const sortMeta = SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0]
  const activeSpecialty = specialty || (selectedSpecialty !== 'All' ? selectedSpecialty : null)
  const pageTitle = title || specialty || 'Find Doctor'

  useEffect(() => () => {
    window.clearTimeout(revealTimerRef.current)
    window.clearTimeout(resolveTimerRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false
    countProviders({
      specialty: activeSpecialty,
      videoOnly: videoLocked,
    }).then((total) => {
      if (!cancelled && typeof total === 'number') setRegisteredCount(total)
    })
    return () => { cancelled = true }
  }, [activeSpecialty, videoLocked])

  useEffect(() => {
    if (specialty) setSelectedSpecialty(specialty)
  }, [specialty])

  useEffect(() => {
    setViewedIds(getViewedDoctorIds())
  }, [location.key])

  useEffect(() => {
    if (!persist || !specialty) return undefined
    return () => {
      saveExploreListState(specialty, {
        search,
        selectedLocation,
        selectedAvailability,
        sortBy,
        scrollY: scrollRef?.current?.scrollTop ?? 0,
      })
    }
  }, [persist, specialty, search, selectedLocation, selectedAvailability, sortBy, scrollRef])

  useEffect(() => {
    const reqId = ++requestIdRef.current
    if (!browseNationwide && (!locationReady || !locationOrigin)) {
      setDoctors([])
      setHasMore(false)
      setTotalCount(0)
      setScopePending(false)
      if (initialGateRef.current) {
        setLoading(true)
        return undefined
      }
      setLoading(false)
      setDialReady(true)
      return undefined
    }

    setLoading(true)
    setPage(0)
    setHasMore(false)

    const listingQuery = (page) => queryProviders({
      specialty: activeSpecialty,
      q: debouncedSearch,
      city: browseNationwide ? ALL_NEPAL_LOCATION : locality,
      sort: sortMeta.sort === 'name' || sortMeta.sort === 'rating' || sortMeta.sort === 'fee'
        ? sortMeta.sort
        : 'nearest',
      page,
      pageSize: PAGE_SIZE,
      videoOnly: videoLocked,
      bookableOnly: true,
      visitType: videoLocked ? 'Video Consultation' : preferredVisitType,
      availability: selectedAvailability,
      force: page === 0,
      origin: browseNationwide ? null : locationOrigin,
      radiusKm,
      useRadius: !browseNationwide,
    })

    ;(async () => {
      let page = 0
      let result = await listingQuery(page)
      for (let step = 0; step < 7 && result.doctors.length === 0 && result.hasMore; step += 1) {
        page += 1
        result = await listingQuery(page)
      }
      return { ...result, page }
    })().then((result) => {
      if (reqId !== requestIdRef.current) return
      if (
        initialGateRef.current
        && result.doctors.length === 0
        && !browseNationwide
        && !radiusPrimedRef.current
        && Number(radiusKm) > 10
      ) {
        radiusPrimedRef.current = true
        setRadiusKm(10)
        return
      }
      const enteringList = result.doctors.length > 0 && emptyUiRef.current
      emptyUiRef.current = result.doctors.length === 0
      setDoctors(result.doctors)
      setPage(result.page)
      setHasMore(result.hasMore)
      setTotalCount(result.total || 0)
      setLoading(false)
      setDialReady(true)
      setScopePending(false)
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      const settledInitial = initialGateRef.current
      if (settledInitial) initialGateRef.current = false
      if (settledInitial && !reduced) {
        setResolveFade(true)
        window.clearTimeout(resolveTimerRef.current)
        resolveTimerRef.current = window.setTimeout(() => setResolveFade(false), RESOLVE_MS + 20)
        setListingReveal(false)
      } else if (enteringList && !reduced && mapPhaseRef.current === 'idle') {
        setListingReveal(true)
        window.clearTimeout(revealTimerRef.current)
        revealTimerRef.current = window.setTimeout(() => {
          if (requestIdRef.current === reqId) setListingReveal(false)
        }, 450)
      } else {
        setListingReveal(false)
      }
      if (result.doctors.length === 0 && !browseNationwide && !radiusPrimedRef.current && Number(radiusKm) > 10) {
        radiusPrimedRef.current = true
        setRadiusKm(10)
      } else if (result.doctors.length === 0 && !browseNationwide) {
        radiusPrimedRef.current = true
      }
    }).catch(() => {
      if (reqId !== requestIdRef.current) return
      emptyUiRef.current = true
      setDoctors([])
      setHasMore(false)
      setTotalCount(0)
      setLoading(false)
      setDialReady(true)
      setScopePending(false)
      setListingReveal(false)
      if (initialGateRef.current) {
        initialGateRef.current = false
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
        if (!reduced) {
          setResolveFade(true)
          window.clearTimeout(resolveTimerRef.current)
          resolveTimerRef.current = window.setTimeout(() => setResolveFade(false), RESOLVE_MS + 20)
        }
      }
    })
    return undefined
  }, [
    activeSpecialty,
    debouncedSearch,
    locality,
    browseNationwide,
    sortMeta.sort,
    dataset,
    locationReady,
    locationOrigin,
    searchLat,
    searchLng,
    radiusKm,
    locationSource,
    videoLocked,
    preferredVisitType,
    selectedAvailability,
    availabilityTick,
    setRadiusKm,
  ])

  useEffect(() => subscribeProviders(() => {}), [])

  useEffect(() => subscribeAvailability(() => {
    setAvailabilityTick((tick) => tick + 1)
  }), [])

  useEffect(() => {
    if (!isPresented || !activeFilter || activeFilter === 'Sort') {
      return undefined
    }

    const context = {
      specialty: activeSpecialty,
      city: selectedLocation,
      q: debouncedSearch,
      availability: selectedAvailability,
      videoOnly: videoLocked,
    }
    const cached = peekDoctorFilterFacets(activeFilter, context)
    const reqId = ++facetRequestRef.current
    let cancelled = false

    if (cached) {
      setFacetCounts(cached)
      return undefined
    }

    setFacetCounts({})

    fetchDoctorFilterFacets(activeFilter, context, {
      onPartial: (partial) => {
        if (cancelled || reqId !== facetRequestRef.current) return
        setFacetCounts(partial || {})
      },
    }).then((counts) => {
      if (cancelled || reqId !== facetRequestRef.current) return
      setFacetCounts(counts || {})
    }).catch(() => {})

    return () => { cancelled = true }
  }, [
    isPresented,
    activeFilter,
    activeSpecialty,
    selectedLocation,
    selectedAvailability,
    debouncedSearch,
    videoLocked,
  ])

  const loadMore = () => {
    if (loadingMore || loading || !hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    ;(async () => {
      let page = nextPage
      let result = await queryProviders({
        specialty: activeSpecialty,
        q: debouncedSearch,
        city: browseNationwide ? ALL_NEPAL_LOCATION : locality,
        sort: sortMeta.sort === 'name' || sortMeta.sort === 'rating' || sortMeta.sort === 'fee'
          ? sortMeta.sort
          : 'nearest',
        page,
        pageSize: PAGE_SIZE,
        videoOnly: videoLocked,
        bookableOnly: true,
        visitType: videoLocked ? 'Video Consultation' : preferredVisitType,
        availability: selectedAvailability,
        origin: browseNationwide ? null : locationOrigin,
        radiusKm,
        useRadius: !browseNationwide,
      })
      for (let step = 0; step < 4 && result.doctors.length === 0 && result.hasMore; step += 1) {
        page += 1
        result = await queryProviders({
          specialty: activeSpecialty,
          q: debouncedSearch,
          city: browseNationwide ? ALL_NEPAL_LOCATION : locality,
          sort: sortMeta.sort === 'name' || sortMeta.sort === 'rating' || sortMeta.sort === 'fee'
            ? sortMeta.sort
            : 'nearest',
          page,
          pageSize: PAGE_SIZE,
          videoOnly: videoLocked,
          bookableOnly: true,
          visitType: videoLocked ? 'Video Consultation' : preferredVisitType,
          availability: selectedAvailability,
          origin: browseNationwide ? null : locationOrigin,
          radiusKm,
          useRadius: !browseNationwide,
        })
      }
      return { ...result, page }
    })().then((result) => {
      setDoctors((prev) => {
        const seen = new Set(prev.map((d) => String(d.providerUuid || d.id)))
        const merged = [...prev]
        for (const doc of result.doctors) {
          const key = String(doc.providerUuid || doc.id)
          if (seen.has(key)) continue
          seen.add(key)
          merged.push(doc)
        }
        return merged
      })
      setPage(result.page)
      setHasMore(result.hasMore)
      if (typeof result.total === 'number') setTotalCount(result.total)
    }).finally(() => setLoadingMore(false))
  }

  useEffect(() => {
    const node = sentinelRef.current
    const root = scrollRef?.current
    if (!node || !hasMore || loading || loadingMore) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore()
    }, { root: root || null, rootMargin: '320px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, page, doctors.length, scrollRef])

  const filteredDoctors = useMemo(() => {
    if (selectedAvailability === 'All') return doctors
    return doctors
  }, [doctors, selectedAvailability])

  const reportMapPhase = (phase, frame) => {
    mapPhaseRef.current = phase
    setMapPhase(phase)
    if (frame?.anchor && Number.isFinite(frame.zoom)) {
      setMapFrame({ zoom: frame.zoom, anchor: frame.anchor })
    }
    if (phase === 'open' || phase === 'hold') {
      setMapShell((current) => current || directoryRef.current?.querySelector('.dir-shell') || null)
    }
  }

  const hideMap = useCallback(() => {
    if (mapPhaseRef.current !== 'closing') return
    mapPhaseRef.current = 'idle'
    setMapPhase('idle')
  }, [])

  useEffect(() => {
    if (mapPhase !== 'hold') return undefined
    const timer = window.setTimeout(() => {
      if (mapPhaseRef.current !== 'hold') return
      mapPhaseRef.current = 'closing'
      setMapPhase('closing')
    }, MAP_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [mapPhase])

  useLayoutEffect(() => {
    setMapShell(directoryRef.current?.querySelector('.dir-shell') || null)
  }, [])

  const persistListState = () => {
    if (!persist || !specialty) return
    saveExploreListState(specialty, {
      search,
      selectedLocation,
      selectedAvailability,
      sortBy,
      scrollY: scrollRef?.current?.scrollTop ?? 0,
    })
  }

  const openFilter = (filter) => {
    setActiveFilter(filter)
    show()
  }

  const closeFilter = () => {
    hide(() => setActiveFilter(null))
  }

  const handleBookNow = (doctor) => {
    persistListState()
    guard(doctor, ({ forSomeoneElse }) => {
      if (onBookNow) {
        onBookNow(doctor, { forSomeoneElse })
        return
      }
      const next = withBookingEntry(location, {
        doctor,
        origin,
        returnTo: returnTo || (specialty ? `/explore/${encodeURIComponent(specialty)}` : '/booking'),
        preferredVisitType,
        forSomeoneElse,
      })
      if (isVideoEntry(next)) {
        beginReadiness(navigate, next)
        return
      }
      navigate('/booking/slot', { state: next })
    })
  }

  const sortActive = sortBy !== 'nearest'

  const renderFilterModal = () => {
    if (!isPresented || !activeFilter) return null

    let options = []
    let selected = ''
    let onSelect = () => {}
    let optionKey = (opt) => opt
    let optionLabel = (opt) => opt

    if (activeFilter === 'Location') {
      options = locations
      selected = selectedLocation
      onSelect = (city) => {
        if (city === ALL_NEPAL_LOCATION || city === 'All') {
          setBrowseNationwide(true)
        } else {
          setBrowseNationwide(false)
          selectPlaceByName(city)
        }
      }
    } else if (activeFilter === 'Specialties') {
      options = ['All', ...ALL_SPECIALISATIONS.map((s) => s.name)]
      selected = selectedSpecialty
      onSelect = setSelectedSpecialty
    } else if (activeFilter === 'Availability') {
      options = availabilities
      selected = selectedAvailability
      onSelect = setSelectedAvailability
    } else if (activeFilter === 'Sort') {
      options = SORT_OPTIONS
      selected = sortBy
      onSelect = (opt) => setSortBy(opt.id)
      optionKey = (opt) => opt.id
      optionLabel = (opt) => opt.label
    } else if (activeFilter === 'Filter') {
      // Combined filter sheet: jump targets
      options = [
        { id: 'Location', label: `Location · ${selectedLocation}` },
        !specialty ? { id: 'Specialties', label: `Specialty · ${selectedSpecialty}` } : null,
        { id: 'Availability', label: `Availability · ${selectedAvailability}` },
      ].filter(Boolean)
      onSelect = (opt) => setActiveFilter(opt.id)
      optionKey = (opt) => opt.id
      optionLabel = (opt) => opt.label
    }

    const isCombined = activeFilter === 'Filter'

    return (
      <AppBottomSheet
        open
        closing={isClosing}
        onClose={closeFilter}
        labelledBy="filter-sheet-title"
        sheetClassName="filter-sheet"
      >
        <div className="ds-sheet-header">
          <h3 id="filter-sheet-title">{activeFilter === 'Filter' ? 'Filters' : activeFilter}</h3>
          <button type="button" className="ds-sheet-close" onClick={closeFilter} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="filter-options">
          {options.map((opt) => {
            const key = optionKey(opt)
            const isActive = selected === key || selected === opt
            const showCount = activeFilter !== 'Sort' && activeFilter !== 'Filter'
            const countValue = facetCounts[key] ?? facetCounts[opt]
            const countReady = showCount && countValue != null && !Number.isNaN(Number(countValue))
            const countLabel = countReady ? formatFacetCount(countValue) : null
            return (
              <button
                type="button"
                key={key}
                className={`filter-option ${!isCombined && isActive ? 'active' : ''}`}
                onClick={() => {
                  if (isCombined) {
                    onSelect(opt)
                    return
                  }
                  onSelect(opt)
                  closeFilter()
                }}
              >
                <div className="filter-option-circle" />
                <span className="filter-option-label">{optionLabel(opt)}</span>
                {showCount ? (
                  <span
                    className={`filter-option-count-slot${countReady ? ' is-loaded' : ' is-loading'}`}
                    aria-busy={!countReady}
                  >
                    <span className="filter-option-count-skel" aria-hidden="true" />
                    <span className="filter-option-count">
                      {countLabel || '\u00a0'}
                    </span>
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </AppBottomSheet>
    )
  }

  const noMatches = dialReady && filteredDoctors.length === 0 && !search.trim()
  const findDoctorDiscovery = origin === 'find-doctor' && !browseNationwide && !search.trim()
  const awaitingFirstLocal = findDoctorDiscovery && !dialReady
  const mapSettling = mapPhase === 'hold' || mapPhase === 'closing'
  const coverListing = mapSettling && !loading && filteredDoctors.length > 0
  if (coverListing && !calmList) setCalmList(true)
  const nationwideChrome = browseNationwide && noMatches && !listingReveal
  const gestureLocksDial = mapPhase === 'open' || (mapSettling && !coverListing)
  const showLocalDial = !browseNationwide && !scopePending && !coverListing && (
    gestureLocksDial || (noMatches && !listingReveal)
  )
  const showNationwide = nationwideChrome && !loading && !scopePending
  const showSkeleton = (noMatches && scopePending)
    || (mapPhase === 'idle' && (
      (!findDoctorDiscovery && !dialReady && loading)
      || (noMatches && browseNationwide && loading)
    ))
  const showNepalCta = noMatches && !loading && Number(radiusKm) >= 100 && mapPhase !== 'open'
  const dateLabel = emptyDateLabel(selectedAvailability, radiusDate)
  const atMaxRadius = Number(radiusKm) >= 100

  const pinRadiusDate = (date) => {
    const iso = toIsoDate(date)
    if (iso && selectedAvailability !== iso) setSelectedAvailability(iso)
  }

  const onRadiusDate = (next) => {
    setRadiusDate(next)
    pinRadiusDate(next)
  }

  const emptySuggestions = [
    search.trim() ? { id: 'search', label: 'Clear search', run: () => setSearch('') } : null,
    !showLocalDial && !browseNationwide && nextExpandRadiusKm != null
      ? { id: 'expand', label: `Expand to ${nextExpandRadiusKm} km`, run: () => expandRadius() }
      : null,
    !showLocalDial && !showNationwide && selectedLocation !== ALL_NEPAL_LOCATION
      ? { id: 'cities', label: 'Search all of Nepal', run: () => setBrowseNationwide(true) }
      : !showLocalDial && !showNationwide
        ? { id: 'nearby', label: 'Back to nearby', run: () => setBrowseNationwide(false) }
        : null,
    !specialty && selectedSpecialty !== 'All' ? { id: 'specs', label: 'Show all specialties', run: () => setSelectedSpecialty('All') } : null,
    selectedAvailability !== 'All' ? { id: 'avail', label: 'Any availability', run: () => setSelectedAvailability('All') } : null,
  ].filter(Boolean)

  const onDialStep = (step) => {
    if (step.km == null) return
    radiusPrimedRef.current = true
    if (browseNationwide) setBrowseNationwide(false)
    if (radiusKm !== step.km) setRadiusKm(step.km)
  }

  const searchAcrossNepal = () => {
    radiusPrimedRef.current = true
    setScopePending(true)
    pinRadiusDate(radiusDate)
    if (!browseNationwide) setBrowseNationwide(true)
  }

  const searchNearby = () => {
    radiusPrimedRef.current = true
    setScopePending(true)
    if (browseNationwide) setBrowseNationwide(false)
    if (Number(radiusKm) !== 5) setRadiusKm(5)
  }

  const mapNode = mapPhase !== 'idle' && mapShell && mapFrame && locationOrigin
    ? createPortal(
      <RadiusMapPreview
        ref={previewRef}
        latitude={locationOrigin.latitude}
        longitude={locationOrigin.longitude}
        zoom={mapFrame.zoom}
        anchor={mapFrame.anchor}
        phase={mapPhase}
        cover={coverListing}
        fadeMs={MAP_FADE_MS}
        onHidden={hideMap}
      />,
      mapShell,
    )
    : null

  return (
    <div ref={directoryRef} className="doctor-directory" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {mapNode}
      <DirectoryShell
        title={pageTitle}
        onBack={onBack || (() => navigate(-1))}
        showBack={showBack}
        searchScope="doctors"
        searchPlaceholder="Search Doctor"
        searchQuery={search}
        onSearchChange={setSearch}
        shown={filteredDoctors.length}
        total={registeredCount ?? 0}
        countSuffix="registered doctors"
        loading={registeredCount == null}
        onSort={() => openFilter('Sort')}
        sortActive={sortActive}
        scrollRef={scrollRef}
        className={`${className} ${nationwideChrome ? 'is-nepal' : ''} ${mapPhase !== 'idle' ? 'is-map-open' : ''} ${coverListing ? 'is-map-cover' : ''} ${listingReveal ? 'is-listing-enter' : ''} ${resolveFade ? 'is-resolving' : ''}`.trim()}
        radiusMode={(showLocalDial || nationwideChrome || (noMatches && scopePending)) && !listingReveal && !coverListing}
        bare={awaitingFirstLocal}
        headerExtra={nationwideChrome ? (
          <div className="radius-nepal__dates">
            <DatePicker
              selectedDate={radiusDate}
              onSelect={onRadiusDate}
              density="compact"
              stagger={false}
            />
          </div>
        ) : (showLocalDial || awaitingFirstLocal ? null : headerExtra)}
      >
        <div className={`dir-resolve${resolveFade ? ' is-crossfade' : ''}`}>
          {(awaitingFirstLocal || resolveFade) ? (
            <div className={`dir-resolve__hold${resolveFade ? ' is-leaving' : ''}`} aria-busy={awaitingFirstLocal || undefined}>
              <EntityCardSkeletonStack count={3} />
            </div>
          ) : null}
          {awaitingFirstLocal ? null : (
          <div className="dir-resolve__next">
        {showSkeleton ? (
          <div className="radius-reveal">
            <EntityCardSkeletonStack count={3} />
          </div>
        ) : showLocalDial ? (
          <div className="radius-flow">
            <div className="radius-flow__copy">
              <p className="radius-flow__title" role="status">{nearbyEmptyTitle(dateLabel)}</p>
              <p className="radius-flow__hint">{NEARBY_EMPTY_HINT}</p>
            </div>
            <div className="radius-stage">
              <SearchRadiusDial
                radiusKm={radiusKm}
                nationwide={false}
                count={filteredDoctors.length}
                busy={loading}
                origin={locationOrigin}
                onStep={onDialStep}
                mapPhase={mapPhase}
                onMapPhase={reportMapPhase}
                previewRef={previewRef}
              />
              {atMaxRadius ? (
                <button
                  type="button"
                  className={`radius-flow__action${showNepalCta ? ' is-shown' : ''}`}
                  aria-hidden={showNepalCta ? undefined : true}
                  tabIndex={showNepalCta ? 0 : -1}
                  onClick={showNepalCta ? searchAcrossNepal : undefined}
                >
                  Search across Nepal
                </button>
              ) : null}
            </div>
          </div>
        ) : showNationwide ? (
          <div className="radius-nepal">
            <div className="radius-nepal__copy-block">
              <p className="radius-nepal__copy" role="status">{nationwideEmptyTitle(dateLabel)}</p>
              <p className="radius-nepal__hint">{NATIONWIDE_EMPTY_HINT}</p>
            </div>
            <button type="button" className="radius-flow__action" onClick={searchNearby}>
              Search nearby
            </button>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="dir-shell__empty doctors-empty">
            <h3>No doctors match</h3>
            <p role="status">
              {selectedAvailability !== 'All'
                ? `No doctors have an open slot for ${dateLabel || selectedAvailability.toLowerCase()}.`
                : search.trim()
                  ? `Try a different name, degree, or city, or search without “${search.trim()}”.`
                  : specialty
                    ? `No ${specialty} providers with an open slot matched within ${radiusKm} km of ${selectedLocation}.`
                    : `No providers with an open slot matched within ${radiusKm} km of ${selectedLocation}.`}
            </p>
            {!browseNationwide && !search.trim() ? (
              <ExpandRadiusEmpty
                radiusKm={radiusKm}
                nextRadiusKm={nextExpandRadiusKm}
                locality={locality}
                entityLabel="doctors"
                onExpand={() => expandRadius()}
              />
            ) : null}
            <div className="doctors-empty-suggestions">
              {emptySuggestions.map((item) => (
                <button type="button" key={item.id} onClick={item.run}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className={`dir-shell__list${listingReveal || calmList ? '' : ' is-revealed'}`}>
            {filteredDoctors.map((doctor) => (
              <li key={doctor.providerUuid || doctor.id}>
                <DoctorEntityCard
                  doctor={doctor}
                  origin={origin}
                  returnTo={returnTo || (specialty ? `/explore/${encodeURIComponent(specialty)}` : location.pathname)}
                  onBeforeNavigate={persistListState}
                  onBookNow={() => handleBookNow(doctor)}
                  recentlyViewed={viewedIds.includes(String(doctor.id)) || viewedIds.includes(Number(doctor.id))}
                />
              </li>
            ))}
            {hasMore ? (
              <li ref={sentinelRef} className="dir-shell__scroll-sentinel" aria-hidden={loadingMore ? undefined : true}>
                {loadingMore ? <EntityCardSkeletonStack count={1} /> : null}
              </li>
            ) : null}
          </ul>
        )}
          </div>
          )}
        </div>
      </DirectoryShell>
      {renderFilterModal()}
      {modal}
    </div>
  )
}
