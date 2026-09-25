import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBooking } from './BookingContext'
import useNow from '../hooks/useNow'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import PageSearchHeader from './PageSearchHeader'
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
const TREAT_SEARCH_PLACEHOLDER = 'Search your care, visits, and records…'

export default function TreatPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const now = useNow()
  const { health } = useUser()
  const { adoptBooking, getResumePath, focusBooking, hydrated } = useBooking()
  const historySectionRef = useRef(null)
  const scrollRef = useRef(null)
  const searchBarRef = useRef(null)
  const [query, setQuery] = useSearchQuery('treat')
  const [recordSheet, setRecordSheet] = useState(null)
  const searchActive = Boolean(query.trim())
  const onRefresh = useCallback(() => refreshTreatData(), [])
  const ptr = usePullToRefresh(scrollRef, onRefresh, {
    enabled: !searchActive,
  })
  const [tab, setTab] = useState('All')
  const [sort, setSort] = useState('recent')
  const [sheet, setSheet] = useState(null)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const { show: showDemoPreview } = useDemoPreview()

  const careHistory = useCareHistory(now)

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
  }, [careHistory, tab, sort])

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
    setQuery('')
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
    cancelled: 'Cancelled visit',
  }[sheet?.type] || ''

  return (
    <div className={`treat-page${searchActive ? ' is-search' : ''}`}>
      <PageSearchHeader
        title="Treat"
        scrollRef={scrollRef}
        searchBarRef={searchBarRef}
        scope="treat"
        placeholder={TREAT_SEARCH_PLACEHOLDER}
        query={query}
        onQueryChange={setQuery}
        locked={searchActive}
        dockClassName="treat-search-dock"
      />

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
