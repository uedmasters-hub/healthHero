import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { getAppointmentJourney, VISIT_PHASE } from '../lib/appointmentJourney'
import { buildAppointmentPreview } from '../lib/appointmentPreview'
import {
  HOME_CAROUSEL_LIMIT,
  getServiceCta,
  presentBookingCard,
  useHomeCarousel,
  useHomeSurface,
} from '../booking'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import { useSharedHero } from './SharedHero'
import { useDemoPreview } from './DemoPreviewModal'
import { isPreviewServiceType } from '../lib/previewModules'
import ProviderAvatar from './ProviderAvatar'
import './BookAppointment.css'

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
    snoozeVisitConfirmation,
  } = useBooking()

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
    dateLabel,
    timeLabel,
  } = presented

  const journey = getAppointmentJourney(booking)
  const phase = phaseOverride || journey.phase
  const cta = getServiceCta(booking, journey.cta)
  const badge = journey.badge || serviceMeta.shortLabel
  const badgeTone = journey.badgeTone || journey.status || 'booked'
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

  const onYes = (e) => {
    e.stopPropagation()
    confirmVisitCompleted?.(bookingId)
    navigate('/post-visit-summary', { state: { bookingId, origin } })
  }

  const onNotYet = (e) => {
    e.stopPropagation()
    snoozeVisitConfirmation?.(bookingId)
  }

  const isCheckin = phase === VISIT_PHASE.VISIT_CHECKIN
  const isActiveVisit = phase === VISIT_PHASE.ACTIVE_VISIT
  const isPostVisit = phase === VISIT_PHASE.POST_VISIT

  return (
    <RevealItem
      className={[
        'upcoming-card',
        `is-${journey.status || 'booked'}`,
        active ? 'is-active' : 'is-adjacent',
        isCheckin ? 'is-visit-checkin' : '',
        isActiveVisit ? 'is-active-visit' : '',
        isPostVisit ? 'is-post-visit' : '',
      ].filter(Boolean).join(' ')}
      revealed={revealProps.revealed}
      cached={revealProps.cached}
      ref={(node) => {
        revealProps.setRef?.(node)
        if (sharedSourceRef) sharedSourceRef.current = node
      }}
      onClick={isCheckin ? undefined : openBooking}
      onFocus={onActivate}
      role="group"
      aria-label={`${serviceMeta.label}: ${title}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (isCheckin) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openBooking()
        }
      }}
    >
      <div className="upcoming-card-inner">
        <div className="upcoming-service-row">
          <span className="upcoming-service-type">
            {isCheckin
              ? 'Visit check-in'
              : isActiveVisit
                ? 'Active visit'
                : isPostVisit
                  ? 'Post visit'
                  : serviceMeta.label}
          </span>
          <span className={`upcoming-badge is-${badgeTone}`}>{badge}</span>
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
              {showRating && !isCheckin ? (
                <span className="upcoming-rating">
                  <span className="upcoming-rating-star" aria-hidden="true">★</span>
                  {rating}
                </span>
              ) : null}
            </div>
            {subtitle ? <p className="upcoming-meta">{subtitle}</p> : null}
          </div>
        </div>

        {isCheckin ? (
          <div className="upcoming-checkin-prompt">
            <p className="upcoming-checkin-question">
              {journey.prompt || 'Have you completed your visit?'}
            </p>
            <div className="upcoming-checkin-actions">
              <button type="button" className="upcoming-checkin-yes" onClick={onYes}>
                Yes
              </button>
              <button type="button" className="upcoming-checkin-not-yet" onClick={onNotYet}>
                Not yet
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="upcoming-schedule">
              <div className="upcoming-detail">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{dateLabel || '—'}</span>
              </div>
              <span className="upcoming-divider" aria-hidden="true" />
              <div className="upcoming-detail">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{timeLabel || '—'}</span>
              </div>
            </div>

            <div className="upcoming-cta">
              <span>{cta}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </>
        )}
      </div>
    </RevealItem>
  )
}

/**
 * Shared Upcoming Bookings carousel — single store subscription via useHomeCarousel.
 * Home also surfaces Active Visit / Visit Check-in / Post Visit as a singular hero.
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
  const homeSurface = useHomeSurface()
  const allCarousel = useHomeCarousel(HOME_CAROUSEL_LIMIT)
  const heroPhase = homeSurface?.phase
  const heroBooking = homeSurface?.booking
  const showHero = origin === 'home'
    && heroBooking
    && [VISIT_PHASE.ACTIVE_VISIT, VISIT_PHASE.VISIT_CHECKIN, VISIT_PHASE.POST_VISIT].includes(heroPhase)

  const carousel = useMemo(() => {
    let list = allCarousel
    if (excludeBookingId) {
      list = list.filter((b) => (b.engineId || b.id) !== excludeBookingId)
    }
    if (showHero) {
      const heroId = heroBooking.engineId || heroBooking.id
      list = list.filter((b) => (b.engineId || b.id) !== heroId)
    }
    return list
  }, [allCarousel, excludeBookingId, showHero, heroBooking])

  const trackRef = useRef(null)
  const slideNodes = useRef([])
  const sharedSourceRefs = useRef([])
  const heroSourceRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({
    namespace: `upcoming-carousel:${origin}:${carousel?.length || 0}:${showHero ? heroPhase : 'none'}`,
  })

  const syncActiveFromScroll = useCallback(() => {
    const track = trackRef.current
    if (!track || !carousel.length) return
    const center = track.scrollLeft + track.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    slideNodes.current.forEach((node, index) => {
      if (!node) return
      const mid = node.offsetLeft + node.offsetWidth / 2
      const dist = Math.abs(mid - center)
      if (dist < bestDist) {
        bestDist = dist
        best = index
      }
    })
    setActiveIndex(best)
  }, [carousel.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    syncActiveFromScroll()
    const onScroll = () => syncActiveFromScroll()
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [syncActiveFromScroll, carousel.length])

  useEffect(() => {
    setActiveIndex(0)
    const track = trackRef.current
    if (track) track.scrollTo({ left: 0, behavior: 'smooth' })
  }, [carousel.map((b) => b?.engineId || b?.id).join('|')])

  const scrollToIndex = (index) => {
    const node = slideNodes.current[index]
    const track = trackRef.current
    if (!node || !track) return
    const left = node.offsetLeft - (track.clientWidth - node.offsetWidth) / 2
    track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    setActiveIndex(index)
  }

  const handleSeeMore = () => {
    if (typeof onSeeMore === 'function') {
      onSeeMore()
      return
    }
    navigate('/treat', { state: { focus: 'bookings', origin: 'home-carousel' } })
  }

  const sectionLabel = showHero
    ? (getAppointmentJourney(heroBooking).sectionLabel || 'Upcoming Bookings')
    : 'Upcoming Bookings'

  if (!hydrated) {
    return (
      <div className={`book-appointment ${className}`.trim()}>
        {!hideHeader ? (
          <div className="upcoming-header">
            <h3 className="upcoming-label">Upcoming Bookings</h3>
          </div>
        ) : null}
        <div className="upcoming-carousel-skel">
          <div className="upcoming-skel-card shimmer" />
        </div>
      </div>
    )
  }

  if (!showHero && !allCarousel.length) {
    if (!emptyFallback) {
      return (
        <div className={`book-appointment ${className}`.trim()}>
          {!hideHeader ? (
            <div className="upcoming-header">
              <h3 className="upcoming-label">Upcoming Bookings</h3>
            </div>
          ) : null}
          <p className="upcoming-empty">No upcoming bookings yet.</p>
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
              <svg className="book-now-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <h3 className="upcoming-label">{sectionLabel}</h3>
          {!hideSeeMore && (carousel.length > 0 || showHero) ? (
            <button type="button" className="upcoming-see-more" onClick={handleSeeMore}>
              {seeMoreLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {showHero ? (
        <div className="upcoming-hero-slot">
          <UpcomingBookingCard
            booking={heroBooking}
            active
            phaseOverride={heroPhase}
            origin={origin}
            sharedSourceRef={heroSourceRef}
            revealProps={{
              revealed: isRevealed(0),
              cached: isCached,
              setRef: setItemRef(0),
            }}
          />
        </div>
      ) : null}

      {carousel.length ? (
        <>
          {showHero ? (
            <div className="upcoming-header upcoming-header-secondary">
              <h3 className="upcoming-label">Upcoming Bookings</h3>
            </div>
          ) : null}
          <div
            className={`upcoming-carousel${carousel.length === 1 ? ' is-single' : ''}`}
            ref={trackRef}
          >
            <div className="upcoming-track">
              {carousel.map((booking, index) => {
                const id = booking.engineId || booking.id
                if (!sharedSourceRefs.current[index]) {
                  sharedSourceRefs.current[index] = { current: null }
                }
                return (
                  <div
                    key={id}
                    className="upcoming-slide"
                    ref={(node) => {
                      slideNodes.current[index] = node
                    }}
                  >
                    <UpcomingBookingCard
                      booking={booking}
                      active={activeIndex === index}
                      onActivate={() => setActiveIndex(index)}
                      origin={origin}
                      sharedSourceRef={sharedSourceRefs.current[index]}
                      revealProps={{
                        revealed: isRevealed(showHero ? index + 1 : index),
                        cached: isCached,
                        setRef: setItemRef(showHero ? index + 1 : index),
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
          {carousel.length > 1 ? (
            <div className="upcoming-dots" role="tablist" aria-label="Booking pages">
              {carousel.map((booking, index) => (
                <button
                  key={booking.engineId || booking.id}
                  type="button"
                  role="tab"
                  aria-selected={activeIndex === index}
                  className={`upcoming-dot ${activeIndex === index ? 'is-active' : ''}`}
                  onClick={() => scrollToIndex(index)}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : showHero ? (
        <p className="upcoming-empty">Your next visit will appear here when scheduled.</p>
      ) : null}
    </div>
  )
}
