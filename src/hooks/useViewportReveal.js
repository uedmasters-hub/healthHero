import { useState, useEffect, useRef, useCallback } from 'react'

const STAGGER_DELAY = 60
const INITIAL_DELAY = 400

export function useViewportReveal(totalCount) {
  const [revealed, setRevealed] = useState(() => new Array(totalCount).fill(false))
  const observerRef = useRef(null)
  const revealQueue = useRef([])
  const isProcessing = useRef(false)
  const ready = useRef(false)

  const processQueue = useCallback(() => {
    if (isProcessing.current || revealQueue.current.length === 0) return
    isProcessing.current = true

    const processNext = () => {
      if (revealQueue.current.length === 0) {
        isProcessing.current = false
        return
      }
      const idx = revealQueue.current.shift()
      setRevealed(prev => {
        if (prev[idx]) return prev
        const next = [...prev]
        next[idx] = true
        return next
      })
      setTimeout(processNext, STAGGER_DELAY)
    }

    processNext()
  }, [])

  const reset = useCallback(() => {
    setRevealed(new Array(totalCount).fill(false))
    revealQueue.current = []
    isProcessing.current = false
    ready.current = false
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }, [totalCount])

  const start = useCallback((containerNode) => {
    if (!containerNode) return
    ready.current = false
    revealQueue.current = []
    isProcessing.current = false

    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver((entries) => {
      const newVisible = []
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = parseInt(entry.target.dataset.revealIndex, 10)
          if (!Number.isNaN(idx)) newVisible.push(idx)
        }
      })

      if (newVisible.length > 0) {
        newVisible.sort((a, b) => a - b)
        newVisible.forEach(idx => {
          if (!revealQueue.current.includes(idx)) {
            revealQueue.current.push(idx)
          }
        })
        if (ready.current) processQueue()
      }
    }, {
      threshold: 0.1,
      rootMargin: '200px 0px'
    })

    const cards = containerNode.querySelectorAll('[data-reveal-index]')
    cards.forEach(card => observerRef.current.observe(card))

    setTimeout(() => {
      ready.current = true
      processQueue()
    }, INITIAL_DELAY)
  }, [processQueue])

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [])

  return { revealed, reset, start }
}
