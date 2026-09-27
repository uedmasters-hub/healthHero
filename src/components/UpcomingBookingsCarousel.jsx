import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import {
  getAppointmentActions,
  getAppointmentJourney,
  MENU_ACTION,
  VISIT_PHASE,
} from '../lib/appointmentJourney'
import { BOOKING_STATUS } from '../booking/constants'
import { buildAppointmentPreview } from '../lib/appointmentPreview'
import {
  HOME_CAROUSEL_LIMIT,
  presentBookingCard,
  useHomeCarousel,
} from '../booking'
import { BRAND_STORAGE } from '../lib/brand'
import { nearestSnapIndex, slideMetrics, snapScrollLeft } from '../lib/carouselFocus'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import { useSharedHero } from './SharedHero'
import { useDemoPreview } from './DemoPreviewModal'
import { isPreviewServiceType } from '../lib/previewModules'
import ProviderAvatar from './ProviderAvatar'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import AppointmentMenuOptions from './AppointmentMenuOptions'
import './BookAppointment.css'

function bookingKey(booking) {
  return String(booking?.engineId || booking?.id || '')
}

function readCarouselView(origin) {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${BRAND_STORAGE.homeCarouselView}:${origin}`)
    return raw ? String(raw) : null
  } catch {
    return null
  }
}

function writeCarouselView(origin, id) {
  if (typeof sessionStorage === 'undefined' || !id) return
  try {
    sessionStorage.setItem(`${BRAND_STORAGE.homeCarouselView}:${origin}`, String(id))
  } catch {
    /* ignore quota */
  }
}

function trackInset(scroller) {
  const row = scroller?.querySelector(':scope > .upcoming-track')
  if (!row) return 0
  const value = Number.parseFloat(getComputedStyle(row).paddingLeft)
  return Number.isFinite(value) ? value : 0
}

function indexForSavedView(list, savedId) {
  if (!savedId || !list?.length) return 0
  const idx = list.findIndex((b) => bookingKey(b) === savedId)
  return idx >= 0 ? idx : 0
}

function ServiceIcon({ type }) {
  if (type === 'pharmacy') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 3h6v4H9z" />
        <path d="M10 7h4v14h-4z" />
        <path d="M7 11h10" />
      </svg>
    )
  }
  if (type === 'lab') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M9 3h6" />
        <path d="M10 3v7l-5 9h14l-5-9V3" />
      </svg>
    )
  }
  if (type === 'nurse') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M12 11v4M10 13h4" />
      </svg>
    )
  }
  if (type === 'video') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function UpcomingBookingCard({
  booking,
  active,
  onActivate,
  sharedSourceRef,
  revealProps,
  origin = 'home',
  phaseOverride = null,
}) {
  const navigate = useNavigate()
  const shared = useSharedHero()
  const { show: showDemoPreview } = useDemoPreview()
  const {
    adoptBooking,
    getResumePath,
    confirmVisitCompleted,
    confirmVisitYes,
    keepVisitActive,
    snoozeVisitConfirmation,
    setVisitException,
  } = useBooking()
  const moreSheet = useAppSheet()
  const [yesBusy, setYesBusy] = useState(false)

  const presented = presentBookingCard(booking)
  const {
    doctor,
    serviceType,
    serviceMeta,
    title,
    subtitle,
    photo,
    showRating,
    rating,
  } = presented

  const journey = getAppointmentJourney(booking)
  const relay = journey.relay || null
  const phase = phaseOverride || journey.phase
  const badge = relay?.label || journey.badge || serviceMeta.shortLabel
  const badgeTone = relay?.accent || journey.badgeTone || journey.status || 'booked'
  const bookingId = booking.engineId || booking.id

  const openBooking = () => {
    if (isPreviewServiceType(serviceType)) {
      showDemoPreview()
      return
    }

    adoptBooking?.(booking)
    const path = getResumePath?.(bookingId) || journey.path || '/treat'
    const go = () => navigate(path, {
      state: {
        bookingId,
        origin,
        visitData: phase === VISIT_PHASE.POST_VISIT ? undefined : undefined,
      },
    })

    if (phase === VISIT_PHASE.POST_VISIT) {
      navigate('/post-visit-summary', { state: { bookingId, origin } })
      return
    }

    if (journey.stage === 'payment_pending') {
      go()
      return
    }

    const sourceEl = sharedSourceRef?.current
    if (shared?.startOpen && sourceEl && doctor?.id) {
      shared.startOpen({
        doctor,
        sourceEl,
        runNavigate: go,
        targetLayout: journey.targetLayout,
        sourceLayout: journey.sourceLayout,
        appointmentPreview: buildAppointmentPreview(booking),
        restore: { home: origin === 'home' },
      })
      return
    }
    go()
  }

  const onYes = async (e) => {
    e.stopPropagation()
    if (yesBusy) return
    setYesBusy(true)
    try {
      const result = confirmVisitYes
        ? await confirmVisitYes(bookingId)
        : { waitingForProvider: true, booking: confirmVisitCompleted?.(bookingId) }
      if (!result) return
      if (result.waitingForProvider) {
        // Home hero flips to Waiting for Provider Confirmation via phase.
        return
      }
      const nav = result.navigation
      if (nav?.pathname) {
        navigate(nav.pathname, { state: nav.state })
        return
      }
      navigate('/post-visit-summary', {
        state: {
          bookingId,
          origin,
          careFocus: result.careFocus || 'post_visit_summary',
        },
      })
    } finally {
      setYesBusy(false)
    }
  }

  const onNotYet = (e) => {
    e.stopPropagation()
    // Persist visit_active + 30-minute reminder (Supabase SSOT via engine RPC).
    ;(keepVisitActive || snoozeVisitConfirmation)?.(bookingId)
  }

  const onCompleteVisit = async (e) => {
    e.stopPropagation()
    await onYes(e)
  }

  const openMore = (e) => {
    e.stopPropagation()
    moreSheet.show()
  }

  const closeMore = () => {
    moreSheet.hide()
  }

  const visitActions = getAppointmentActions(booking, new Date(), { surface: 'active_visit' })

  const onMoreAction = (item) => {
    closeMore()
    const action = item?.action || item?.id
    if (action === MENU_ACTION.COMPLETE_VISIT) {
      onCompleteVisit({ stopPropagation() {} })
      return
    }
    if (action === MENU_ACTION.TESTS_IN_PROGRESS) {
      setVisitException?.(bookingId, BOOKING_STATUS.TESTS_IN_PROGRESS, {
        reason: 'Tests in progress',
      })
      return
    }
    if (action === MENU_ACTION.PAUSE_VISIT) {
      setVisitException?.(bookingId, BOOKING_STATUS.PAUSED, {
        reason: 'Visit paused',
      })
      return
    }
    if (action === MENU_ACTION.RESUME_VISIT) {
      keepVisitActive?.(bookingId)
      return
    }
    if (action === MENU_ACTION.REQUEST_RESCHEDULE) {
      adoptBooking?.(booking)
      navigate('/cancel-appointment', {
        state: { bookingId, origin, branch: 'reschedule' },
      })
      return
    }
    if (action === MENU_ACTION.CONTACT) {
      adoptBooking?.(booking)
      navigate('/appointment', { state: { bookingId, origin, focus: 'contact' } })
      return
    }
    if (action === MENU_ACTION.CANCEL_APPOINTMENT) {
      adoptBooking?.(booking)
      navigate('/cancel-appointment', {
        state: { bookingId, origin, branch: 'cancel' },
      })
    }
  }

  const onReportVisit = (e) => {
    e.stopPropagation()
    adoptBooking?.(booking)
    navigate('/post-visit-report', { state: { bookingId, origin } })
  }

  const onRelayAction = (action, e) => {
    e.stopPropagation()
    if (!action || action.disabled) return
    if (action.id === 'yes') {
      onYes(e)
      return
    }
    if (action.id === 'not_yet') {
      onNotYet(e)
      return
    }
    if (action.id === 'more') {
      openMore(e)
      return
    }
    if (action.id === 'report') {
      onReportVisit(e)
      return
    }
    if (action.id === 'contact') {
      adoptBooking?.(booking)
      navigate('/appointment', { state: { bookingId, origin, focus: 'contact' } })
      return
    }
    if (action.id === 'details' || action.id === 'care') {
      adoptBooking?.(booking)
      navigate('/post-visit-summary', {
        state: { bookingId, origin, careFocus: action.careFocus || null },
      })
      return
    }
    if (action.id === 'reschedule') {
      adoptBooking?.(booking)
      navigate('/cancel-appointment', {
        state: { bookingId, origin, branch: 'reschedule' },
      })
      return
    }
    if (action.id === 'book') {
      navigate('/treat', { state: { origin } })
      return
    }
    openBooking()
  }

  const context = relay?.context || 'Upcoming'
  const chip = relay?.status || relay?.label || badge
  const relayActions = (relay?.actions || []).filter((item) => !item.disabled).slice(0, 2)
  const footerActions = relayActions.length > 0
    ? relayActions
    : [{ id: 'details', label: 'View details', tone: 'primary', ariaLabel: 'View details in Care Hub' }]
  const isCheckin = relay?.state === 'check_in' || phase === VISIT_PHASE.VISIT_CHECKIN
  const isActiveVisit = relay?.state === 'visit' || phase === VISIT_PHASE.ACTIVE_VISIT
  const isWaitingProvider = relay?.state === 'waiting_provider' || relay?.state === 'report_submitted' || phase === VISIT_PHASE.WAITING_PROVIDER
  const isPostVisit = phase === VISIT_PHASE.POST_VISIT || relay?.homeBand === 1
  const isCareHistory = phase === VISIT_PHASE.CARE_HISTORY
  const isCompletedJourney = Boolean(relay ? relay.homeBand === 1 : (isPostVisit || isCareHistory))

  return (
    <RevealItem
      className={[
        'upcoming-card',
        `is-${journey.status || 'booked'}`,
        active ? 'is-active' : 'is-adjacent',
        relay?.accent ? `is-relay-${relay.accent}` : '',
        isCheckin ? 'is-visit-checkin' : '',
        isActiveVisit ? 'is-active-visit' : '',
        isWaitingProvider ? 'is-waiting-provider' : '',
        isPostVisit ? 'is-post-visit' : '',
        isCompletedJourney ? 'is-completed-journey' : '',
      ].filter(Boolean).join(' ')}
      revealed={revealProps.revealed}
      cached={revealProps.cached}
      ref={(node) => {
        revealProps.setRef?.(node)
        if (sharedSourceRef) sharedSourceRef.current = node
      }}
      onClick={openBooking}
      onFocus={onActivate}
      role="group"
      aria-label={`${context}. ${chip}: ${title}${subtitle ? `, ${subtitle}` : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openBooking()
        }
      }}
    >
      <div className="upcoming-card-inner">
        <div className="upcoming-card-header">
          <span className="upcoming-context">{context}</span>
          <span className={`upcoming-badge upcoming-status is-${badgeTone}`}>{chip}</span>
        </div>

        <div className="upcoming-top">
          <ProviderAvatar
            className="upcoming-avatar"
            imgClassName="upcoming-avatar-img"
            doctor={doctor}
            src={photo}
            placeholder={(
              <span className="upcoming-avatar-icon">
                <ServiceIcon type={booking.providerIcon || serviceMeta.icon} />
              </span>
            )}
          />
          <div className="upcoming-info">
            <div className="upcoming-name-row">
              <span className="upcoming-doctor-name">{title}</span>
              {showRating ? (
                <span className="upcoming-rating">
                  <span className="upcoming-rating-star" aria-hidden="true">★</span>
                  {rating}
                </span>
              ) : null}
            </div>
            {subtitle ? <p className="upcoming-meta">{subtitle}</p> : null}
          </div>
        </div>

        <div className="upcoming-checkin-actions" role="group" aria-label={`${chip} actions`}>
            {footerActions.map((action) => {
              const busy = action.id === 'yes' && yesBusy
              const secondary = action.tone === 'secondary'
              return (
                <button
                  key={action.id}
                  type="button"
                  className={secondary ? 'upcoming-checkin-not-yet' : 'upcoming-checkin-yes'}
                  onClick={(e) => onRelayAction(action, e)}
                  disabled={busy}
                  aria-busy={busy || undefined}
                  aria-label={action.ariaLabel || action.label}
                  aria-haspopup={action.id === 'more' ? 'dialog' : undefined}
                  aria-expanded={action.id === 'more' ? moreSheet.isPresented : undefined}
                >
                  {busy ? 'Checking…' : action.label}
                </button>
              )
            })}
          </div>
      </div>

      <AppBottomSheet
        open={moreSheet.isPresented}
        closing={moreSheet.isClosing}
        onClose={closeMore}
        labelledBy="visit-more-title"
      >
        <div className="ds-sheet-header">
          <h3 id="visit-more-title">Visit options</h3>
          <button type="button" className="ds-sheet-close" onClick={closeMore} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <AppointmentMenuOptions
          items={visitActions.menuItems}
          onAction={onMoreAction}
        />
      </AppBottomSheet>
    </RevealItem>
  )
}

/**
 * Shared appointment journey carousel — single store via useHomeCarousel.
 * Snap track ordered by journey priority: nearest upcoming, later upcoming,
 * Post Visit, then remaining completed journeys.
 */
export default function UpcomingBookingsCarousel({
  onSeeMore,
  seeMoreLabel = 'See all >',
  origin = 'home',
  emptyFallback = true,
  className = '',
  excludeBookingId = null,
  hideHeader = false,
  hideSeeMore = false,
}) {
  const navigate = useNavigate()
  const { hydrated } = useBooking()
  const allCarousel = useHomeCarousel(HOME_CAROUSEL_LIMIT)

  const carousel = useMemo(() => {
    if (!excludeBookingId) return allCarousel
    return allCarousel.filter((b) => bookingKey(b) !== excludeBookingId)
  }, [allCarousel, excludeBookingId])

  const carouselIds = useMemo(
    () => carousel.map((b) => bookingKey(b)).filter(Boolean).join('|'),
    [carousel],
  )

  const trackRef = useRef(null)
  const slideNodes = useRef([])
  const sharedSourceRefs = useRef([])
  const pointerDownRef = useRef(false)
  const activeIndexRef = useRef(indexForSavedView(carousel, readCarouselView(origin)))
  const kickScrollSyncRef = useRef(() => {})
  const [activeIndex, setActiveIndex] = useState(activeIndexRef.current)
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({
    namespace: `upcoming-carousel:${origin}:${carousel?.length || 0}`,
  })

  const publishActiveFromScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || !carousel.length) return
    const slides = slideNodes.current.map((node) => slideMetrics(node))
    const next = nearestSnapIndex(slides, track.scrollLeft + trackInset(track))
    if (next === activeIndexRef.current) return
    activeIndexRef.current = next
    setActiveIndex(next)
  }, [carousel.length])

  useEffect(() => {
    const track = trackRef.current
    if (!hydrated || !track) return undefined
    let frame = 0
    let stopped = false
    let idleTimer = 0
    const scrollingRef = { current: false }

    const step = () => {
      frame = 0
      if (stopped) return
      publishActiveFromScroll()
      if (pointerDownRef.current || scrollingRef.current) {
        frame = window.requestAnimationFrame(step)
      }
    }

    const arm = () => {
      scrollingRef.current = true
      if (!frame) frame = window.requestAnimationFrame(step)
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => {
        scrollingRef.current = false
        publishActiveFromScroll()
      }, 120)
    }

    kickScrollSyncRef.current = arm

    const onDown = () => {
      pointerDownRef.current = true
      if (!frame) frame = window.requestAnimationFrame(step)
    }
    const onUp = () => {
      pointerDownRef.current = false
      publishActiveFromScroll()
    }

    publishActiveFromScroll()
    track.addEventListener('scroll', arm, { passive: true })
    track.addEventListener('scrollend', publishActiveFromScroll)
    track.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      stopped = true
      kickScrollSyncRef.current = () => {}
      window.clearTimeout(idleTimer)
      if (frame) window.cancelAnimationFrame(frame)
      track.removeEventListener('scroll', arm)
      track.removeEventListener('scrollend', publishActiveFromScroll)
      track.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [publishActiveFromScroll, carousel.length, hydrated])

  // Park the saved card on the page inset. Scroll position then owns the active index.
  useLayoutEffect(() => {
    if (!hydrated || !carousel.length) {
      if (!carousel.length) {
        activeIndexRef.current = 0
        setActiveIndex(0)
      }
      return
    }
    const nextIndex = indexForSavedView(carousel, readCarouselView(origin))
    const track = trackRef.current
    const node = slideNodes.current[nextIndex]
    if (track && node) {
      track.scrollLeft = snapScrollLeft(node.offsetLeft, trackInset(track))
    }
    if (activeIndexRef.current !== nextIndex) {
      activeIndexRef.current = nextIndex
      setActiveIndex(nextIndex)
    }
    // Intentionally keyed on carouselIds so swipe position isn't reset on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carousel list identity via carouselIds
  }, [carouselIds, origin, hydrated])

  useEffect(() => {
    const id = bookingKey(carousel[activeIndex])
    if (id) writeCarouselView(origin, id)
  }, [activeIndex, carousel, origin])

  const scrollToIndex = (index) => {
    const node = slideNodes.current[index]
    const track = trackRef.current
    if (!node || !track) return
    const left = snapScrollLeft(node.offsetLeft, trackInset(track))
    track.scrollTo({ left, behavior: 'smooth' })
    kickScrollSyncRef.current()
  }

  const handleSeeMore = () => {
    if (typeof onSeeMore === 'function') {
      onSeeMore()
      return
    }
    navigate('/treat', { state: { focus: 'bookings', origin: 'home-carousel' } })
  }

  const activeBooking = carousel[activeIndex] || carousel[0] || null
  const sectionLabel = activeBooking
    ? (getAppointmentJourney(activeBooking).sectionLabel || 'Upcoming Bookings')
    : 'Upcoming Bookings'

  if (!hydrated) {
    return (
      <div className={`book-appointment ${className}`.trim()}>
        {!hideHeader ? (
          <div className="upcoming-header">
            <h3 className="upcoming-label">Upcoming Bookings</h3>
          </div>
        ) : null}
        <div className="upcoming-carousel-skel" aria-hidden="true">
          <div className="upcoming-skel-card shimmer" />
        </div>
      </div>
    )
  }

  if (!carousel.length) {
    if (!emptyFallback) {
      return (
        <div className={`book-appointment ${className}`.trim()}>
          {!hideHeader ? (
            <div className="upcoming-header">
              <h3 className="upcoming-label">Upcoming Bookings</h3>
            </div>
          ) : null}
          <p className="upcoming-empty" role="status">No upcoming bookings yet.</p>
        </div>
      )
    }
    return (
      <div className={`book-appointment ${className}`.trim()}>
        <RevealItem className="book-appointment-card" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
          <div className="book-appointment-content">
            <h2 className="book-appointment-title">Book Appointment</h2>
            <p className="book-appointment-subtitle">Consult with trusted doctors anytime.</p>
            <button
              type="button"
              className="book-now-btn"
              onClick={() => navigate('/booking', {
                state: {
                  origin,
                  returnTo: origin === 'treat' ? '/treat' : '/',
                  entryReturnTo: origin === 'treat' ? '/treat' : '/',
                },
              })}
            >
              <svg className="book-now-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                <path d="M8 3.5v3.2M16 3.5v3.2M3.5 10h17" />
              </svg>
              Book Now
            </button>
          </div>
        </RevealItem>
      </div>
    )
  }

  return (
    <div className={`book-appointment has-carousel ${className}`.trim()}>
      {!hideHeader ? (
        <div className="upcoming-header">
          <h3 className="upcoming-label" id={`journey-carousel-label-${origin}`}>{sectionLabel}</h3>
          {!hideSeeMore ? (
            <button type="button" className="upcoming-see-more" onClick={handleSeeMore}>
              {seeMoreLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={`upcoming-carousel${carousel.length === 1 ? ' is-single' : ''}`}
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-labelledby={hideHeader ? undefined : `journey-carousel-label-${origin}`}
        aria-label={hideHeader ? sectionLabel : undefined}
      >
        <div className="upcoming-track">
          {carousel.map((booking, index) => {
            const id = bookingKey(booking)
            if (!sharedSourceRefs.current[index]) {
              sharedSourceRefs.current[index] = { current: null }
            }
            const isActive = activeIndex === index
            return (
              <div
                key={id}
                className="upcoming-slide"
                ref={(node) => {
                  slideNodes.current[index] = node
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${carousel.length}`}
              >
                <UpcomingBookingCard
                  booking={booking}
                  active={isActive}
                  onActivate={() => scrollToIndex(index)}
                  origin={origin}
                  sharedSourceRef={sharedSourceRefs.current[index]}
                  revealProps={{
                    revealed: isRevealed(index),
                    cached: isCached,
                    setRef: setItemRef(index),
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {carousel.length > 1 ? (
        <div className="upcoming-dots" role="tablist" aria-label="Appointment journey pages">
          {carousel.map((booking, index) => {
            const label = getAppointmentJourney(booking).sectionLabel || `Booking ${index + 1}`
            return (
              <button
                key={bookingKey(booking)}
                type="button"
                role="tab"
                aria-label={label}
                aria-selected={activeIndex === index}
                tabIndex={activeIndex === index ? 0 : -1}
                className={`upcoming-dot ${activeIndex === index ? 'is-active' : ''}`}
                onClick={() => scrollToIndex(index)}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
