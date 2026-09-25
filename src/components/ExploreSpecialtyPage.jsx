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
  const onRefresh = useCallback(() => hydrateProviders({ force: true }), [])
  const ptr = usePullToRefresh(scrollRootRef, onRefresh)

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
    <div className="page-push-in" style={{ height: '100%', minHeight: 0 }}>
      <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
      <DoctorList
        lockedSpecialty={specialty}
        origin="explore"
        returnTo={`/explore/${encodeURIComponent(specialty)}`}
        persist
        dataset={`explore:${specialty}`}
        scrollRootRef={scrollRootRef}
        title={specialty}
        onBack={goBack}
        showBack
        className="page-push-in"
      />
    </div>
  )
}
