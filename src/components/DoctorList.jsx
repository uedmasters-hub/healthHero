import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getDoctorList, specialtyList } from '../data/doctors'
import { canonicalSpecialty, loadExploreListState, saveExploreListState } from '../data/specialisations'
import { withBookingEntry } from '../lib/careFlow'
import { getViewedDoctorIds } from '../lib/recentDoctors'
import { SheetPortal, useAppSheet } from './PageTransition'
import { SearchField } from './SearchBar'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import DoctorCard from './DoctorCard'
import useDuplicateBookingGuard from '../hooks/useDuplicateBookingGuard'
import './SelectProvider.css'

const doctors = getDoctorList()

const locations = ['All', 'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Gurugram', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi', 'Bhopal', 'Indore', 'Nagpur', 'Surat', 'Visakhapatnam', 'Coimbatore', 'Patna', 'Thiruvananthapuram']
const availabilities = ['All', 'Today', 'Tomorrow', 'This Week']

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Highest Rated' },
  { id: 'nearest', label: 'Nearest' },
  { id: 'fee', label: 'Lowest Fee' },
  { id: 'available', label: 'Earliest Available' },
]

function travelMinutes(doc) {
  const n = parseInt(String(doc.travelTime || ''), 10)
  return Number.isFinite(n) ? n : 999
}

function availabilityRank(doc) {
  const text = String(doc.availability || '')
  const day = /today/i.test(text) ? 0 : /tomorrow/i.test(text) ? 1 : 2
  const match = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
  let minutes = 24 * 60
  if (match) {
    let hours = parseInt(match[1], 10)
    const mins = parseInt(match[2], 10)
    const meridian = match[3].toLowerCase()
    if (meridian === 'pm' && hours !== 12) hours += 12
    if (meridian === 'am' && hours === 12) hours = 0
    minutes = hours * 60 + mins
  }
  return day * 10000 + minutes
}

function sortDoctors(list, sortBy) {
  const next = [...list]
  if (sortBy === 'rating') next.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  else if (sortBy === 'nearest') next.sort((a, b) => travelMinutes(a) - travelMinutes(b))
  else if (sortBy === 'fee') next.sort((a, b) => (a.fee ?? 9999) - (b.fee ?? 9999))
  else if (sortBy === 'available') next.sort((a, b) => availabilityRank(a) - availabilityRank(b))
  return next
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
      <div className="doctor-list-skel-line long" />
      <div className="doctor-list-skel-footer">
        <div className="doctor-list-skel-line fee" />
        <div className="doctor-list-skel-btn" />
      </div>
    </div>
  )
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

  const [search, setSearch] = useState(saved?.search ?? '')
  const [activeFilter, setActiveFilter] = useState(null)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const [selectedSpecialty, setSelectedSpecialty] = useState(specialty || saved?.selectedSpecialty || 'All')
  const [selectedLocation, setSelectedLocation] = useState(saved?.selectedLocation || 'All')
  const [selectedAvailability, setSelectedAvailability] = useState(saved?.selectedAvailability || 'All')
  const [sortBy, setSortBy] = useState(saved?.sortBy || 'recommended')
  const [refreshing, setRefreshing] = useState(false)
  const [viewedIds, setViewedIds] = useState(() => getViewedDoctorIds())
  const skipRefresh = useRef(true)

  const queryKey = `${search}|${selectedLocation}|${selectedSpecialty}|${selectedAvailability}|${sortBy}`
  const listReveal = useStaggerReveal({
    dataset: dataset ? `${dataset}:${queryKey}` : `doctors:${queryKey}`,
    delay: 160,
  })
  const filterReveal = useStaggerReveal({ dataset: isPresented && activeFilter ? `filter:${activeFilter}` : null, delay: 140 })

  useEffect(() => {
    if (specialty) setSelectedSpecialty(specialty)
  }, [specialty])

  useEffect(() => {
    setViewedIds(getViewedDoctorIds())
  }, [location.key])

  useEffect(() => {
    if (skipRefresh.current) {
      skipRefresh.current = false
      return undefined
    }
    setRefreshing(true)
    const timer = setTimeout(() => setRefreshing(false), 240)
    return () => clearTimeout(timer)
  }, [queryKey])

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

  const filteredDoctors = useMemo(() => {
    const matched = doctors.filter((doc) => {
      const query = search.trim().toLowerCase()
      const matchSearch = !query
        || doc.name.toLowerCase().includes(query)
        || doc.specialty.toLowerCase().includes(query)
      const matchSpecialty = specialty
        ? canonicalSpecialty(doc.specialty) === specialty
        : selectedSpecialty === 'All' || doc.specialty === selectedSpecialty
      const matchLocation = selectedLocation === 'All'
        || ((selectedLocation === 'Delhi' || selectedLocation === 'New Delhi')
          ? /(?:^|,\s*)(?:New\s+)?Delhi\b/i.test(doc.address)
          : selectedLocation === 'Bengaluru'
            ? /bengaluru|bangalore/i.test(doc.address)
            : selectedLocation === 'Gurugram'
              ? /gurugram|gurgaon/i.test(doc.address)
              : doc.address.includes(selectedLocation))
      const matchAvailability = selectedAvailability === 'All'
        || (selectedAvailability === 'Today' && doc.availability.includes('Today'))
        || (selectedAvailability === 'Tomorrow' && doc.availability.includes('Tomorrow'))
        || (selectedAvailability === 'This Week')
      return matchSearch && matchSpecialty && matchLocation && matchAvailability
    })
    return sortDoctors(matched, sortBy)
  }, [search, selectedLocation, selectedSpecialty, selectedAvailability, sortBy, specialty])

  const resultCount = filteredDoctors.length
  const sortLabel = SORT_OPTIONS.find((opt) => opt.id === sortBy)?.label || 'Recommended'

  const activeChips = useMemo(() => {
    const chips = []
    const query = search.trim()
    if (query) {
      chips.push({ id: 'search', label: `“${query}”`, clear: () => setSearch('') })
    }
    if (selectedLocation !== 'All') {
      chips.push({ id: 'location', label: selectedLocation, clear: () => setSelectedLocation('All') })
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
    setSelectedLocation('All')
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
      options = ['All', ...specialtyList]
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
      <SheetPortal to="screen">
        <div className={`filter-overlay ${isClosing ? 'closing' : ''}`} onClick={closeFilter}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>{activeFilter}</h3>
              <button className="filter-modal-close" onClick={closeFilter}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="filter-options" ref={filterReveal.containerRef}>
              {options.map((opt, i) => {
                const key = optionKey(opt)
                const isActive = selected === key || selected === opt
                return (
                  <RevealItem
                    as="button"
                    key={key}
                    className={`filter-option ${isActive ? 'active' : ''}`}
                    revealed={filterReveal.isRevealed(i)}
                    cached={filterReveal.isCached}
                    ref={filterReveal.setItemRef(i)}
                    onClick={() => { onSelect(opt); closeFilter() }}
                  >
                    <div className="filter-option-circle" />
                    <span className="filter-option-label">{optionLabel(opt)}</span>
                  </RevealItem>
                )
              })}
            </div>
          </div>
        </div>
      </SheetPortal>
    )
  }

  const emptySuggestions = [
    search.trim() ? { id: 'search', label: 'Clear search', run: () => setSearch('') } : null,
    selectedLocation !== 'All' ? { id: 'cities', label: 'Search all cities', run: () => setSelectedLocation('All') } : null,
    !specialty && selectedSpecialty !== 'All' ? { id: 'specs', label: 'Show all specialties', run: () => setSelectedSpecialty('All') } : null,
    selectedAvailability !== 'All' ? { id: 'avail', label: 'Any availability', run: () => setSelectedAvailability('All') } : null,
    sortBy !== 'recommended' ? { id: 'sort', label: 'Reset sort', run: () => setSortBy('recommended') } : null,
  ].filter(Boolean)

  return (
    <div className="select-provider">
      <div className="provider-search">
        <SearchField
          placeholder="Search Doctor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-chips">
        <button className={`filter-chip ${selectedLocation !== 'All' ? 'active' : ''}`} onClick={() => openFilter('Location')}>
          Location
          <svg className="filter-chip-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {specialty ? (
          <button type="button" className="filter-chip active locked" aria-disabled="true">
            {specialty}
          </button>
        ) : (
          <button className={`filter-chip ${selectedSpecialty !== 'All' ? 'active' : ''}`} onClick={() => openFilter('Specialties')}>
            Specialties
            <svg className="filter-chip-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
        <button className={`filter-chip ${selectedAvailability !== 'All' ? 'active' : ''}`} onClick={() => openFilter('Availability')}>
          Availability
          <svg className="filter-chip-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button className={`filter-chip ${sortBy !== 'recommended' ? 'active' : ''}`} onClick={() => openFilter('Sort')}>
          Sort
          <svg className="filter-chip-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className="results-meta" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'Doctor' : 'Doctors'} Found
      </div>

      {activeChips.length > 0 ? (
        <div className="active-filters">
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
        </div>
      ) : null}

      <div className="doctors-list" ref={refreshing ? undefined : listReveal.containerRef}>
        {refreshing ? (
          <>
            <ListSkeleton />
            <ListSkeleton />
            <ListSkeleton />
          </>
        ) : resultCount === 0 ? (
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
                ? `Try a different name, city, or availability, or search without “${search.trim()}”.`
                : 'Try a different name, city, or availability.'}
            </p>
            <div className="doctors-empty-suggestions">
              {(emptySuggestions.length ? emptySuggestions : [{ id: 'reset', label: 'Clear all filters', run: clearAll }]).map((item) => (
                <button type="button" key={item.id} onClick={item.run}>
                  {item.label}
                </button>
              ))}
              {emptySuggestions.length > 0 ? (
                <button type="button" className="doctors-empty-clear" onClick={clearAll}>
                  Clear all filters
                </button>
              ) : null}
            </div>
          </div>
        ) : filteredDoctors.map((doctor, i) => (
          <RevealItem
            className="doctor-list-card"
            key={doctor.id}
            revealed={listReveal.isRevealed(i)}
            cached={listReveal.isCached}
            ref={listReveal.setItemRef(i)}
          >
            <DoctorCard
              doctor={doctor}
              variant="list"
              origin={origin}
              returnTo={returnTo || (specialty ? `/explore/${encodeURIComponent(specialty)}` : location.pathname)}
              onBeforeNavigate={persistListState}
              onBookNow={() => handleBookNow(doctor)}
              recentlyViewed={viewedIds.includes(Number(doctor.id))}
            />
          </RevealItem>
        ))}
      </div>

      {renderFilterModal()}
      {modal}
    </div>
  )
}
