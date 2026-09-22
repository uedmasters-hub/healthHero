import { useEffect, useState } from 'react'
import { useFetchSession } from './FetchSession'
import './BookingFlow.css'

const STAGED_MS = 90
const SKELETON_MS = 320

/**
 * Reveal gate for booking / detail screens.
 *
 * Staged strategy:
 * - `instant` or already-loaded dataset → paint immediately (cached / nav data).
 * - Otherwise show skeleton only briefly; after STAGED_MS reveal if `hasCache`
 *   so the user is never trapped waiting for data that already exists locally.
 * - Full skeleton delay (SKELETON_MS) only when there is no local cache yet.
 */
export function useBookingReveal(dataset, enabled = true, { instant = false, hasCache = false } = {}) {
  const session = useFetchSession()
  const [ready, setReady] = useState(() => enabled && (instant || hasCache || session.isLoaded(dataset)))

  useEffect(() => {
    if (!enabled) {
      setReady(false)
      return undefined
    }
    if (instant || hasCache || session.isLoaded(dataset)) {
      session.markLoaded(dataset)
      setReady(true)
      return undefined
    }

    setReady(false)
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = reduce ? 0 : (hasCache ? STAGED_MS : SKELETON_MS)
    const timer = window.setTimeout(() => {
      session.markLoaded(dataset)
      setReady(true)
    }, delay)

    return () => window.clearTimeout(timer)
  }, [dataset, session, enabled, instant, hasCache])

  return ready
}

export function BookingReveal({ ready, skeleton, children }) {
  return (
    <div className="booking-stack">
      <div className={`booking-skel-layer ${ready ? 'is-gone' : ''}`} aria-hidden={ready}>
        {skeleton}
      </div>
      <div className={`booking-body ${ready ? 'is-ready' : ''}`} {...(!ready ? { inert: true } : {})}>
        {children}
      </div>
    </div>
  )
}

export function DoctorHeroSkeleton() {
  return (
    <div className="dc-card dc-card-profile booking-hero-skel" aria-hidden="true">
      <div className="dc-profile-photo shimmer" />
      <div className="dc-profile-copy">
        <div className="booking-skel-line is-name shimmer" />
        <div className="booking-skel-line is-meta shimmer" />
        <div className="booking-skel-chip shimmer" />
        <div className="booking-skel-line is-meta shimmer" />
      </div>
    </div>
  )
}
