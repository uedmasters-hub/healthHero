import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { flowState } from '../../lib/careFlow'
import { usePushStack } from './PushStack'
import { isPushDetailPath } from './config'

/**
 * Resolve an explicit return path from route state when history cannot pop.
 */
export function resolveOriginReturnTo(location, fallback = '/') {
  const state = location?.state || {}
  const pathname = location?.pathname
  const candidates = [state.returnTo, state.from]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate && candidate !== pathname) {
      return candidate
    }
  }
  return fallback
}

/**
 * Origin-aware back — prefer history.pop (preserves underlay scroll/state),
 * then explicit returnTo/from, then fallback. Plays PushStack mirrored pop
 * when the current path is a push-detail screen.
 *
 * @param {string} [fallback='/'] route used only when no history / returnTo exists
 */
export default function useOriginBack(fallback = '/') {
  const navigate = useNavigate()
  const location = useLocation()
  const stack = usePushStack()

  return useCallback(() => {
    const commit = () => {
      const state = location.state || {}
      const returnTo = resolveOriginReturnTo(location, null)
      const canPop = typeof window !== 'undefined' && window.history.length > 1

      // Native feel: pop the real back stack whenever possible so the parent
      // underlay (Settings, Treat, Pharmacy, …) restores with scroll intact.
      if (canPop) {
        navigate(-1)
        return
      }

      if (returnTo) {
        navigate(returnTo, { state: flowState(state) })
        return
      }

      navigate(fallback)
    }

    if (stack?.beginPop && isPushDetailPath(window.location.pathname)) {
      stack.beginPop(commit)
      return
    }
    commit()
  }, [navigate, location, stack, fallback])
}
