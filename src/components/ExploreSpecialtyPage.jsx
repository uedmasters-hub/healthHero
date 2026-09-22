import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { canonicalSpecialty, loadExploreListState } from '../data/specialisations'
import { goBackToOrigin } from '../lib/careFlow'
import { PUSH_MOTION } from '../features/pushNav/config'
import { hydrateProviders } from '../features/providers'
import { useTransition } from './PageTransition'
import { usePushBack } from '../features/pushNav'
import DoctorList from './DoctorList'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import './BookingFlow.css'

export default function ExploreSpecialtyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { openSpecialisations, openTopDoctors } = useTransition()
  const { specialty: raw } = useParams()
  const specialty = canonicalSpecialty(decodeURIComponent(raw || ''))
  const scrollRootRef = useRef(null)
  const saved = loadExploreListState(specialty)
  const goBack = usePushBack(() => {
    goBackToOrigin(navigate, location, { openSpecialisations, openTopDoctors })
  })
  // Only refresh the doctor registry — never trigger a full home data refresh
  // while Home is sitting under the push underlay.
  const onRefresh = useCallback(() => hydrateProviders({ force: true }), [])
  const ptr = usePullToRefresh(scrollRootRef, onRefresh)

  // Defer scroll restore until after the push settles — avoids fighting the slide.
  useEffect(() => {
    const el = scrollRootRef.current
    const y = saved?.scrollY
    if (!el || typeof y !== 'number' || y <= 0) return undefined
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = reduce ? 0 : PUSH_MOTION.DURATION_MS
    const timer = window.setTimeout(() => {
      if (scrollRootRef.current) scrollRootRef.current.scrollTop = y
    }, delay)
    return () => window.clearTimeout(timer)
  }, [specialty, saved?.scrollY])

  return (
    <div className="booking-layout explore-layout" ref={scrollRootRef}>
      <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
      <div className="booking-header">
        <button className="back-btn" data-push-back onClick={goBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="booking-header-title">{specialty}</h1>
        <div className="booking-header-spacer" />
      </div>
      <div className="booking-content explore-content">
        <DoctorList
          lockedSpecialty={specialty}
          origin="explore"
          returnTo={`/explore/${encodeURIComponent(specialty)}`}
          persist
          dataset={`explore:${specialty}`}
          scrollRootRef={scrollRootRef}
        />
      </div>
    </div>
  )
}
