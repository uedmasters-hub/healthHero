import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Header search icon — appears after the in-stage search bar scrolls away,
 * or after a scroll threshold when the bar lives in a fixed dock.
 */
export default function useSearchScrollCompact({
  stageRef,
  searchRef,
  enabled = true,
  fallbackTravel = 72,
}) {
  const [visible, setVisible] = useState(false)
  const visibleRef = useRef(false)
  const rafRef = useRef(0)
  const travelRef = useRef(fallbackTravel)

  const measure = useCallback(() => {
    if (!enabled) return

    const stage = stageRef.current
    if (!stage) return

    const search = searchRef?.current
    const y = stage.scrollTop

    if (search && stage.contains(search)) {
      const height = search.offsetHeight
      if (height > 24) travelRef.current = height

      const travel = travelRef.current
      const showAt = travel + 8
      const hideAt = travel
      const stageTop = stage.getBoundingClientRect().top
      const searchBottom = search.getBoundingClientRect().bottom
      const fullyHidden = searchBottom <= stageTop + 0.5

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
      return
    }

    // Docked search (outside stage): threshold on scrollTop.
    const travel = travelRef.current || fallbackTravel
    const next = y >= travel + 8
    if (next !== visibleRef.current) {
      visibleRef.current = next
      setVisible(next)
    }
  }, [enabled, fallbackTravel, searchRef, stageRef])

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
