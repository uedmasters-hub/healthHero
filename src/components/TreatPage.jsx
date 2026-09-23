import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBooking } from './BookingContext'
import useNow from '../hooks/useNow'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import SearchBar from './SearchBar'
import TreatSearchSuggestions from './TreatSearchSuggestions'
import UpcomingBookingsCarousel from './UpcomingBookingsCarousel'
import { visitSummary } from '../data/care'
import { resolveAppointmentPath } from '../lib/appointmentJourney'
import {
  getServiceMeta,
  resolveServiceType,
  toLegacyBooking,
  useCareHistory,
} from '../booking'
import { useDemoPreview } from './DemoPreviewModal'
import { isPreviewServiceType } from '../lib/previewModules'
import AppFooter from './AppFooter'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshTreatData } from '../features/sync/pageRefresh'
import { useUser } from '../user'
import { useSearchQuery } from '../features/search'
import { ProfileSheets } from './profile/ProfileHealth'
import './TreatPage.css'

const historyTabs = ['All', 'Active', 'Upcoming', 'Completed', 'Cancelled']
const sortOptions = [
  { id: 'recent', label: 'Most recent' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'name', label: 'Doctor A–Z' },
]
const visitFilters = ['All types', 'In-Person', 'Video Consultation']
const TREAT_SEARCH_PLACEHOLDER = 'Search your care, visits, and records…'

function matchesVisitType(booking, visitType) {
  if (visitType === 'All types') return true
  const type = booking.visitType || ''
  if (visitType === 'Video Consultation') return /video|virtual/i.test(type)
  return /in-?person/i.test(type) || (!/video|virtual/i.test(type) && visitType === 'In-Person')
}

export default function TreatPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const now = useNow()
  const { health } = useUser()
  const { adoptBooking, getResumePath, focusBooking, hydrated } = useBooking()
  const historySectionRef = useRef(null)
  const scrollRef = useRef(null)
  const [searchActive, setSearchActive] = useState(false)
  const [query, setQuery] = useSearchQuery('treat')
  const [recordSheet, setRecordSheet] = useState(null)
  const onRefresh = useCallback(() => refreshTreatData(), [])
  const ptr = usePullToRefresh(scrollRef, onRefresh, {
    enabled: !searchActive,
  })
  const [tab, setTab] = useState('All')
  const [sort, setSort] = useState('recent')
  const [visitType, setVisitType] = useState('All types')
  const [sheet, setSheet] = useState(null)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const { show: showDemoPreview } = useDemoPreview()

  const careHistory = useCareHistory(now)

  const openSearch = useCallback(() => {
    setSearchActive(true)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchActive(false)
  }, [])

  useEffect(() => {
    if (location.state?.focus !== 'bookings') return undefined
    const id = window.setTimeout(() => {
      const scroller = historySectionRef.current?.closest('.treat-scroll')
      if (scroller && historySectionRef.current) {
        scroller.scrollTo({
          top: Math.max(0, historySectionRef.current.offsetTop - 8),
          behavior: 'smooth',
        })
      }
    }, 80)
    return () => window.clearTimeout(id)
  }, [location.state?.focus])

  const openSheet = (next) => {
    setSheet(next)
    show()
  }

  const closeSheet = () => {
    hide(() => setSheet(null))
  }

  const filteredHistory = useMemo(() => {
    const rows = careHistory
      .filter((visit) => (tab === 'All' ? true : visit.historyTab === tab))
      .filter((visit) => matchesVisitType(visit, visitType))
      .slice()

    rows.sort((a, b) => {
      if (sort === 'name') {
        return String(a.displayName || a.doctor?.name || '').localeCompare(
          String(b.displayName || b.doctor?.name || ''),
        )
      }
      const ta = a.start instanceof Date ? a.start.getTime() : 0
      const tb = b.start instanceof Date ? b.start.getTime() : 0
      return sort === 'oldest' ? ta - tb : tb - ta
    })
    return rows
  }, [careHistory, tab, sort, visitType])

  const openEngineBooking = (recordOrLegacy) => {
    const isRecord = Boolean(recordOrLegacy?.schedule) && !recordOrLegacy?.engineId
    const booking = isRecord ? toLegacyBooking(recordOrLegacy) : recordOrLegacy
    if (isPreviewServiceType(resolveServiceType(booking))) {
      showDemoPreview()
      return
    }
    const bookingId = isRecord
      ? recordOrLegacy.id
      : (booking.engineId || booking.id)
    adoptBooking(booking)
    focusBooking?.(bookingId)
    const path = getResumePath?.(bookingId) || resolveAppointmentPath(booking) || '/treat'
    navigate(path, { state: { bookingId, origin: 'treat' } })
  }

  const openHistoryItem = (visit) => {
    if (isPreviewServiceType(resolveServiceType(visit))) {
      showDemoPreview()
      return
    }
    if (visit.historyTab === 'Cancelled') {
      openSheet({ type: 'cancelled', visit })
      return
    }
    if (visit.historyTab === 'Completed') {
      navigate('/post-visit-summary', {
        state: {
          bookingId: visit.engineId || visit.id,
          visitData: visitSummary({
            doctor: visit.doctor || {},
            start: visit.start instanceof Date && !Number.isNaN(visit.start.getTime())
              ? visit.start
              : new Date(),
            visitType: visit.visitType || 'In-Person',
            condition: visit.condition,
            dateLabel: visit.dateLabel,
            timeLabel: visit.time,
            nextLabel: 'Follow-up as advised',
            status: 'Completed',
          }),
          origin: 'treat',
        },
      })
      return
    }
    openEngineBooking(visit)
  }

  const openSearchItem = (item) => {
    closeSearch()
    if (item.type === 'appointment' || item.type === 'care-history') {
      if (item.visit) openHistoryItem(item.visit)
      return
    }
    if (item.type === 'doctor') {
      navigate(`/doctor/${item.id}`, {
        state: { origin: 'treat', returnTo: '/treat' },
      })
      return
    }
    if (item.record && item.kind) {
      setRecordSheet({ mode: 'view', kind: item.kind, item: item.record })
    }
  }

  const listTitle = tab === 'All' ? 'All bookings' : `${tab} bookings`
  const sheetTitle = {
    sort: 'Sort care history',
    filter: 'Filter care',
    cancelled: 'Cancelled visit',
  }[sheet?.type] || ''

  return (
    <div className={`treat-page ${searchActive ? 'is-search' : ''}`}>
      <header
        className="treat-header"
        aria-hidden={searchActive}
        {...(searchActive ? { inert: true } : {})}
      >
        <div className="treat-header-left">
          <h1 className="treat-title">Treat</h1>
          <p className="treat-subtitle">Manage your ongoing care</p>
        </div>
        <div className="treat-header-actions">
          <button
            type="button"
            className="treat-header-btn"
            aria-label="Search care"
            onClick={openSearch}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button type="button" className="treat-header-btn" aria-label="Filter care" onClick={() => openSheet({ type: 'filter' })}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        </div>
      </header>

      {searchActive ? (
        <SearchBar
          active
          mode="expandable"
          scope="treat"
          query={query}
          onQueryChange={setQuery}
          onCancel={closeSearch}
          idlePlaceholder={TREAT_SEARCH_PLACEHOLDER}
          activePlaceholder={TREAT_SEARCH_PLACEHOLDER}
        />
      ) : null}

      <div className="treat-body">
        <div
          className="treat-scroll"
          ref={scrollRef}
          aria-hidden={searchActive}
          {...(searchActive ? { inert: true } : {})}
        >
          <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
          <section className="treat-carousel-section" aria-label="Upcoming bookings">
            <UpcomingBookingsCarousel
              origin="treat"
              emptyFallback={false}
              className="treat-upcoming-carousel"
              hideHeader
              onSeeMore={() => {
                historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            />
          </section>

          <section
            className="treat-history-panel"
            ref={historySectionRef}
            id="treat-bookings"
            aria-label="Care history"
          >
            <div className="treat-history-header">
              <h2 className="treat-history-title">Care History</h2>
              <button type="button" className="treat-sort-btn" onClick={() => openSheet({ type: 'sort' })}>
                {sortOptions.find((option) => option.id === sort)?.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            <div className="treat-history-filters" role="tablist" aria-label="Care history filters">
              {historyTabs.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={tab === item}
                  className={`treat-history-filter ${tab === item ? 'is-active' : ''}`}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="treat-history-summary">
              <h3 className="treat-history-summary-title">{listTitle}</h3>
              <p className="treat-history-summary-hint">Synced from your booking history</p>
            </div>

            <div className="treat-history-list">
              {!hydrated ? (
                <>
                  <div className="treat-skel-row shimmer" />
                  <div className="treat-skel-row shimmer" />
                  <div className="treat-skel-row shimmer" />
                </>
              ) : filteredHistory.length === 0 ? (
                <p className="treat-empty">No matching care records.</p>
              ) : filteredHistory.map((visit) => {
                const service = getServiceMeta(resolveServiceType(visit))
                const photo = visit.doctor?.photo
                const initial = (visit.displayName || visit.doctor?.name || service.shortLabel || 'A')
                  .replace(/^Dr\.?\s*/i, '')
                  .charAt(0)
                return (
                  <button
                    type="button"
                    key={visit.engineId || visit.id}
                    className={`treat-history-card is-${String(visit.historyTab || 'upcoming').toLowerCase()}`}
                    onClick={() => openHistoryItem(visit)}
                  >
                    <div className="treat-history-card-top">
                      {photo ? (
                        <img className="treat-history-photo" src={photo} alt="" />
                      ) : (
                        <div className="treat-history-photo is-icon" aria-hidden="true">
                          {initial}
                        </div>
                      )}
                      <div className="treat-history-doctor-info">
                        <div className="treat-history-doctor-name">
                          {visit.displayName
                            || (visit.doctor?.name
                              ? `Dr. ${String(visit.doctor.name).replace(/^Dr\.?\s*/i, '')}`
                              : service.label)}
                        </div>
                      </div>
                      <span className={`treat-history-badge is-${String(visit.historyTab || '').toLowerCase()}`}>
                        {visit.historyTab}
                      </span>
                    </div>
                    <div className="treat-history-condition">{visit.condition || service.label}</div>
                    <div className="treat-history-bottom">
                      <span className="treat-history-date">{visit.dateLabel}</span>
                      <span className="treat-history-next">{visit.categoryLabel || service.shortLabel}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
          <AppFooter page="treat" />
        </div>

        <TreatSearchSuggestions
          query={query}
          active={searchActive}
          visits={careHistory}
          health={health}
          onSelect={openSearchItem}
        />
      </div>

      {isPresented && sheet && (
        <AppBottomSheet open closing={isClosing} onClose={closeSheet} labelledBy="treat-sheet-title">
          <div className="ds-sheet-header">
            <h3 id="treat-sheet-title">{sheetTitle}</h3>
            <button type="button" className="ds-sheet-close" onClick={closeSheet} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {sheet.type === 'sort' && (
            <div className="treat-sheet-options">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`ds-sheet-option ${sort === option.id ? 'is-active' : ''}`}
                  onClick={() => { setSort(option.id); closeSheet() }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {sheet.type === 'filter' && (
            <div className="treat-sheet-options">
              <p className="treat-sheet-label">Visit type</p>
              {visitFilters.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`ds-sheet-option ${visitType === option ? 'is-active' : ''}`}
                  onClick={() => { setVisitType(option); closeSheet() }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {sheet.type === 'cancelled' && (
            <div className="treat-sheet-body">
              <p className="treat-sheet-note">
                This visit with {sheet.visit.displayName || sheet.visit.doctor?.name} was cancelled
                {sheet.visit.dateLabel ? ` (${sheet.visit.dateLabel})` : ''}. It stays in your archive for reference.
              </p>
              <button
                type="button"
                className="treat-sheet-cta"
                onClick={() => {
                  closeSheet()
                  navigate('/booking', { state: { origin: 'treat', returnTo: '/treat', entryReturnTo: '/treat' } })
                }}
              >
                Book again
              </button>
            </div>
          )}
        </AppBottomSheet>
      )}

      <ProfileSheets sheet={recordSheet} setSheet={setRecordSheet} />
    </div>
  )
}
