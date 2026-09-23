import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useOnboardingActive } from '../lib/onboarding'
import { useFetchSession } from './FetchSession'

/**
 * Shared viewport loading strategy used across Home, Treat, Pharmacy,
 * Healthcare Centers, doctor lists/carousels, and Post Visit cards.
 *
 * Rules:
 * - Eagerly hydrate anything fully or partially in the viewport (1px peek counts)
 * - Preload ~1–1.5 screens ahead so scroll feels instant
 * - Lazy-load only content that is genuinely below the fold
 * - Skeletons clear as soon as items enter the load zone — no scroll required
 */

let hookSeq = 0

/** Screens ahead of the fold to preload (vertical + horizontal). */
export const VIEWPORT_PRELOAD_SCREENS = 1.25
/** Micro-stagger between batches once items are in the load zone. */
export const VIEWPORT_STAGGER_MS = 36
export const VIEWPORT_BATCH_SIZE = 2

function preloadPx() {
  if (typeof window === 'undefined') return 900
  return Math.round(window.innerHeight * VIEWPORT_PRELOAD_SCREENS)
}

function resolveRootBox(containerEl) {
  const stage = typeof document !== 'undefined'
    ? (document.querySelector('.home-stage')
      || document.querySelector('.page-layer-inner')
      || document.querySelector('.treat-page')
      || document.documentElement)
    : null
  const el = containerEl || stage
  if (!el) {
    return {
      top: 0,
      left: 0,
      bottom: typeof window !== 'undefined' ? window.innerHeight : 0,
      right: typeof window !== 'undefined' ? window.innerWidth : 0,
    }
  }
  return el.getBoundingClientRect()
}

/**
 * True when the element intersects the viewport/root, or sits within
 * the preload buffer (below / beside the fold). Any pixel of overlap counts —
 * including carousel cards peeking into view.
 */
export function isInLoadZone(rect, rootRect, bufferPx = preloadPx()) {
  if (!rect || rect.width < 1 || rect.height < 1) return false
  const zone = {
    top: rootRect.top - bufferPx * 0.15,
    bottom: rootRect.bottom + bufferPx,
    left: rootRect.left - bufferPx * 0.25,
    right: rootRect.right + bufferPx * 0.25,
  }
  return (
    rect.bottom > zone.top
    && rect.top < zone.bottom
    && rect.right > zone.left
    && rect.left < zone.right
  )
}

/** True when any pixel intersects the visible root (no preload). */
export function isPartiallyVisible(rect, rootRect) {
  if (!rect || rect.width < 1 || rect.height < 1) return false
  return (
    rect.bottom > rootRect.top
    && rect.top < rootRect.bottom
    && rect.right > rootRect.left
    && rect.left < rootRect.right
  )
}

export default function useStaggerReveal({
  dataset,
  namespace,
  resetKey,
  /** @deprecated Ignored for above-fold; kept for call-site compat. */
  delay: _delay = 0,
  batchSize = VIEWPORT_BATCH_SIZE,
  stagger = VIEWPORT_STAGGER_MS,
  /** @deprecated Preload is handled by IntersectionObserver rootMargin. */
  offscreenDelay: _offscreenDelay = 0,
} = {}) {
  const session = useFetchSession()
  const onboardingActive = useOnboardingActive()
  const instanceId = useRef(null)
  if (instanceId.current == null) instanceId.current = `hook:${++hookSeq}`

  // `namespace` is the documented call-site key used by carousels / pharmacy.
  const explicit = dataset !== undefined
    ? dataset
    : (namespace !== undefined ? namespace : resetKey)
  const paused = explicit === null || explicit === false || onboardingActive
  const cacheId = !paused && explicit !== undefined ? String(explicit) : instanceId.current

  const containerRef = useRef(null)
  const itemRefs = useRef([])
  const revealedRef = useRef(new Set())
  const [, bump] = useState(0)
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const timersRef = useRef([])
  const observerRef = useRef(null)
  const enqueueRef = useRef(() => {})

  const isRevealed = useCallback((idx) => {
    if (session.isLoaded(cacheId)) return true
    return revealedRef.current.has(idx)
  }, [session, cacheId])

  const reveal = useCallback((idx) => {
    if (session.isLoaded(cacheId) || revealedRef.current.has(idx)) return
    revealedRef.current.add(idx)
    const mounted = itemRefs.current.filter(Boolean).length
    if (mounted > 0 && revealedRef.current.size >= mounted) {
      session.markLoaded(cacheId)
    }
    bump((n) => n + 1)
  }, [session, cacheId])

  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return
    processingRef.current = true
    const next = () => {
      if (queueRef.current.length === 0) {
        processingRef.current = false
        return
      }
      queueRef.current.splice(0, batchSize).forEach(reveal)
      if (queueRef.current.length === 0) {
        processingRef.current = false
        return
      }
      const t = setTimeout(next, stagger)
      timersRef.current.push(t)
    }
    next()
  }, [batchSize, stagger, reveal])

  const enqueueIndices = useCallback((indices) => {
    if (session.isLoaded(cacheId)) return
    let added = false
    indices.forEach((idx) => {
      if (
        revealedRef.current.has(idx)
        || queueRef.current.includes(idx)
      ) return
      queueRef.current.push(idx)
      added = true
    })
    if (added) processQueue()
  }, [processQueue, session, cacheId])

  enqueueRef.current = enqueueIndices

  const setItemRef = useCallback((idx) => (el) => {
    const prev = itemRefs.current[idx]
    if (prev && observerRef.current && prev !== el) {
      observerRef.current.unobserve(prev)
    }
    itemRefs.current[idx] = el
    if (!el) return
    el.dataset.revealIndex = String(idx)
    if (observerRef.current) observerRef.current.observe(el)
    // Refs often attach after the layout effect — hydrate immediately so the
    // first paint never waits on a scroll event for already-visible cards.
    if (!session.isLoaded(cacheId) && !revealedRef.current.has(idx)) {
      const rootRect = resolveRootBox(containerRef.current)
      const rect = el.getBoundingClientRect()
      if (isInLoadZone(rect, rootRect)) {
        enqueueRef.current([idx])
      }
    }
  }, [session, cacheId])

  const collectInZone = useCallback(() => {
    const rootRect = resolveRootBox(containerRef.current)
    const buffer = preloadPx()
    const eager = []
    const preload = []
    itemRefs.current.forEach((el, idx) => {
      if (!el || revealedRef.current.has(idx) || session.isLoaded(cacheId)) return
      const rect = el.getBoundingClientRect()
      if (isPartiallyVisible(rect, rootRect)) {
        eager.push(idx)
      } else if (isInLoadZone(rect, rootRect, buffer)) {
        preload.push(idx)
      }
    })
    return { eager, preload }
  }, [session, cacheId])

  const hydrateVisible = useCallback(() => {
    if (session.isLoaded(cacheId)) return
    const { eager, preload } = collectInZone()
    enqueueIndices([...eager, ...preload])
  }, [collectInZone, enqueueIndices, session, cacheId])

  // Eager first paint: run before paint so above-fold cards never wait on scroll.
  useLayoutEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    queueRef.current = []
    processingRef.current = false

    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (paused) return undefined

    if (session.isLoaded(cacheId)) {
      revealedRef.current = new Set()
      bump((n) => n + 1)
      return undefined
    }

    revealedRef.current = new Set()
    bump((n) => n + 1)

    hydrateVisible()

    const buffer = preloadPx()
    if (typeof IntersectionObserver !== 'undefined') {
      observerRef.current = new IntersectionObserver((entries) => {
        const hit = []
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const idx = parseInt(entry.target.dataset.revealIndex, 10)
          if (!Number.isNaN(idx)) hit.push(idx)
        })
        if (hit.length) {
          hit.sort((a, b) => a - b)
          enqueueIndices(hit)
        }
      }, {
        threshold: 0,
        rootMargin: `${Math.round(buffer * 0.15)}px ${Math.round(buffer * 0.25)}px ${buffer}px ${Math.round(buffer * 0.25)}px`,
      })

      itemRefs.current.forEach((el, idx) => {
        if (!el) return
        el.dataset.revealIndex = String(idx)
        observerRef.current.observe(el)
      })
    }

    const raf = requestAnimationFrame(() => {
      hydrateVisible()
    })

    return () => {
      cancelAnimationFrame(raf)
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [paused, cacheId, hydrateVisible, enqueueIndices, session])

  // Persist across remounts in the same FetchSession scope (e.g. Home ↔ Search).
  useEffect(() => {
    if (paused) return undefined
    return () => {
      if (revealedRef.current.size > 0) session.markLoaded(cacheId)
    }
  }, [paused, cacheId, session])

  useEffect(() => {
    if (paused || session.isLoaded(cacheId)) return undefined
    const onMove = () => hydrateVisible()
    const node = containerRef.current
    node?.addEventListener('scroll', onMove, { passive: true })
    document.addEventListener('scroll', onMove, { capture: true, passive: true })
    window.addEventListener('resize', onMove, { passive: true })
    return () => {
      node?.removeEventListener('scroll', onMove)
      document.removeEventListener('scroll', onMove, { capture: true })
      window.removeEventListener('resize', onMove)
    }
  }, [paused, cacheId, hydrateVisible, session])

  return {
    containerRef,
    setItemRef,
    isRevealed,
    isCached: session.isLoaded(cacheId),
  }
}
