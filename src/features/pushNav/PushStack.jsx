import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation, useNavigationType, useOutlet } from 'react-router-dom'
import { isPushDetailPath, normalizePath, PUSH_MOTION } from './config'
import './PushStack.css'

const PushStackContext = createContext(null)

export function usePushStack() {
  return useContext(PushStackContext)
}

let nextLayerId = 1

function createLayer({ routeKey, location, element, suppressEnter = false }) {
  return {
    id: nextLayerId++,
    routeKey,
    location,
    element,
    exiting: false,
    isTop: true,
    suppressEnter,
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function setPageLayerPopping(active, toHome) {
  const layer = document.querySelector('.page-layer')
  if (!layer) return
  layer.classList.toggle('is-push-popping', Boolean(active))
  layer.classList.toggle('is-push-popping-home', Boolean(active && toHome))
}

function setHomePushUnderlay(active, { pushing = false } = {}) {
  const page = document.querySelector('.page-layer')
  const home = document.querySelector('.page-layer .home-layer')
  if (page) {
    page.classList.toggle('is-push-covering-home', Boolean(active))
    page.classList.toggle('is-push-pushing-home', Boolean(active && pushing))
  }
  if (home) {
    home.classList.toggle('is-push-underlay', Boolean(active))
  }
}

function findLayerIndex(layers, { routeKey, pathname }) {
  if (routeKey) {
    const byKey = layers.findIndex((layer) => layer.routeKey === routeKey)
    if (byKey >= 0) return byKey
  }
  if (pathname) {
    const path = normalizePath(pathname)
    return layers.findIndex((layer) => normalizePath(layer.location?.pathname) === path)
  }
  return -1
}

/**
 * Keeps prior push-detail screens mounted so pop can reveal them underneath.
 * Destination trees are never remounted on pop — only the exiting top is removed
 * after the animation settles, and navigation commits afterward.
 */
export default function PushStack() {
  const outlet = useOutlet()
  const location = useLocation()
  const navType = useNavigationType()
  const path = location.pathname
  const isPush = isPushDetailPath(path)

  const [layers, setLayers] = useState([])
  const [phase, setPhase] = useState('idle') // idle | push | pop | swipe
  const [swipePx, setSwipePx] = useState(0)

  const layersRef = useRef(layers)
  const phaseRef = useRef(phase)
  const popTimerRef = useRef(0)
  const pendingCommitRef = useRef(null)
  const skipPopAnimRef = useRef(false)
  const rootRef = useRef(null)
  const swipeRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    vx: 0,
    locked: null,
  })

  layersRef.current = layers
  phaseRef.current = phase

  const clearPopTimer = () => {
    if (popTimerRef.current) {
      window.clearTimeout(popTimerRef.current)
      popTimerRef.current = 0
    }
  }

  const runAfterPopAnim = useCallback((fn) => {
    clearPopTimer()
    const ms = prefersReducedMotion() ? 0 : PUSH_MOTION.DURATION_MS
    popTimerRef.current = window.setTimeout(fn, ms)
  }, [])

  const settleToPreservedStack = useCallback((prev, { routeKey, location: loc }) => {
    const alive = prev.filter((layer) => !layer.exiting)
    if (alive.length === 0) return []

    let idx = findLayerIndex(alive, { routeKey, pathname: loc.pathname })
    if (idx < 0) idx = alive.length - 1

    return alive.slice(0, idx + 1).map((layer, index, arr) => {
      const isTop = index === arr.length - 1
      return {
        ...layer,
        // Keep id + element — never remount destination.
        routeKey: isTop ? routeKey : layer.routeKey,
        location: isTop ? loc : layer.location,
        exiting: false,
        isTop,
      }
    })
  }, [])

  // Sync stack with router for push-detail screens.
  useLayoutEffect(() => {
    // Programmatic pop already animated — reconcile without remounting.
    if (skipPopAnimRef.current) {
      skipPopAnimRef.current = false
      if (!isPush) {
        setLayers([])
        setPhase('idle')
        setSwipePx(0)
        setPageLayerPopping(false, false)
        setHomePushUnderlay(false)
        return undefined
      }
      setLayers((prev) => settleToPreservedStack(prev, {
        routeKey: location.key,
        location,
      }))
      setPhase('idle')
      setSwipePx(0)
      setPageLayerPopping(false, false)
      return undefined
    }

    if (!isPush) {
      // Browser/system back landed on a non-push route while stack had screens.
      if (layersRef.current.length > 0 && navType === 'POP') {
        setPageLayerPopping(true, true)
        setLayers((prev) => prev.map((layer, index) => ({
          ...layer,
          exiting: index === prev.length - 1,
          isTop: index === prev.length - 1,
        })))
        setPhase('pop')
        runAfterPopAnim(() => {
          setLayers([])
          setPhase('idle')
          setSwipePx(0)
          setPageLayerPopping(false, false)
          setHomePushUnderlay(false)
        })
        return undefined
      }
      if (layersRef.current.length > 0) {
        setLayers([])
        setPhase('idle')
        setSwipePx(0)
        setPageLayerPopping(false, false)
        setHomePushUnderlay(false)
      }
      return undefined
    }

    const routeKey = location.key
    const existingIdx = findLayerIndex(layersRef.current, {
      routeKey,
      pathname: location.pathname,
    })

    if (navType === 'POP') {
      if (existingIdx >= 0 && existingIdx < layersRef.current.length - 1) {
        setPageLayerPopping(true, false)
        setLayers((prev) => prev.map((layer, index) => ({
          ...layer,
          exiting: index > existingIdx,
          isTop: index === prev.length - 1 || index === existingIdx,
        })))
        setPhase('pop')
        runAfterPopAnim(() => {
          // Preserve destination element/id — only drop exiting tops.
          setLayers((prev) => prev
            .filter((_, index) => index <= existingIdx)
            .map((layer, index, arr) => ({
              ...layer,
              routeKey: index === arr.length - 1 ? routeKey : layer.routeKey,
              location: index === arr.length - 1 ? location : layer.location,
              exiting: false,
              isTop: index === arr.length - 1,
            })))
          setPhase('idle')
          setSwipePx(0)
          setPageLayerPopping(false, false)
        })
        return undefined
      }

      // Deep-link / missing stack entry — unavoidable fresh mount.
      setLayers([createLayer({ routeKey, location, element: outlet })])
      setPhase('idle')
      setSwipePx(0)
      setPageLayerPopping(false, false)
      return undefined
    }

    if (navType === 'REPLACE') {
      setLayers((prev) => {
        if (prev.length === 0) {
          return [createLayer({ routeKey, location, element: outlet })]
        }
        const head = prev.slice(0, -1).map((layer) => ({
          ...layer,
          isTop: false,
          exiting: false,
        }))
        const top = prev[prev.length - 1]
        return [
          ...head,
          {
            ...top,
            routeKey,
            location,
            element: outlet,
            exiting: false,
            isTop: true,
            suppressEnter: false,
          },
        ]
      })
      setPhase('idle')
      return undefined
    }

    // PUSH — keep prior layers mounted as underlays (stable ids).
    const suppressEnter = Boolean(location.state?.restore?.topDoctors)
    setLayers((prev) => {
      const existing = findLayerIndex(prev, { routeKey, pathname: location.pathname })
      if (existing >= 0 && prev[existing].routeKey === routeKey) {
        return prev.map((layer, index) => (
          index === existing
            ? {
              ...layer,
              element: outlet,
              location,
              exiting: false,
              isTop: true,
              suppressEnter,
            }
            : { ...layer, isTop: false, exiting: false }
        ))
      }
      return [
        ...prev.map((layer) => ({ ...layer, isTop: false, exiting: false })),
        createLayer({ routeKey, location, element: outlet, suppressEnter }),
      ]
    })
    setPhase(suppressEnter ? 'idle' : 'push')
    clearPopTimer()
    if (!suppressEnter) {
      runAfterPopAnim(() => setPhase('idle'))
    }
    return undefined
  }, [isPush, location, location.key, navType, outlet, runAfterPopAnim, settleToPreservedStack])

  useEffect(() => () => {
    clearPopTimer()
    setPageLayerPopping(false, false)
    setHomePushUnderlay(false)
  }, [])

  // Single push screen over home → keep home visible underneath in `.is-dimmed` state.
  useEffect(() => {
    const coverHome = isPush && layers.length === 1 && phase !== 'pop'
    setHomePushUnderlay(coverHome, { pushing: phase === 'push' })
    return () => {
      if (coverHome) setHomePushUnderlay(false)
    }
  }, [isPush, layers.length, phase])

  /**
   * Programmatic back: play the full pop with the destination already mounted,
   * then commit navigation only after the animation has settled.
   */
  const beginPop = useCallback((commit) => {
    if (typeof commit !== 'function') return

    if (prefersReducedMotion() || phaseRef.current === 'pop') {
      skipPopAnimRef.current = true
      commit()
      return
    }

    const stack = layersRef.current
    if (!isPushDetailPath(location.pathname) || stack.length === 0) {
      commit()
      return
    }

    const poppingToHome = stack.length === 1
    pendingCommitRef.current = commit
    setPageLayerPopping(true, poppingToHome)
    setLayers((prev) => prev.map((layer, index) => ({
      ...layer,
      exiting: index === prev.length - 1,
      isTop: index === prev.length - 1 || index === prev.length - 2,
    })))
    setPhase('pop')

    runAfterPopAnim(() => {
      const fn = pendingCommitRef.current
      pendingCommitRef.current = null
      // Destination stays mounted (same id/element). Drop the exiting top only,
      // then navigate — reconcile updates routeKey without remounting.
      setLayers((prev) => prev
        .filter((layer) => !layer.exiting)
        .map((layer, index, arr) => ({
          ...layer,
          exiting: false,
          isTop: index === arr.length - 1,
        })))
      setPhase('idle')
      setSwipePx(0)
      setPageLayerPopping(false, false)
      skipPopAnimRef.current = true
      fn?.()
    })
  }, [location.pathname, runAfterPopAnim])

  const canSwipeBack = isPush && layers.length > 0 && phase !== 'push'

  useEffect(() => {
    const root = rootRef.current
    if (!root || !canSwipeBack) return undefined

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (phaseRef.current === 'pop') return
      const bounds = root.getBoundingClientRect()
      const x = e.clientX - bounds.left
      if (x > PUSH_MOTION.EDGE_PX) return
      swipeRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastT: performance.now(),
        vx: 0,
        locked: null,
      }
      try {
        root.setPointerCapture?.(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    const onPointerMove = (e) => {
      const s = swipeRef.current
      if (!s.active) return
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      const now = performance.now()
      const dt = Math.max(1, now - s.lastT)
      s.vx = (e.clientX - s.lastX) / dt
      s.lastX = e.clientX
      s.lastT = now

      if (s.locked == null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        s.locked = Math.abs(dx) >= Math.abs(dy) && dx > 0 ? 'h' : 'v'
        if (s.locked === 'v') {
          s.active = false
          setSwipePx(0)
          setPhase('idle')
          return
        }
        setPhase('swipe')
        setPageLayerPopping(true, layersRef.current.length === 1)
      }
      if (s.locked !== 'h') return
      e.preventDefault()
      const slideX = Math.max(0, dx)
      setSwipePx(slideX)
      if (layersRef.current.length === 1) {
        const width = Math.max(1, root.getBoundingClientRect().width)
        const p = Math.min(1, slideX / width)
        const scale = PUSH_MOTION.UNDERLAY_SCALE + (1 - PUSH_MOTION.UNDERLAY_SCALE) * p
        const brightness = PUSH_MOTION.UNDERLAY_BRIGHTNESS
          + (1 - PUSH_MOTION.UNDERLAY_BRIGHTNESS) * p
        const page = document.querySelector('.page-layer')
        if (page) {
          page.style.setProperty('--push-swipe-scale', String(scale))
          page.style.setProperty('--push-swipe-brightness', String(brightness))
          page.classList.add('is-push-swiping-home')
        }
      }
    }

    const clearHomeSwipeVars = () => {
      const page = document.querySelector('.page-layer')
      if (!page) return
      page.classList.remove('is-push-swiping-home')
      page.style.removeProperty('--push-swipe-scale')
      page.style.removeProperty('--push-swipe-brightness')
    }

    const endSwipe = () => {
      const s = swipeRef.current
      if (!s.active && phaseRef.current !== 'swipe') return
      s.active = false
      const width = Math.max(1, root.getBoundingClientRect().width)
      const dx = Math.max(0, s.lastX - s.startX)
      const p = dx / width
      const shouldCommit = p >= PUSH_MOTION.COMMIT_PROGRESS || s.vx >= PUSH_MOTION.COMMIT_VELOCITY

      if (shouldCommit) {
        clearHomeSwipeVars()
        beginPop(() => {
          window.history.back()
        })
      } else {
        clearHomeSwipeVars()
        setSwipePx(0)
        setPhase('idle')
        setPageLayerPopping(false, false)
      }
    }

    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointermove', onPointerMove, { passive: false })
    root.addEventListener('pointerup', endSwipe)
    root.addEventListener('pointercancel', endSwipe)
    return () => {
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', endSwipe)
      root.removeEventListener('pointercancel', endSwipe)
    }
  }, [canSwipeBack, beginPop])

  const ctx = useMemo(() => ({ beginPop, isPushRoute: isPush }), [beginPop, isPush])

  if (!isPush && layers.length === 0) {
    return (
      <PushStackContext.Provider value={ctx}>
        {outlet}
      </PushStackContext.Provider>
    )
  }

  if (layers.length === 0) {
    return (
      <PushStackContext.Provider value={ctx}>
        {null}
      </PushStackContext.Provider>
    )
  }

  const width = typeof window !== 'undefined'
    ? (rootRef.current?.getBoundingClientRect().width || 390)
    : 390

  return (
    <PushStackContext.Provider value={ctx}>
      <div
        ref={rootRef}
        className={[
          'push-stack',
          phase === 'push' ? 'is-pushing' : '',
          phase === 'pop' ? 'is-popping' : '',
          phase === 'swipe' ? 'is-swiping' : '',
        ].filter(Boolean).join(' ')}
      >
        {layers.map((layer, index) => {
          const isTop = index === layers.length - 1
          const underTop = index === layers.length - 2
          const exiting = layer.exiting
          let style

          if (phase === 'swipe' && isTop) {
            style = {
              transform: `translate3d(${swipePx}px, 0, 0)`,
              transition: 'none',
            }
          } else if (phase === 'swipe' && underTop) {
            const p = Math.min(1, swipePx / Math.max(width, 1))
            const scale = PUSH_MOTION.UNDERLAY_SCALE
              + (1 - PUSH_MOTION.UNDERLAY_SCALE) * p
            const brightness = PUSH_MOTION.UNDERLAY_BRIGHTNESS
              + (1 - PUSH_MOTION.UNDERLAY_BRIGHTNESS) * p
            style = {
              transform: `scale(${scale})`,
              filter: `brightness(${brightness})`,
              borderRadius: p > 0.85 ? 0 : undefined,
              transition: 'none',
            }
          }

          return (
            <div
              key={layer.id}
              className={[
                'push-stack__layer',
                isTop ? 'is-top' : 'is-under',
                underTop ? 'is-under-active' : '',
                exiting ? 'is-exiting' : '',
                isTop && phase === 'push' && !layer.suppressEnter ? 'is-enter' : '',
              ].filter(Boolean).join(' ')}
              style={style}
              aria-hidden={!isTop || exiting ? true : undefined}
            >
              {layer.element}
            </div>
          )
        })}
      </div>
    </PushStackContext.Provider>
  )
}
