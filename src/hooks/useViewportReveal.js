/**
 * @deprecated Prefer `useStaggerReveal` — the shared viewport loading strategy.
 * Kept for compatibility with older imports / design-system docs.
 */
import useStaggerReveal, {
  VIEWPORT_PRELOAD_SCREENS,
  VIEWPORT_STAGGER_MS,
  VIEWPORT_BATCH_SIZE,
  isInLoadZone,
  isPartiallyVisible,
} from '../components/useStaggerReveal'

export {
  VIEWPORT_PRELOAD_SCREENS,
  VIEWPORT_STAGGER_MS,
  VIEWPORT_BATCH_SIZE,
  isInLoadZone,
  isPartiallyVisible,
}

/** Legacy API: `useViewportReveal(totalCount)` → shared stagger strategy. */
export function useViewportReveal(_totalCount) {
  return useStaggerReveal({ delay: 0 })
}

export default useViewportReveal
