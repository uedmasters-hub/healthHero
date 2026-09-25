import { useCallback, useEffect, useRef, useState } from 'react'

/** Distance past full hide before the header icon is considered “shown”. */
export const SEARCH_COMPACT_SHOW_PAD = 8
/** Exponential smoothing time-constant (ms) — keeps collapse feeling calm. */
export const SEARCH_COMPACT_SMOOTH_MS = 52
/** Progress at which the field releases pointer events / is inert. */
export const SEARCH_COMPACT_FIELD_CUTOFF = 0.92
/** Progress at which the header icon becomes interactive. */
export const SEARCH_COMPACT_ICON_CUTOFF = 0.45

function clamp01(n) {
  if (n <= 0) return 0
  if (n >= 1) return 1
  return n
}

/**
 * Coordinated Home-style search collapse.
 *
 * Drives a smoothed 0→1 `progress` from stage scroll so the large 52px field
 * and the header search icon can crossfade around the same threshold.
 *
 * Works for:
 * - In-stage search (field scrolls under the header — original behavior)
 * - Docked search (field sits above the stage — collapses by scroll distance)
 *
 * @returns {{
 *   progress: number,
 *   compact: boolean,
 *   expandedHeight: number,
 *   fieldStyle: object,
 *   iconStyle: object,
 *   fieldInert: boolean,
 *   iconInteractive: boolean,
 * }}
 */
export default function useSearchScrollCompact({
  stageRef,
  searchRef,
  enabled = true,
  fallbackTravel = 72,
  smoothMs = SEARCH_COMPACT_SMOOTH_MS,
  showPad = SEARCH_COMPACT_SHOW_PAD,
} = {}) {
  const [progress, setProgress] = useState(0)
  const [expandedHeight, setExpandedHeight] = useState(fallbackTravel)

  const progressRef = useRef(0)
  const smoothRef = useRef(0)
  const targetRef = useRef(0)
  const expandedRef = useRef(fallbackTravel)
  const lastTsRef = useRef(0)
  const rafRef = useRef(0)
  const tickingRef = useRef(false)

  const readExpandedHeight = useCallback(() => {
    const search = searchRef?.current
    if (!search) return expandedRef.current
    // Only sample while mostly expanded — collapsed max-height would read ~0.
    if (smoothRef.current > 0.08) return expandedRef.current
    const height = search.offsetHeight
    if (height > 24) {
      expandedRef.current = height
      return height
    }
    return expandedRef.current || fallbackTravel
  }, [fallbackTravel, searchRef])

  const measureTarget = useCallback(() => {
    if (!enabled) return 0

    const stage = stageRef.current
    if (!stage) return 0

    const search = searchRef?.current
    const y = stage.scrollTop
    const travel = readExpandedHeight()

    // In-stage: field scrolls away under the header edge.
    if (search && stage.contains(search)) {
      const stageTop = stage.getBoundingClientRect().top
      const rect = search.getBoundingClientRect()
      const visible = Math.min(rect.height, Math.max(0, rect.bottom - stageTop))
      const hiddenFrac = 1 - visible / Math.max(rect.height, 1)
      // Match original hysteresis band (travel + showPad).
      const scrollFrac = clamp01(y / Math.max(travel + showPad, 1))
      return Math.max(hiddenFrac, scrollFrac)
    }

    // Docked: collapse over the same travel distance the in-stage path used.
    return clamp01(y / Math.max(travel + showPad, 1))
  }, [enabled, readExpandedHeight, searchRef, showPad, stageRef])

  const tick = useCallback((ts) => {
    const target = measureTarget()
    targetRef.current = target

    const prevTs = lastTsRef.current
    const dt = prevTs ? Math.min(40, Math.max(0, ts - prevTs)) : 16
    lastTsRef.current = ts

    const tau = Math.max(16, smoothMs)
    const alpha = 1 - Math.exp(-dt / tau)
    let next = smoothRef.current + (target - smoothRef.current) * alpha
    if (Math.abs(target - next) < 0.0015) next = target
    smoothRef.current = next

    const height = expandedRef.current
    if (height !== expandedHeight && smoothRef.current < 0.08) {
      setExpandedHeight(height)
    }

    if (Math.abs(next - progressRef.current) >= 0.002) {
      progressRef.current = next
      setProgress(next)
    }

    if (Math.abs(target - smoothRef.current) > 0.001) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    tickingRef.current = false
    lastTsRef.current = 0
  }, [expandedHeight, measureTarget, smoothMs])

  const kick = useCallback(() => {
    if (!enabled) return
    readExpandedHeight()
    if (!tickingRef.current) {
      tickingRef.current = true
      lastTsRef.current = 0
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [enabled, readExpandedHeight, tick])

  useEffect(() => {
    if (!enabled) {
      progressRef.current = 0
      smoothRef.current = 0
      targetRef.current = 0
      setProgress(0)
      tickingRef.current = false
      cancelAnimationFrame(rafRef.current)
      return undefined
    }

    const stage = stageRef.current
    if (!stage) return undefined

    const onScroll = () => kick()
    const onResize = () => {
      // Force a fresh height sample after layout changes.
      smoothRef.current = Math.min(smoothRef.current, 0.04)
      readExpandedHeight()
      kick()
    }

    readExpandedHeight()
    kick()
    stage.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(rafRef.current)
      tickingRef.current = false
      stage.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [stageRef, enabled, kick, readExpandedHeight])

  const compact = progress >= SEARCH_COMPACT_FIELD_CUTOFF
  const fieldInert = progress >= SEARCH_COMPACT_FIELD_CUTOFF
  const iconInteractive = progress >= SEARCH_COMPACT_ICON_CUTOFF

  // Scroll-driven styles — no CSS transitions (avoids fighting the scroller).
  const fieldStyle = {
    maxHeight: `${Math.max(0, expandedHeight * (1 - progress))}px`,
    opacity: 1 - progress,
    transform: `translate3d(0, ${(-12 * progress).toFixed(2)}px, 0)`,
    pointerEvents: fieldInert ? 'none' : 'auto',
  }

  const iconStyle = {
    opacity: progress,
    transform: `scale3d(${(0.55 + 0.45 * progress).toFixed(3)}, ${(0.55 + 0.45 * progress).toFixed(3)}, 1)`,
  }

  return {
    progress,
    compact,
    expandedHeight,
    fieldStyle,
    iconStyle,
    fieldInert,
    iconInteractive,
  }
}
