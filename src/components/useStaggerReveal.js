import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnboardingActive } from '../lib/onboarding'
import { useFetchSession } from './FetchSession'

let hookSeq = 0

export default function useStaggerReveal({
  dataset,
  resetKey,
  delay = 280,
  batchSize = 2,
  stagger = 36,
  offscreenDelay = 480,
} = {}) {
  const session = useFetchSession()
  const onboardingActive = useOnboardingActive()
  const instanceId = useRef(null)
  if (instanceId.current == null) instanceId.current = `hook:${++hookSeq}`

  const explicit = dataset !== undefined ? dataset : resetKey
  const paused = explicit === null || explicit === false || onboardingActive
  const cacheId = !paused && explicit !== undefined ? String(explicit) : instanceId.current

  const containerRef = useRef(null)
  const itemRefs = useRef([])
  const revealedRef = useRef(new Set())
  const [, bump] = useState(0)
  const queueRef = useRef([])
  const processingRef = useRef(false)
  const timersRef = useRef([])
  const initialDoneRef = useRef(session.isLoaded(cacheId))

  const setItemRef = useCallback((idx) => (el) => {
    itemRefs.current[idx] = el
  }, [])

  const isRevealed = useCallback((idx) => {
    if (session.isLoaded(cacheId)) return true
    return revealedRef.current.has(idx)
  }, [session, cacheId])

  const reveal = useCallback((idx) => {
    if (session.isLoaded(cacheId) || revealedRef.current.has(idx)) return
    revealedRef.current.add(idx)
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
      const t = setTimeout(next, stagger)
      timersRef.current.push(t)
    }
    next()
  }, [batchSize, stagger, reveal])

  const getVisible = useCallback(() => {
    const boxEl = containerRef.current
      || document.querySelector('.home-stage')
      || document.querySelector('.page-layer-inner')
    const box = boxEl
      ? boxEl.getBoundingClientRect()
      : { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth }
    const visible = []
    itemRefs.current.forEach((el, idx) => {
      if (!el || revealedRef.current.has(idx) || session.isLoaded(cacheId)) return
      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      const vh = Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top)
      const vw = Math.min(rect.right, box.right) - Math.max(rect.left, box.left)
      if (vh > Math.min(rect.height * 0.2, 20) && vw > Math.min(rect.width * 0.2, 20)) {
        visible.push(idx)
      }
    })
    return visible
  }, [session, cacheId])

  const enqueueVisible = useCallback(() => {
    if (session.isLoaded(cacheId)) return
    getVisible().forEach((idx) => {
      if (!queueRef.current.includes(idx)) queueRef.current.push(idx)
    })
    processQueue()
  }, [getVisible, processQueue, session, cacheId])

  useEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    queueRef.current = []
    processingRef.current = false

    if (paused) return undefined

    if (session.isLoaded(cacheId)) {
      initialDoneRef.current = true
      revealedRef.current = new Set()
      bump((n) => n + 1)
      return undefined
    }

    revealedRef.current = new Set()
    initialDoneRef.current = false
    bump((n) => n + 1)

    const start = setTimeout(() => {
      enqueueVisible()
      if (queueRef.current.length === 0) {
        itemRefs.current.forEach((el, idx) => {
          if (!el || revealedRef.current.has(idx) || queueRef.current.includes(idx)) return
          const rect = el.getBoundingClientRect()
          if (rect.bottom > 0 && rect.top < window.innerHeight) queueRef.current.push(idx)
        })
        processQueue()
      }
      const ready = setTimeout(() => {
        initialDoneRef.current = true
        if (itemRefs.current.some(Boolean)) session.markLoaded(cacheId)
        bump((n) => n + 1)
      }, offscreenDelay)
      timersRef.current.push(ready)
    }, delay)
    timersRef.current.push(start)

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [paused, cacheId, delay, offscreenDelay, enqueueVisible, session])

  useEffect(() => {
    if (paused) return undefined
    const onScroll = () => {
      if (!initialDoneRef.current) return
      enqueueVisible()
    }
    const node = containerRef.current
    node?.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      node?.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [paused, cacheId, enqueueVisible])

  return {
    containerRef,
    setItemRef,
    isRevealed,
    isCached: session.isLoaded(cacheId),
  }
}
