import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { queryProviders, subscribeProviders, fetchDoctorFilterFacets, peekDoctorFilterFacets } from '../features/providers'
import { ALL_SPECIALISATIONS, canonicalSpecialty, loadExploreListState, saveExploreListState } from '../data/specialisations'
import { withBookingEntry } from '../lib/careFlow'
import { getViewedDoctorIds } from '../lib/recentDoctors'
import { NEPAL_LOCATION_OPTIONS, NEPAL_DEFAULT_LOCATION, ALL_NEPAL_LOCATION, detectNepalCityFromDevice } from '../data/nepalGeography'
import { useAppSheet } from './PageTransition'
import AppBottomSheet from './AppBottomSheet'
import SearchBar from './SearchBar'
import DoctorCard from './DoctorCard'
import { BookingReveal } from './BookingReveal'
import useDuplicateBookingGuard from '../hooks/useDuplicateBookingGuard'
import './SelectProvider.css'

const locations = NEPAL_LOCATION_OPTIONS
const availabilities = ['All', 'Today', 'Tomorrow', 'This Week']
const PAGE_SIZE = 24

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended', sort: 'name' },
  { id: 'rating', label: 'Highest Rated', sort: 'rating' },
  { id: 'fee', label: 'Lowest Fee', sort: 'fee' },
  { id: 'nearest', label: 'Nearest', sort: 'name' },
  { id: 'available', label: 'Earliest Available', sort: 'name' },
]

function formatResultsHeading({ total, specialty, location }) {
  if (specialty) {
    const label = Number(total) === 1 || /s$/i.test(specialty) ? specialty : `${specialty}s`
    if (location && location !== ALL_NEPAL_LOCATION) return `${label} near ${location}`
    if (location === ALL_NEPAL_LOCATION) return `${label} across Nepal`
    return label
  }
  if (location && location !== ALL_NEPAL_LOCATION) return `Doctors near ${location}`
  if (location === ALL_NEPAL_LOCATION) return 'Doctors across Nepal'
  return 'Doctors'
}

function formatResultsCount({ shown, total }) {
  const shownLabel = Number(shown || 0).toLocaleString('en-NP')
  const totalLabel = Number(total || 0).toLocaleString('en-NP')
  return `Showing ${shownLabel} of ${totalLabel}`
}

function formatFacetCount(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value).toLocaleString('en-NP')
}

function ChipX() {
  return (
    <svg className="active-filter-x" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ListSkeleton() {
  return (
    <div className="doctor-list-skel" aria-hidden="true">
      <div className="doctor-list-skel-top">
        <div className="doctor-list-skel-photo" />
        <div className="doctor-list-skel-copy">
          <div className="doctor-list-skel-line wide" />
          <div className="doctor-list-skel-line mid" />
          <div className="doctor-list-skel-line short" />
        </div>
      </div>
      <div className="doctor-list-skel-details">
        <div className="doctor-list-skel-line long" />
        <div className="doctor-list-skel-tags">
          <div className="doctor-list-skel-tag" />
          <div className="doctor-list-skel-tag" />
        </div>
        <div className="doctor-list-skel-line avail" />
      </div>
      <div className="doctor-list-skel-footer">
        <div className="doctor-list-skel-line fee" />
        <div className="doctor-list-skel-btn" />
      </div>
    </div>
  )
}

function ListSkeletonStack({ count = 3 }) {
  return (
    <div className="doctors-list doctors-list--skel" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <ListSkeleton key={i} />
      ))}
    </div>
  )
}

function useDebouncedValue(value, delay = 280) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function DoctorList({
  lockedSpecialty = null,
  origin = 'find-doctor',
  returnTo,
  persist = false,
  dataset,
  scrollRootRef,
  onBookNow,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { guard, modal } = useDuplicateBookingGuard()
  const preferredVisitType = location.state?.preferredVisitType
  const specialty = lockedSpecialty ? canonicalSpecialty(lockedSpecialty) : null
  const saved = persist && specialty ? loadExploreListState(specialty) : null
  const embedded = origin === 'explore'

  const [search, setSearch] = useState(saved?.search ?? '')
  const debouncedSearch = useDebouncedValue(search, 280)
  const [activeFilter, setActiveFilter] = useState(null)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const [selectedSpecialty, setSelectedSpecialty] = useState(specialty || saved?.selectedSpecialty || 'All')
  const [selectedLocation, setSelectedLocation] = useState(
    saved?.selectedLocation && saved.selectedLocation !== 'All'
      ? saved.selectedLocation
      : NEPAL_DEFAULT_LOCATION,
  )
  const [selectedAvailability, setSelectedAvailability] = useState(saved?.selectedAvailability || 'All')
  const [sortBy, setSortBy] = useState(saved?.sortBy || 'recommended')
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
  const gpsTriedRef = useRef(false)

  const sortMeta = SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0]
  const activeSpecialty = specialty || (selectedSpecialty !== 'All' ? selectedSpecialty : null)

  useEffect(() => {
    if (specialty) setSelectedSpecialty(specialty)
  }, [specialty])

  useEffect(() => {
    setViewedIds(getViewedDoctorIds())
  }, [location.key])

  // Nearby-first: detect device city once; fall back stays Kathmandu.
  useEffect(() => {
    if (gpsTriedRef.current) return undefined
    if (saved?.selectedLocation && saved.selectedLocation !== 'All') return undefined
    gpsTriedRef.current = true
    let cancelled = false
    detectNepalCityFromDevice().then((city) => {
      if (cancelled || !city) return
      setSelectedLocation((prev) => (
        prev === NEPAL_DEFAULT_LOCATION || prev === 'All' ? city : prev
      ))
    })
    return () => { cancelled = true }
  }, [saved?.selectedLocation])

  useEffect(() => {
    if (!persist || !specialty) return undefined
    return () => {
      saveExploreListState(specialty, {
        search,
        selectedLocation,
        selectedAvailability,
        sortBy,
        scrollY: scrollRootRef?.current?.scrollTop ?? 0,
      })
    }
  }, [persist, specialty, search, selectedLocation, selectedAvailability, sortBy, scrollRootRef])

  // Live registry query — resets when filters/search change.
  useEffect(() => {
    const reqId = ++requestIdRef.current
    setLoading(true)
    setPage(0)
    setHasMore(false)

    queryProviders({
      specialty: activeSpecialty,
      q: debouncedSearch,
      city: selectedLocation,
      sort: sortMeta.sort,
      page: 0,
      pageSize: PAGE_SIZE,
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
  }, [activeSpecialty, debouncedSearch, selectedLocation, sortMeta.sort, dataset])

  // Keep list cards in sync if featured hydrate merges overlapping rows.
  useEffect(() => subscribeProviders(() => {
    /* indexed rows already updated; leave current page as-is */
  }), [])

  // Live facet counts — skeleton-first, cache-aware, no layout shift.
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
    }).catch(() => {
      if (cancelled || reqId !== facetRequestRef.current) return
      /* keep whatever partials arrived */
    })

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
      city: selectedLocation,
      sort: sortMeta.sort,
      page: nextPage,
      pageSize: PAGE_SIZE,
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

  const shownCount = filteredDoctors.length
  const sortLabel = sortMeta.label
  const listReady = !loading
  // Find Doctor already has a page title — skip the redundant location heading.
  const showResultsHeading = Boolean(specialty)
  const resultsHeading = showResultsHeading
    ? formatResultsHeading({
      total: totalCount,
      specialty: activeSpecialty,
      location: selectedLocation,
    })
    : ''
  const resultsCount = formatResultsCount({
    shown: shownCount,
    total: totalCount,
  })

  const activeChips = useMemo(() => {
    const chips = []
    const query = search.trim()
    if (query) {
      chips.push({ id: 'search', label: `“${query}”`, clear: () => setSearch('') })
    }
    if (selectedLocation && selectedLocation !== NEPAL_DEFAULT_LOCATION && selectedLocation !== ALL_NEPAL_LOCATION) {
      chips.push({ id: 'location', label: selectedLocation, clear: () => setSelectedLocation(NEPAL_DEFAULT_LOCATION) })
    }
    if (selectedLocation === ALL_NEPAL_LOCATION) {
      chips.push({ id: 'location', label: ALL_NEPAL_LOCATION, clear: () => setSelectedLocation(NEPAL_DEFAULT_LOCATION) })
    }
    if (!specialty && selectedSpecialty !== 'All') {
      chips.push({ id: 'specialty', label: selectedSpecialty, clear: () => setSelectedSpecialty('All') })
    }
    if (selectedAvailability !== 'All') {
      chips.push({ id: 'availability', label: selectedAvailability, clear: () => setSelectedAvailability('All') })
    }
    if (sortBy !== 'recommended') {
      chips.push({ id: 'sort', label: sortLabel, clear: () => setSortBy('recommended') })
    }
    return chips
  }, [search, selectedLocation, selectedSpecialty, selectedAvailability, sortBy, specialty, sortLabel])

  const clearAll = () => {
    setSearch('')
    setSelectedLocation(NEPAL_DEFAULT_LOCATION)
    if (!specialty) setSelectedSpecialty('All')
    setSelectedAvailability('All')
    setSortBy('recommended')
  }

  const persistListState = () => {
    if (!persist || !specialty) return
    saveExploreListState(specialty, {
      search,
      selectedLocation,
      selectedAvailability,
      sortBy,
      scrollY: scrollRootRef?.current?.scrollTop ?? 0,
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
      onSelect = setSelectedLocation
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
    }

    return (
      <AppBottomSheet
        open
        closing={isClosing}
        onClose={closeFilter}
        labelledBy="filter-sheet-title"
        sheetClassName="filter-sheet"
      >
        <div className="ds-sheet-header">
          <h3 id="filter-sheet-title">{activeFilter}</h3>
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
            const showCount = activeFilter !== 'Sort'
            const countValue = facetCounts[key] ?? facetCounts[opt]
            const countReady = showCount && countValue != null && !Number.isNaN(Number(countValue))
            const countLabel = countReady ? formatFacetCount(countValue) : null
            return (
              <button
                type="button"
                key={key}
                className={`filter-option ${isActive ? 'active' : ''}`}
                onClick={() => { onSelect(opt); closeFilter() }}
              >
                <div className="filter-option-circle" />
                <span className="filter-option-label">{optionLabel(opt)}</span>
                {showCount ? (
                  <span
                    className={`filter-option-count-slot${countReady ? ' is-loaded' : ' is-loading'}`}
                    aria-busy={!countReady}
                    aria-label={countReady ? `${countLabel} doctors` : undefined}
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
    selectedLocation !== ALL_NEPAL_LOCATION
      ? { id: 'cities', label: 'Search all of Nepal', run: () => setSelectedLocation(ALL_NEPAL_LOCATION) }
      : { id: 'ktm', label: 'Near Kathmandu', run: () => setSelectedLocation(NEPAL_DEFAULT_LOCATION) },
    !specialty && selectedSpecialty !== 'All' ? { id: 'specs', label: 'Show all specialties', run: () => setSelectedSpecialty('All') } : null,
    selectedAvailability !== 'All' ? { id: 'avail', label: 'Any availability', run: () => setSelectedAvailability('All') } : null,
    sortBy !== 'recommended' ? { id: 'sort', label: 'Reset sort', run: () => setSortBy('recommended') } : null,
  ].filter(Boolean)

  return (
    <div className={`select-provider${embedded ? ' select-provider--embedded' : ''}`}>
      <div className="provider-search">
        <SearchBar
          mode="inline"
          scope="doctors"
          placeholder="Name, city or degree"
          query={search}
          onQueryChange={setSearch}
        />
      </div>

      <div className="filter-chips" role="toolbar" aria-label="Doctor filters">
        <button type="button" className="filter-chip active" onClick={() => openFilter('Location')}>
          {selectedLocation || NEPAL_DEFAULT_LOCATION}
          <svg className="filter-chip-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {!specialty ? (
          <button type="button" className={`filter-chip ${selectedSpecialty !== 'All' ? 'active' : ''}`} onClick={() => openFilter('Specialties')}>
            Specialties
            <svg className="filter-chip-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        ) : null}
        <button type="button" className={`filter-chip ${selectedAvailability !== 'All' ? 'active' : ''}`} onClick={() => openFilter('Availability')}>
          Availability
          <svg className="filter-chip-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button type="button" className={`filter-chip ${sortBy !== 'recommended' ? 'active' : ''}`} onClick={() => openFilter('Sort')}>
          Sort
          <svg className="filter-chip-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className={`results-meta${showResultsHeading ? '' : ' is-count-only'}`} aria-live="polite">
        {listReady ? (
          <>
            {showResultsHeading ? <h2 className="results-meta-title">{resultsHeading}</h2> : null}
            <p className="results-meta-count">{resultsCount}</p>
          </>
        ) : (
          <div className="results-meta-skel-stack" aria-hidden="true">
            {showResultsHeading ? <span className="results-meta-skel results-meta-skel--title" /> : null}
            <span className="results-meta-skel results-meta-skel--count" />
          </div>
        )}
      </div>

      <div className={`active-filters${activeChips.length ? '' : ' is-empty'}`} aria-hidden={activeChips.length === 0}>
        {activeChips.length > 0 ? (
          <>
            <div className="active-filters-chips">
              {activeChips.map((chip) => (
                <button
                  type="button"
                  key={chip.id}
                  className="active-filter-chip"
                  onClick={chip.clear}
                  aria-label={`Remove ${chip.label}`}
                >
                  <span>{chip.label}</span>
                  <ChipX />
                </button>
              ))}
            </div>
            <button type="button" className="clear-all-filters" onClick={clearAll}>
              Clear All
            </button>
          </>
        ) : null}
      </div>

      <BookingReveal ready={listReady} skeleton={<ListSkeletonStack count={3} />}>
        <div className="doctors-list">
          {shownCount === 0 ? (
            <div className="doctors-empty">
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
                    ? `No ${specialty} providers matched near ${selectedLocation}. Try All Nepal or another city.`
                    : `No providers matched near ${selectedLocation}. Try All Nepal or another city.`}
              </p>
              <div className="doctors-empty-suggestions">
                {(emptySuggestions.length ? emptySuggestions : [{ id: 'reset', label: 'Clear all filters', run: clearAll }]).map((item) => (
                  <button type="button" key={item.id} onClick={item.run}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {filteredDoctors.map((doctor) => (
                <div className="doctor-list-card" key={doctor.providerUuid || doctor.id}>
                  <DoctorCard
                    doctor={doctor}
                    variant="list"
                    origin={origin}
                    returnTo={returnTo || (specialty ? `/explore/${encodeURIComponent(specialty)}` : location.pathname)}
                    onBeforeNavigate={persistListState}
                    onBookNow={() => handleBookNow(doctor)}
                    recentlyViewed={viewedIds.includes(String(doctor.id)) || viewedIds.includes(Number(doctor.id))}
                  />
                </div>
              ))}
              {hasMore ? (
                <button
                  type="button"
                  className="doctors-load-more"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading…' : 'Load more doctors'}
                </button>
              ) : null}
            </>
          )}
        </div>
      </BookingReveal>

      {renderFilterModal()}
      {modal}
    </div>
  )
}
