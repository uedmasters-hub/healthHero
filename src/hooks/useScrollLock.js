import { useLayoutEffect } from 'react'
import { lock, registerScroller, unlock } from '../lib/scrollLock'

export function useRegisteredScroller(name, ref) {
  useLayoutEffect(() => {
    registerScroller(name, ref.current)
    return () => registerScroller(name, null)
  }, [name, ref])
}

export function useScrollLock(name, active) {
  useLayoutEffect(() => {
    if (!active) return undefined
    lock(name)
    return () => unlock(name)
  }, [name, active])
}
