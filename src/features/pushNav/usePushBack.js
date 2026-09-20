import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePushStack } from './PushStack'
import { isPushDetailPath } from './config'

/**
 * Back navigation that plays the mirrored pop when on a push-detail screen.
 * `to` may be a path string, -1, or a custom () => void.
 */
export default function usePushBack(to = -1) {
  const navigate = useNavigate()
  const stack = usePushStack()

  return useCallback(() => {
    const commit = () => {
      if (typeof to === 'function') {
        to()
        return
      }
      if (typeof to === 'number') {
        navigate(to)
        return
      }
      navigate(to)
    }

    if (stack?.beginPop && isPushDetailPath(window.location.pathname)) {
      stack.beginPop(commit)
      return
    }
    commit()
  }, [navigate, stack, to])
}
