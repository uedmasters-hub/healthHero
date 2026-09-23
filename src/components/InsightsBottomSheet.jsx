import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransition } from './PageTransition'
import { useFetchSession } from './FetchSession'
import { articlePath, articles } from '../data/articles'
import { InsightCardBody } from './InsightCard'
import { isInLoadZone, VIEWPORT_PRELOAD_SCREENS } from './useStaggerReveal'
import './HealthInsights.css'
import './InsightsBottomSheet.css'

const FAST_STAGGER = 28
const CACHE_KEY = 'overlay:insights'

export default function InsightsBottomSheet() {
  const navigate = useNavigate()
  const { isInsightsOpen, isInsightsSlidingOut, closeInsights } = useTransition()
  const session = useFetchSession()
  const skipFetch = session.isLoaded(CACHE_KEY)
  const contentRef = useRef(null)
  const itemRefs = useRef([])
  const revealedRef = useRef(new Set())
  const [, forceUpdate] = useState(0)
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const timersRef = useRef([])

  const revealCard = useCallback((idx) => {
    if (revealedRef.current.has(idx)) return
    revealedRef.current.add(idx)
    const mounted = itemRefs.current.filter(Boolean).length
    if (mounted > 0 && revealedRef.current.size >= mounted) {
      session.markLoaded(CACHE_KEY)
    }
    forceUpdate((n) => n + 1)
  }, [session])

  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return
    processingRef.current = true

    const next = () => {
      if (queueRef.current.length === 0) {
        processingRef.current = false
        return
      }
      const batch = queueRef.current.splice(0, 2)
      batch.forEach(revealCard)
      const t = setTimeout(next, FAST_STAGGER)
      timersRef.current.push(t)
    }
    next()
  }, [revealCard])

  const getVisibleIndices = useCallback(() => {
    const container = contentRef.current
    if (!container) return []
    const containerRect = container.getBoundingClientRect()
    const buffer = Math.round(containerRect.height * VIEWPORT_PRELOAD_SCREENS)
    const visible = []

    itemRefs.current.forEach((el, idx) => {
      if (skipFetch || !el || revealedRef.current.has(idx)) return
      const rect = el.getBoundingClientRect()
      if (isInLoadZone(rect, containerRect, buffer)) visible.push(idx)
    })
    return visible
  }, [skipFetch])

  const hydrateVisible = useCallback(() => {
    const indices = getVisibleIndices()
    if (indices.length === 0) return
    indices.forEach((idx) => {
      if (!queueRef.current.includes(idx)) queueRef.current.push(idx)
    })
    processQueue()
  }, [getVisibleIndices, processQueue])

  useEffect(() => {
    if (!isInsightsOpen || isInsightsSlidingOut) return undefined
    if (skipFetch) return undefined
    const raf = requestAnimationFrame(() => hydrateVisible())
    return () => cancelAnimationFrame(raf)
  }, [isInsightsOpen, isInsightsSlidingOut, hydrateVisible, skipFetch])

  useEffect(() => {
    const container = contentRef.current
    if (!container || !isInsightsOpen) return undefined
    const onScroll = () => hydrateVisible()
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [isInsightsOpen, hydrateVisible])

  useEffect(() => {
    if (isInsightsOpen && !skipFetch) {
      revealedRef.current = new Set()
      queueRef.current = []
      processingRef.current = false
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      if (revealedRef.current.size > 0) session.markLoaded(CACHE_KEY)
    }
  }, [isInsightsOpen, skipFetch, session])

  const handleClose = () => {
    if (isInsightsSlidingOut) return
    closeInsights()
  }

  const openArticle = (article) => {
    closeInsights()
    navigate(articlePath(article.id), {
      state: {
        origin: 'insights-sheet',
        returnTo: '/',
        restore: { insights: true },
      },
    })
  }

  if (!isInsightsOpen && !isInsightsSlidingOut) return null

  return (
    <div
      className={`insights-sheet-overlay ${isInsightsSlidingOut ? 'closing' : ''}`}
      onClick={handleClose}
    >
      <div
        className="insights-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insights-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="insights-sheet-handle" />
        <div className="insights-sheet-header">
          <h2 id="insights-sheet-title" className="insights-sheet-title">Health Insights</h2>
          <button type="button" className="insights-sheet-close" onClick={handleClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="insights-sheet-content" ref={contentRef}>
          {articles.map((article, idx) => {
            const isRevealed = skipFetch || revealedRef.current.has(idx)
            return (
              <button
                type="button"
                key={article.id}
                className="insight-card is-stack"
                ref={(el) => { itemRefs.current[idx] = el }}
                onClick={() => openArticle(article)}
              >
                <div className={`insights-sheet-skel ${isRevealed ? 'is-hidden' : ''}`} aria-hidden="true">
                  <div className="insights-sheet-skel-copy">
                    <div className="insights-sheet-skel-line shimmer" />
                    <div className="insights-sheet-skel-line is-short shimmer" />
                    <div className="insights-sheet-skel-meta shimmer" />
                  </div>
                  <div className="insights-sheet-skel-thumb shimmer" />
                </div>
                <div className={`insights-sheet-body ${isRevealed ? 'is-visible' : ''}`}>
                  <InsightCardBody article={article} />
                </div>
              </button>
            )
          })}
          <div className="end-of-page-placeholder">- You've reached the end -</div>
        </div>
      </div>
    </div>
  )
}
