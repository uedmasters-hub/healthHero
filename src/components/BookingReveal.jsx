import { useEffect, useState } from 'react'
import { useFetchSession } from './FetchSession'
import './BookingFlow.css'

export function useBookingReveal(dataset, enabled = true) {
  const session = useFetchSession()
  const [ready, setReady] = useState(() => enabled && session.isLoaded(dataset))

  useEffect(() => {
    if (!enabled) {
      setReady(false)
      return undefined
    }
    if (session.isLoaded(dataset)) {
      setReady(true)
      return undefined
    }

    setReady(false)
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => {
      session.markLoaded(dataset)
      setReady(true)
    }, reduce ? 0 : 320)

    return () => window.clearTimeout(timer)
  }, [dataset, session, enabled])

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
