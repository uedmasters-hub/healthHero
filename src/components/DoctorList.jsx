import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { queryProviders, subscribeProviders, fetchDoctorFilterFacets, peekDoctorFilterFacets } from '../features/providers'
import { ALL_SPECIALISATIONS, canonicalSpecialty, loadExploreListState, saveExploreListState } from '../data/specialisations'
import { withBookingEntry } from '../lib/careFlow'
import { getViewedDoctorIds } from '../lib/recentDoctors'
import { NEPAL_LOCATION_OPTIONS, ALL_NEPAL_LOCATION } from '../data/nepalGeography'
import { useAppLocation } from '../features/location'
import ExpandRadiusEmpty from './ExpandRadiusEmpty'
import './ExpandRadiusEmpty.css'
import { useAppSheet } from './PageTransition'
import AppBottomSheet from './AppBottomSheet'
import useDuplicateBookingGuard from '../hooks/useDuplicateBookingGuard'
import {
  DirectoryShell,
  DoctorEntityCard,
  EntityCardSkeletonStack,
} from './directory'
import './SelectProvider.css'
import './directory/DirectoryShell.css'

const locations = NEPAL_LOCATION_OPTIONS
const availabilities = ['All', 'Today', 'Tomorrow', 'This Week']
const PAGE_SIZE = 24

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
  const specialty = lockedSpecialty ? canonicalSpecialty(lockedSpecialty) : null
  const saved = persist && specialty ? loadExploreListState(specialty) : null

  const [search, setSearch] = useState(saved?.search ?? '')
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
  const [selectedAvailability, setSelectedAvailability] = useState(saved?.selectedAvailability || 'All')
  const [sortBy, setSortBy] = useState(saved?.sortBy || 'nearest')
  const [viewedIds, setViewedIds] = useState(() => getViewedDoctorIds())
  const [facetCounts, setFacetCounts] = useState({})
  const facetRequestRef = useRef(0)

  const [doctors, setDoctors] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestIdRef = useRef(0)
  const internalScrollRef = useRef(null)
  const scrollRef = scrollRootRef || internalScrollRef

  const sortMeta = SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0]
  const activeSpecialty = specialty || (selectedSpecialty !== 'All' ? selectedSpecialty : null)
  const pageTitle = title || specialty || 'Find Doctor'

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
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setPage(0)
    setHasMore(false)

    queryProviders({
      specialty: activeSpecialty,
      q: debouncedSearch,
      city: browseNationwide ? ALL_NEPAL_LOCATION : locality,
      sort: sortMeta.sort === 'name' || sortMeta.sort === 'rating' || sortMeta.sort === 'fee'
        ? sortMeta.sort
        : 'nearest',
      page: 0,
      pageSize: PAGE_SIZE,
      force: true,
      origin: browseNationwide ? null : locationOrigin,
      radiusKm,
      useRadius: !browseNationwide,
    }).then((result) => {
      if (reqId !== requestIdRef.current) return
      setDoctors(result.doctors)
      setHasMore(result.hasMore)
      setTotalCount(result.total || 0)
      setLoading(false)
    }).catch(() => {
      if (reqId !== requestIdRef.current) return
      setDoctors([])
      setHasMore(false)
      setTotalCount(0)
      setLoading(false)
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
  ])

  useEffect(() => subscribeProviders(() => {}), [])

  useEffect(() => {
    if (!isPresented || !activeFilter || activeFilter === 'Sort') {
      return undefined
    }

    const context = {
      specialty: activeSpecialty,
      city: selectedLocation,
      q: debouncedSearch,
      availability: selectedAvailability,
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
  ])

  const loadMore = () => {
    if (loadingMore || loading || !hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    queryProviders({
      specialty: activeSpecialty,
      q: debouncedSearch,
      city: browseNationwide ? ALL_NEPAL_LOCATION : locality,
      sort: sortMeta.sort === 'name' || sortMeta.sort === 'rating' || sortMeta.sort === 'fee'
        ? sortMeta.sort
        : 'nearest',
      page: nextPage,
      pageSize: PAGE_SIZE,
      origin: browseNationwide ? null : locationOrigin,
      radiusKm,
      useRadius: !browseNationwide,
    }).then((result) => {
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
      setPage(nextPage)
      setHasMore(result.hasMore)
      if (typeof result.total === 'number') setTotalCount(result.total)
    }).finally(() => setLoadingMore(false))
  }

  const filteredDoctors = useMemo(() => {
    if (selectedAvailability === 'All') return doctors
    return doctors
  }, [doctors, selectedAvailability])

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
      navigate('/booking/slot', {
        state: withBookingEntry(location, {
          doctor,
          origin,
          returnTo: returnTo || (specialty ? `/explore/${encodeURIComponent(specialty)}` : '/booking'),
          preferredVisitType,
          forSomeoneElse,
        }),
      })
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

  const emptySuggestions = [
    search.trim() ? { id: 'search', label: 'Clear search', run: () => setSearch('') } : null,
    !browseNationwide && nextExpandRadiusKm != null
      ? { id: 'expand', label: `Expand to ${nextExpandRadiusKm} km`, run: () => expandRadius() }
      : null,
    selectedLocation !== ALL_NEPAL_LOCATION
      ? { id: 'cities', label: 'Search all of Nepal', run: () => setBrowseNationwide(true) }
      : { id: 'nearby', label: 'Back to nearby', run: () => setBrowseNationwide(false) },
    !specialty && selectedSpecialty !== 'All' ? { id: 'specs', label: 'Show all specialties', run: () => setSelectedSpecialty('All') } : null,
    selectedAvailability !== 'All' ? { id: 'avail', label: 'Any availability', run: () => setSelectedAvailability('All') } : null,
  ].filter(Boolean)

  return (
    <div className="doctor-directory" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <DirectoryShell
        title={pageTitle}
        onBack={onBack || (() => navigate(-1))}
        showBack={showBack}
        searchScope="doctors"
        searchPlaceholder="Search Doctor"
        searchQuery={search}
        onSearchChange={setSearch}
        shown={filteredDoctors.length}
        total={totalCount}
        loading={loading}
        onSort={() => openFilter('Sort')}
        sortActive={sortActive}
        scrollRef={scrollRef}
        headerExtra={headerExtra}
        className={className}
      >
        {loading ? (
          <EntityCardSkeletonStack count={3} />
        ) : filteredDoctors.length === 0 ? (
          <div className="dir-shell__empty doctors-empty">
            <div className="doctors-empty-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3>No doctors match</h3>
            <p>
              {search.trim()
                ? `Try a different name, degree, or city, or search without “${search.trim()}”.`
                : specialty
                  ? `No ${specialty} providers matched within ${radiusKm} km of ${selectedLocation}.`
                  : `No providers matched within ${radiusKm} km of ${selectedLocation}.`}
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
          <ul className="dir-shell__list">
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
              <li>
                <button
                  type="button"
                  className="dir-shell__load-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading…' : 'Load more doctors'}
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </DirectoryShell>
      {renderFilterModal()}
      {modal}
    </div>
  )
}
