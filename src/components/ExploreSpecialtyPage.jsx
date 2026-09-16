import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { canonicalSpecialty, loadExploreListState } from '../data/specialisations'
import { goBackToOrigin } from '../lib/careFlow'
import { useTransition } from './PageTransition'
import DoctorList from './DoctorList'
import './BookingFlow.css'

export default function ExploreSpecialtyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { openSpecialisations, openTopDoctors } = useTransition()
  const { specialty: raw } = useParams()
  const specialty = canonicalSpecialty(decodeURIComponent(raw || ''))
  const scrollRootRef = useRef(null)
  const saved = loadExploreListState(specialty)

  useLayoutEffect(() => {
    const el = scrollRootRef.current
    if (el && typeof saved?.scrollY === 'number') {
      el.scrollTop = saved.scrollY
    }
  }, [specialty, saved?.scrollY])

  const goBack = () => {
    goBackToOrigin(navigate, location, { openSpecialisations, openTopDoctors })
  }

  return (
    <div className="booking-layout explore-layout" ref={scrollRootRef}>
      <div className="booking-header">
        <button className="back-btn" onClick={goBack} aria-label="Back">
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
