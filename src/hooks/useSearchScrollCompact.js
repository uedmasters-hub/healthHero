import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Header search icon visibility — bar scrolls away naturally; icon only appears
 * after the bar is fully clipped under the header, with hysteresis so reverse
 * scroll scales the icon out before the field peeks back.
 */
export default function useSearchScrollCompact({
  stageRef,
  searchRef,
  enabled = true,
}) {
  const [visible, setVisible] = useState(false)
  const visibleRef = useRef(false)
  const rafRef = useRef(0)
  const travelRef = useRef(64)

  const measure = useCallback(() => {
    if (!enabled) return

    const stage = stageRef.current
    const search = searchRef.current
    if (!stage || !search) return

    const height = search.offsetHeight
    if (height > 24) travelRef.current = height

    const travel = travelRef.current
    // Must scroll a little past full hide so the icon never overlaps a peeking bar.
    const showAt = travel + 8
    // Drop the icon while the bar is still fully clipped (before it re-enters).
    const hideAt = travel

    const stageTop = stage.getBoundingClientRect().top
    const searchBottom = search.getBoundingClientRect().bottom
    const fullyHidden = searchBottom <= stageTop + 0.5
    const y = stage.scrollTop

    let next = visibleRef.current
    if (!visibleRef.current) {
      next = fullyHidden && y >= showAt
    } else if (!fullyHidden || y < hideAt) {
      next = false
    }

    if (next !== visibleRef.current) {
      visibleRef.current = next
      setVisible(next)
    }
  }, [enabled, searchRef, stageRef])

  useEffect(() => {
    if (!enabled) {
      visibleRef.current = false
      setVisible(false)
      return undefined
    }

    const stage = stageRef.current
    if (!stage) return undefined

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measure)
    }

    measure()
    stage.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(rafRef.current)
      stage.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [stageRef, enabled, measure])

  return visible
}
