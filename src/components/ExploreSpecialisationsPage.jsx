import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALL_SPECIALISATIONS, exploreSpecialtyPath, loadSpecialisationsScroll, saveSpecialisationsScroll } from '../data/specialisations'
import { useFetchSession } from './FetchSession'
import { useTransition } from './PageTransition'
import './SpecialisationsPage.css'

const FAST_STAGGER = 28
const INITIAL_DELAY = 320
const OFFSCREEN_DELAY = 600
const CACHE_KEY = 'overlay:specialisations'

export default function ExploreSpecialisationsPage() {
  const navigate = useNavigate()
  const { isSpecialisationsOpen, isSpecialisationsSlidingOut, isSpecialisationsParked, closeSpecialisations, parkSpecialisations } = useTransition()
  const session = useFetchSession()
  const skipFetch = session.isLoaded(CACHE_KEY)
  const contentRef = useRef(null)
  const itemRefs = useRef([])
  const revealedRef = useRef(new Set())
  const [, forceUpdate] = useState(0)
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const timersRef = useRef([])
  const initialDoneRef = useRef(skipFetch)

  const revealCard = useCallback((idx) => {
    if (skipFetch || revealedRef.current.has(idx)) return
    revealedRef.current.add(idx)
    forceUpdate((n) => n + 1)
  }, [skipFetch])

  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return
    processingRef.current = true

    const next = () => {
      if (queueRef.current.length === 0) {
        processingRef.current = false
        return
      }
      const batch = queueRef.current.splice(0, 3)
      batch.forEach(revealCard)
      const t = setTimeout(next, FAST_STAGGER)
      timersRef.current.push(t)
    }
    next()
  }, [revealCard])

  const getVisibleIndices = useCallback(() => {
    if (skipFetch) return []
    const container = contentRef.current
    if (!container) return []
    const containerRect = container.getBoundingClientRect()
    const visible = []

    itemRefs.current.forEach((el, idx) => {
      if (!el || revealedRef.current.has(idx)) return
      const rect = el.getBoundingClientRect()
      const visibleHeight = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top)
      if (visibleHeight > rect.height * 0.2) {
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

  useLayoutEffect(() => {
    const el = contentRef.current
    if (el) el.scrollTop = loadSpecialisationsScroll()
  }, [])

  useEffect(() => {
    if (!isSpecialisationsOpen || isSpecialisationsSlidingOut) return undefined
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
  }, [isSpecialisationsOpen, isSpecialisationsSlidingOut, checkVisibilityInitial, skipFetch, session])

  useEffect(() => {
    const container = contentRef.current
    if (!container || !isSpecialisationsOpen) return undefined
    const onScroll = () => {
      saveSpecialisationsScroll(container.scrollTop)
      checkVisibilityScroll()
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [isSpecialisationsOpen, checkVisibilityScroll])

  useEffect(() => {
    if (isSpecialisationsOpen && !skipFetch) {
      revealedRef.current = new Set()
      queueRef.current = []
      processingRef.current = false
      initialDoneRef.current = false
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
    return () => {
      if (contentRef.current) saveSpecialisationsScroll(contentRef.current.scrollTop)
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [isSpecialisationsOpen, skipFetch])

  const handleClose = () => {
    if (isSpecialisationsSlidingOut) return
    closeSpecialisations()
  }

  const openSpecialty = (name) => {
    if (contentRef.current) saveSpecialisationsScroll(contentRef.current.scrollTop)
    navigate(exploreSpecialtyPath(name), {
      state: { origin: 'explore', fromSpecialisations: true, restore: { specialisations: true }, returnTo: '/' },
    })
    parkSpecialisations()
  }

  if (!isSpecialisationsOpen && !isSpecialisationsSlidingOut) return null

  return (
    <div
      className={`specialisations-overlay ${isSpecialisationsSlidingOut || isSpecialisationsParked ? 'slide-out' : 'slide-in'}`}
      aria-hidden={isSpecialisationsParked ? 'true' : undefined}
    >
      <div className="specialisations-page" ref={contentRef}>
      <div className="specialisations-header">
        <button className="specialisations-back-btn" onClick={handleClose} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="specialisations-title">All Specialisations</h1>
        <div className="specialisations-header-placeholder" />
      </div>

      <div className="specialisations-grid">
        {ALL_SPECIALISATIONS.map((spec, i) => {
          const isRevealed = skipFetch || revealedRef.current.has(i)
          return (
            <button
              type="button"
              className={`specialisation-card ${isRevealed ? 'revealed' : ''}`}
              key={spec.name}
              ref={(el) => { itemRefs.current[i] = el }}
              onClick={() => openSpecialty(spec.name)}
            >
              <div className={`skeleton-layer ${isRevealed ? 'hidden' : ''}`}>
                <div className="skeleton-icon shimmer" />
                <div className="skeleton-text shimmer" />
                <div className="skeleton-text-sm shimmer" />
              </div>
              <div className={`content-layer ${isRevealed ? 'visible' : ''}`}>
                <div className="specialisation-icon">
                  <img src={spec.image} alt="" />
                </div>
                <span className="specialisation-name">{spec.name}</span>
              </div>
            </button>
          )
        })}
      </div>
      <div className="specialisations-footer">- You've reached the end -</div>
      </div>
    </div>
  )
}
