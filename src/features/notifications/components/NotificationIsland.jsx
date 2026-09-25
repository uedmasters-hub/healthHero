import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  emitBellLand,
  getIslandSnapshot,
  ISLAND_MOTION,
  requestDockBell,
  settlePending,
  shiftQueue,
  subscribeIslandStore,
} from '../island'
import { PRESENTATION_MODE } from '../presentation'
import { flowState } from '../../../lib/careFlow'
import './NotificationIsland.css'

const BELL_VISIBLE = '.header-actions__bell .notif-btn__hit'
const BELL_FALLBACK = '[data-hh-bell-target]'

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function relativeCenter(el, root) {
  const r = el.getBoundingClientRect()
  const b = root.getBoundingClientRect()
  const sx = root.offsetWidth / Math.max(b.width, 1)
  const sy = root.offsetHeight / Math.max(b.height, 1)
  return {
    x: (r.left + r.width / 2 - b.left) * sx,
    y: (r.top + r.height / 2 - b.top) * sy,
    w: r.width * sx,
    h: r.height * sy,
  }
}

function resolveBellEl() {
  return document.querySelector(BELL_VISIBLE) || document.querySelector(BELL_FALLBACK)
}

/** Wait until the real bell control is laid out (first-notification dock). */
function waitForVisibleBell(timeoutMs = ISLAND_MOTION.DOCK_PREP_MS + 200) {
  return new Promise((resolve) => {
    const start = performance.now()
    const tick = () => {
      const el = document.querySelector(BELL_VISIBLE)
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 8 && r.height > 8) {
          resolve(el)
          return
        }
      }
      if (performance.now() - start >= timeoutMs) {
        resolve(resolveBellEl())
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })
}

function TypeGlyph({ type }) {
  return (
    <span className={`notif-island__glyph notif-island__glyph--${type || 'booking'}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </span>
  )
}

/**
 * Queued Dynamic Island toast — portaled onto #phone-screen.
 * Presentation mode (dock | toast) comes from the global controller.
 * Quiet mode suppresses new cards; mid-flight cards abort without re-queue.
 */
export default function NotificationIsland() {
  const navigate = useNavigate()
  const location = useLocation()
  const snapshot = useSyncExternalStore(subscribeIslandStore, getIslandSnapshot, getIslandSnapshot)
  const mode = snapshot.presentationMode

  const busyRef = useRef(false)
  const cardRef = useRef(null)
  const holdTimerRef = useRef(0)
  const rafRef = useRef(0)
  const dragRef = useRef({ active: false, startY: 0, dy: 0 })
  const itemRef = useRef(null)
  const absorbGenRef = useRef(0)
  const modeRef = useRef(mode)

  const [item, setItem] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [portalEl, setPortalEl] = useState(null)
  const [cardMode, setCardMode] = useState(PRESENTATION_MODE.DOCK)

  itemRef.current = item
  modeRef.current = mode

  useEffect(() => {
    setPortalEl(document.getElementById('phone-screen'))
  }, [])

  const finishCurrent = useCallback((notification, { bounce = false } = {}) => {
    window.clearTimeout(holdTimerRef.current)
    cancelAnimationFrame(rafRef.current)
    absorbGenRef.current += 1
    if (bounce) {
      emitBellLand()
      window.setTimeout(() => settlePending(notification.id), ISLAND_MOTION.BADGE_DELAY_MS)
    } else {
      settlePending(notification.id)
    }
    busyRef.current = false
    setItem(null)
    setPhase('idle')
  }, [])

  const runToastExit = useCallback((notification) => {
    const card = cardRef.current
    if (card) {
      card.style.transform = ''
      card.style.opacity = ''
    }
    setPhase('toast-exit')
    const ms = prefersReducedMotion() ? 40 : ISLAND_MOTION.TOAST_EXIT_MS
    window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = window.setTimeout(() => {
      finishCurrent(notification, { bounce: false })
    }, ms)
  }, [finishCurrent])

  const runAbsorb = useCallback(async (notification) => {
    const card = cardRef.current
    const root = portalEl || document.getElementById('phone-screen')
    if (!card || !root) {
      finishCurrent(notification, { bounce: true })
      return
    }

    // Bring capsule + bell in first so the card has a visible destination.
    requestDockBell()
    const bell = prefersReducedMotion()
      ? resolveBellEl()
      : await waitForVisibleBell()

    if (modeRef.current !== PRESENTATION_MODE.DOCK) {
      // Left home / entered quiet mid-prep — fall back to toast exit.
      if (modeRef.current === PRESENTATION_MODE.QUIET) {
        finishCurrent(notification, { bounce: false })
        return
      }
      runToastExit(notification)
      return
    }

    if (!bell || prefersReducedMotion()) {
      finishCurrent(notification, { bounce: true })
      return
    }

    // Brief settle so the bell spring finishes before the card moves.
    if (!prefersReducedMotion()) await delay(100)

    const gen = ++absorbGenRef.current
    if (itemRef.current?.id !== notification.id) return
    if (modeRef.current !== PRESENTATION_MODE.DOCK) {
      if (modeRef.current === PRESENTATION_MODE.QUIET) {
        finishCurrent(notification, { bounce: false })
        return
      }
      runToastExit(notification)
      return
    }

    setPhase('absorb')

    // Measure after layout so we dock into the live bell, not empty space.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    if (absorbGenRef.current !== gen) return

    const liveBell = resolveBellEl() || bell
    const from = relativeCenter(card, root)
    const to = relativeCenter(liveBell, root)
    const duration = ISLAND_MOTION.ABSORB_MS
    const start = performance.now()
    const arc = Math.min(56, Math.hypot(to.x - from.x, to.y - from.y) * 0.24 + 20)
    const dissolveAfter = ISLAND_MOTION.DISSOLVE_AFTER

    card.style.width = `${from.w}px`
    card.style.left = '0'
    card.style.top = '0'
    card.style.right = 'auto'
    card.style.margin = '0'
    card.style.transformOrigin = 'center center'
    card.style.opacity = '1'

    const tick = (now) => {
      if (absorbGenRef.current !== gen) return
      const t = Math.min(1, (now - start) / duration)
      const e = easeInOutCubic(t)
      const x = from.x + (to.x - from.x) * e
      const y = from.y + (to.y - from.y) * e - Math.sin(Math.PI * e) * arc
      // Keep rectangular silhouette; shrink toward the bell.
      const scale = 1 - e * 0.88
      // Fully opaque until the final beat, then dissolve into the bell.
      let opacity = 1
      if (e >= dissolveAfter) {
        opacity = 1 - ((e - dissolveAfter) / (1 - dissolveAfter))
      }
      card.style.transform = `translate3d(${x - from.w / 2}px, ${y - from.h / 2}px, 0) scale(${scale})`
      card.style.opacity = String(Math.max(0, opacity))

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        card.style.opacity = '0'
        finishCurrent(notification, { bounce: true })
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [finishCurrent, portalEl, runToastExit])

  const startHold = useCallback((notification, presentMode) => {
    setPhase('hold')
    window.clearTimeout(holdTimerRef.current)
    const holdBase = presentMode === PRESENTATION_MODE.TOAST
      ? ISLAND_MOTION.TOAST_HOLD_MS
      : ISLAND_MOTION.HOLD_MS
    const hold = prefersReducedMotion() ? 600 : holdBase
    holdTimerRef.current = window.setTimeout(() => {
      const liveMode = modeRef.current
      if (liveMode === PRESENTATION_MODE.QUIET) {
        finishCurrent(notification, { bounce: false })
        return
      }
      if (liveMode === PRESENTATION_MODE.DOCK) {
        runAbsorb(notification)
        return
      }
      runToastExit(notification)
    }, hold)
  }, [finishCurrent, runAbsorb, runToastExit])

  const showNext = useCallback((notification) => {
    const presentMode = modeRef.current === PRESENTATION_MODE.DOCK
      ? PRESENTATION_MODE.DOCK
      : PRESENTATION_MODE.TOAST
    busyRef.current = true
    setCardMode(presentMode)
    setItem(notification)
    setPhase('enter')
    window.clearTimeout(holdTimerRef.current)
    const enterMs = prefersReducedMotion() ? 60 : ISLAND_MOTION.ENTER_MS
    holdTimerRef.current = window.setTimeout(() => {
      startHold(notification, presentMode)
    }, enterMs)
  }, [startHold])

  // Drain durable queue whenever it grows and we're idle (never while quiet).
  useLayoutEffect(() => {
    if (mode === PRESENTATION_MODE.QUIET) return
    if (busyRef.current || itemRef.current) return
    if (snapshot.queueLength <= 0) return
    const next = shiftQueue()
    if (next) showNext(next)
  }, [snapshot.version, snapshot.queueLength, mode, showNext])

  // Entering quiet mid-flight: hide immediately; unread already (or will be) settled.
  useEffect(() => {
    if (mode !== PRESENTATION_MODE.QUIET) return
    const current = itemRef.current
    if (!current) return
    window.clearTimeout(holdTimerRef.current)
    cancelAnimationFrame(rafRef.current)
    absorbGenRef.current += 1
    finishCurrent(current, { bounce: false })
  }, [mode, finishCurrent])

  useEffect(() => () => {
    window.clearTimeout(holdTimerRef.current)
    cancelAnimationFrame(rafRef.current)
    absorbGenRef.current += 1
  }, [])

  const dismissUp = useCallback(() => {
    const current = itemRef.current
    if (!current || phase === 'absorb' || phase === 'dismiss' || phase === 'toast-exit') return
    window.clearTimeout(holdTimerRef.current)
    cancelAnimationFrame(rafRef.current)
    absorbGenRef.current += 1
    if (cardMode === PRESENTATION_MODE.TOAST || modeRef.current === PRESENTATION_MODE.TOAST) {
      runToastExit(current)
      return
    }
    setPhase('dismiss')
    const ms = prefersReducedMotion() ? 40 : ISLAND_MOTION.DISMISS_MS
    window.setTimeout(() => {
      finishCurrent(current, { bounce: true })
    }, ms)
  }, [phase, cardMode, finishCurrent, runToastExit])

  const onTap = useCallback(() => {
    const current = itemRef.current
    if (!current || phase === 'absorb' || phase === 'dismiss' || phase === 'toast-exit') return
    if (dragRef.current.dy < -8) return
    window.clearTimeout(holdTimerRef.current)
    cancelAnimationFrame(rafRef.current)
    absorbGenRef.current += 1
    settlePending(current.id)
    busyRef.current = false
    setItem(null)
    setPhase('idle')
    navigate('/notifications', {
      state: flowState(location, {
        origin: 'island',
        returnTo: location.pathname || '/',
      }),
    })
  }, [phase, navigate, location])

  const onPointerDown = (e) => {
    if (phase === 'absorb' || phase === 'dismiss' || phase === 'toast-exit') return
    dragRef.current = { active: true, startY: e.clientY, dy: 0 }
    try {
      cardRef.current?.setPointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onPointerMove = (e) => {
    if (!dragRef.current.active || !cardRef.current) return
    if (phase !== 'hold') return
    const dy = e.clientY - dragRef.current.startY
    dragRef.current.dy = dy
    if (dy < 0) {
      const p = Math.min(1, Math.abs(dy) / 80)
      if (cardMode === PRESENTATION_MODE.TOAST) {
        cardRef.current.style.transform = `translate3d(-50%, calc(${dy}px), 0)`
        cardRef.current.style.opacity = String(1 - p * 0.35)
      } else {
        cardRef.current.style.transform = `translate3d(-50%, calc(${dy}px), 0) scale(${1 - p * 0.04})`
        cardRef.current.style.opacity = String(1 - p * 0.35)
      }
    }
  }

  const onPointerUp = () => {
    if (!dragRef.current.active) return
    const { dy } = dragRef.current
    dragRef.current.active = false
    if (dy <= -ISLAND_MOTION.SWIPE_THRESHOLD_PX) {
      dismissUp()
      return
    }
    dragRef.current.dy = 0
    if (cardRef.current && phase === 'hold') {
      cardRef.current.style.transform = ''
      cardRef.current.style.opacity = ''
    }
  }

  if (!portalEl || !item) return null

  const modeClass = cardMode === PRESENTATION_MODE.TOAST
    ? 'notif-island__card--mode-toast'
    : 'notif-island__card--mode-dock'

  return createPortal(
    <div className="notif-island" aria-live="polite">
      <button
        type="button"
        ref={cardRef}
        className={[
          'notif-island__card',
          modeClass,
          `notif-island__card--${phase}`,
        ].join(' ')}
        onClick={onTap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={`${item.title}. ${item.body}. Open notifications.`}
      >
        <TypeGlyph type={item.type} />
        <span className="notif-island__copy">
          <span className="notif-island__title">{item.title}</span>
          {item.body ? (
            <span className="notif-island__body">{item.body}</span>
          ) : null}
        </span>
      </button>
    </div>,
    portalEl,
  )
}
