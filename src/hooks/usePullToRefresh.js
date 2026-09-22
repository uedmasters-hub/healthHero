/**
 * Pull-to-refresh for any overflow scroll container.
 * Preserves current UI while refreshing; dedupes in-flight requests.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const THRESHOLD_PX = 64
const MAX_PULL_PX = 96

export function usePullToRefresh(scrollRef, onRefresh, {
  enabled = true,
  threshold = THRESHOLD_PX,
} = {}) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)
  const inFlight = useRef(null)

  const runRefresh = useCallback(async () => {
    if (!onRefresh) return
    if (inFlight.current) return inFlight.current
    setRefreshing(true)
    setPull(threshold)
    inFlight.current = Promise.resolve()
      .then(() => onRefresh())
      .catch(() => {})
      .finally(() => {
        inFlight.current = null
        setRefreshing(false)
        setPull(0)
      })
    return inFlight.current
  }, [onRefresh, threshold])

  useEffect(() => {
    const el = scrollRef?.current
    if (!el || !enabled || !onRefresh) return undefined

    const onTouchStart = (e) => {
      if (refreshing || inFlight.current) return
      if (el.scrollTop > 0) {
        pulling.current = false
        return
      }
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    const onTouchMove = (e) => {
      if (!pulling.current || refreshing) return
      if (el.scrollTop > 0) {
        pulling.current = false
        setPull(0)
        return
      }
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        setPull(0)
        return
      }
      // Resistance curve
      const distance = Math.min(MAX_PULL_PX, dy * 0.45)
      setPull(distance)
      if (distance > 8 && e.cancelable) e.preventDefault()
    }

    const onTouchEnd = () => {
      if (!pulling.current) return
      pulling.current = false
      setPull((current) => {
        if (current >= threshold) {
          runRefresh()
          return threshold
        }
        return 0
      })
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [scrollRef, enabled, onRefresh, refreshing, threshold, runRefresh])

  return {
    pull,
    refreshing,
    indicatorStyle: {
      height: refreshing ? threshold : pull,
      opacity: refreshing || pull > 8 ? 1 : 0,
    },
    refresh: runRefresh,
  }
}
