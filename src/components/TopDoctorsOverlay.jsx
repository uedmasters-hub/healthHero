import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTransition } from './PageTransition'
import { useFetchSession } from './FetchSession'
import { SHEET_TOP_COUNT, promoteTopDoctor, useTopDoctors } from '../lib/topDoctorsOrder'
import DoctorCard from './DoctorCard'
import './TopDoctorsOverlay.css'
import './TopDoctors.css'
import './DoctorCard.css'

const FAST_STAGGER = 60
const INITIAL_DELAY = 350
const OFFSCREEN_DELAY = 550
const LOADING_TOAST_DELAY = 400
const LOADING_TOAST_OUT = 220

const CACHE_KEY = 'overlay:top-doctors'

export default function TopDoctorsOverlay() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isTopDoctorsOpen, isTopDoctorsSlidingOut, closeTopDoctors } = useTransition()
  const [isResting, setIsResting] = useState(false)
  const session = useFetchSession()
  const skipFetch = session.isLoaded(CACHE_KEY)
  const liveDoctors = useTopDoctors(SHEET_TOP_COUNT)
  const displayRef = useRef(liveDoctors)
  if (!isTopDoctorsSlidingOut) displayRef.current = liveDoctors
  const doctors = displayRef.current
  const contentRef = useRef(null)
  const itemRefs = useRef([])
  const revealedRef = useRef(new Set())
  const [, forceUpdate] = useState(0)
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const timersRef = useRef([])
  const initialDoneRef = useRef(skipFetch)
  const toastDelayRef = useRef(null)
  const toastOutRef = useRef(null)
  const [loadingToast, setLoadingToast] = useState(null)

  const revealCard = useCallback((idx) => {
    if (revealedRef.current.has(idx)) return
    revealedRef.current.add(idx)
    forceUpdate((n) => n + 1)
  }, [])

  const hideLoadingToast = useCallback((immediate = false) => {
    if (toastDelayRef.current) {
      clearTimeout(toastDelayRef.current)
      toastDelayRef.current = null
    }
    if (immediate) {
      if (toastOutRef.current) {
        clearTimeout(toastOutRef.current)
        toastOutRef.current = null
      }
      setLoadingToast(null)
      return
    }
    setLoadingToast((current) => {
      if (current !== 'visible') return null
      toastOutRef.current = setTimeout(() => {
        setLoadingToast(null)
        toastOutRef.current = null
      }, LOADING_TOAST_OUT)
      return 'leaving'
    })
  }, [])

  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return
    processingRef.current = true

    if (initialDoneRef.current && !toastDelayRef.current) {
      toastDelayRef.current = setTimeout(() => {
        toastDelayRef.current = null
        if (processingRef.current) setLoadingToast('visible')
      }, LOADING_TOAST_DELAY)
    }

    const next = () => {
      if (queueRef.current.length === 0) {
        processingRef.current = false
        hideLoadingToast()
        return
      }
      const batch = queueRef.current.splice(0, 2)
      batch.forEach(revealCard)
      const t = setTimeout(next, FAST_STAGGER)
      timersRef.current.push(t)
    }
    next()
  }, [revealCard, hideLoadingToast])

  const getVisibleIndices = useCallback(() => {
    const container = contentRef.current
    if (!container) return []
    const containerRect = container.getBoundingClientRect()
    const visible = []

    itemRefs.current.forEach((el, idx) => {
      if (skipFetch || !el || revealedRef.current.has(idx)) return
      const rect = el.getBoundingClientRect()
      const visibleHeight = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top)
      if (visibleHeight > rect.height * 0.25) {
        visible.push(idx)
      }
    })
    return visible
  }, [skipFetch])

  const checkVisibilityInitial = useCallback(() => {
    const indices = getVisibleIndices()
    if (indices.length > 0) {
      indices.forEach((idx) => queueRef.current.push(idx))
      processQueue()
    }

    const t = setTimeout(() => {
      initialDoneRef.current = true
    }, OFFSCREEN_DELAY)
    timersRef.current.push(t)
  }, [getVisibleIndices, processQueue])

  const checkVisibilityScroll = useCallback(() => {
    if (!initialDoneRef.current) return
    const indices = getVisibleIndices()
    if (indices.length > 0) {
      indices.forEach((idx) => {
        if (!queueRef.current.includes(idx)) queueRef.current.push(idx)
      })
      processQueue()
    }
  }, [getVisibleIndices, processQueue])

  useEffect(() => {
    if (!isTopDoctorsOpen || isTopDoctorsSlidingOut) return undefined
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' })
    if (skipFetch) {
      initialDoneRef.current = true
      return undefined
    }
    initialDoneRef.current = false
    const t = setTimeout(checkVisibilityInitial, INITIAL_DELAY)
    const done = setTimeout(() => {
      session.markLoaded(CACHE_KEY)
      forceUpdate((n) => n + 1)
    }, INITIAL_DELAY + OFFSCREEN_DELAY)
    return () => {
      clearTimeout(t)
      clearTimeout(done)
    }
  }, [isTopDoctorsOpen, isTopDoctorsSlidingOut, checkVisibilityInitial, skipFetch, session, doctors])

  useEffect(() => {
    const container = contentRef.current
    if (!container || !isTopDoctorsOpen) return undefined
    const onScroll = () => checkVisibilityScroll()
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [isTopDoctorsOpen, checkVisibilityScroll])

  useEffect(() => {
    if (isTopDoctorsOpen && !skipFetch) {
      revealedRef.current = new Set()
      queueRef.current = []
      processingRef.current = false
      initialDoneRef.current = false
      hideLoadingToast(true)
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
    return () => {
      if (toastDelayRef.current) clearTimeout(toastDelayRef.current)
      if (toastOutRef.current) clearTimeout(toastOutRef.current)
    }
  }, [isTopDoctorsOpen, skipFetch, hideLoadingToast])

  useEffect(() => {
    if (isTopDoctorsOpen && !isTopDoctorsSlidingOut) {
      if (isResting) return undefined
      const t = setTimeout(() => setIsResting(true), 400)
      return () => clearTimeout(t)
    }
    if (!isTopDoctorsOpen) setIsResting(false)
    return undefined
  }, [isTopDoctorsOpen, isTopDoctorsSlidingOut, isResting])

  const handleClose = () => {
    if (isTopDoctorsSlidingOut) return
    closeTopDoctors()
    if (location.pathname.startsWith('/doctor/')) navigate('/')
  }

  const openDoctor = (doctor) => {
    closeTopDoctors()
    promoteTopDoctor(doctor.id)
  }

  if (!isTopDoctorsOpen && !isTopDoctorsSlidingOut) return null

  const overlayMotion = isTopDoctorsSlidingOut
    ? 'slide-out'
    : isResting
      ? 'is-resting'
      : 'slide-in'

  return (
    <div
      className={`top-doctors-overlay ${overlayMotion}`}
      onClick={handleClose}
    >
      <div
        className="top-doctors-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="top-doctors-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="top-doctors-sheet-handle" />
        <div className="top-doctors-header">
          <h2 id="top-doctors-sheet-title" className="top-doctors-title">Top 10 Doctor Speciality</h2>
          <button type="button" className="top-doctors-close-btn" onClick={handleClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="top-doctors-list" ref={contentRef}>
          {doctors.map((doctor, i) => {
            const isRevealed = skipFetch || revealedRef.current.has(i)
            return (
              <div
                key={doctor.id}
                className={`top-doctor-card ${isRevealed ? 'revealed' : ''}`}
                ref={(el) => { itemRefs.current[i] = el }}
              >
                <div className={`top-doctor-skeleton ${isRevealed ? 'hidden' : ''}`}>
                  <div className="top-doctor-skeleton-photo shimmer" />
                  <div className="top-doctor-skeleton-name shimmer" />
                  <div className="top-doctor-skeleton-specialty shimmer" />
                  <div className="top-doctor-skeleton-exp shimmer" />
                </div>

                <div className={`top-doctor-content ${isRevealed ? 'visible' : ''}`}>
                  <DoctorCard
                    doctor={doctor}
                    variant="grid"
                    origin="top10-speciality"
                    returnTo="/"
                    onBeforeNavigate={() => openDoctor(doctor)}
                  />
                </div>
              </div>
            )
          })}
          <div className="end-of-page-placeholder">- You've reached the end -</div>
        </div>

        {loadingToast && (
          <div
            className={`top-doctors-loading-toast ${loadingToast === 'leaving' ? 'is-leaving' : ''}`}
            role="status"
            aria-live="polite"
          >
            <div className="top-doctors-pill-spinner" />
            <span>Loading more doctors...</span>
          </div>
        )}
      </div>
    </div>
  )
}
