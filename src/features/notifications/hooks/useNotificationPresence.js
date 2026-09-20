/**
 * Staged presence for HeaderActions — Wallet / Dynamic Island style.
 *
 * Exit (home + unread 0):
 *   exit-bell → exit-hold → exit-collapse → exit-absorb → exit-dissolve → enlarged
 *
 * Enter (unread > 0):
 *   enter-shell → enter-bell → enter-badge → visible
 *
 * Hide is deferred while settleHide is false (away from home).
 */
import { useEffect, useRef, useState } from 'react'

export const NOTIFICATION_MOTION = Object.freeze({
  EXIT_BELL_MS: 280,
  EXIT_HOLD_MS: 100,
  EXIT_COLLAPSE_MS: 340,
  EXIT_ABSORB_MS: 300,
  EXIT_DISSOLVE_MS: 220,
  ENTER_SHELL_MS: 380,
  ENTER_BELL_MS: 420,
  ENTER_BADGE_DELAY_MS: 100,
  BADGE_POP_MS: 280,
})

const ENTER_BELL_AT = NOTIFICATION_MOTION.ENTER_SHELL_MS
const ENTER_BADGE_AT =
  ENTER_BELL_AT
  + NOTIFICATION_MOTION.ENTER_BELL_MS
  + NOTIFICATION_MOTION.ENTER_BADGE_DELAY_MS
const ENTER_VISIBLE_AT = ENTER_BADGE_AT + 40

/**
 * @param {number} unreadCount
 * @param {{ settleHide?: boolean, forceBell?: boolean }} [options]
 * forceBell — show capsule + bell with no badge (island about to dock).
 */
export default function useNotificationPresence(unreadCount, { settleHide = true, forceBell = false } = {}) {
  const count = Math.max(0, Number(unreadCount) || 0)
  const hasUnread = count > 0
  const wantsPresence = hasUnread || forceBell

  const [phase, setPhase] = useState(hasUnread ? 'visible' : 'enlarged')
  const [showBadge, setShowBadge] = useState(hasUnread)
  const [displayCount, setDisplayCount] = useState(hasUnread ? count : 0)

  const timersRef = useRef([])
  const phaseRef = useRef(phase)
  const lastPositiveRef = useRef(count > 0 ? count : 1)
  const seqRef = useRef(0)
  phaseRef.current = phase

  if (count > 0) lastPositiveRef.current = count

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }

  const later = (fn, ms) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => {
    clearTimers()
    const current = phaseRef.current
    const seq = ++seqRef.current
    const alive = () => seqRef.current === seq

    if (wantsPresence) {
      if (hasUnread) {
        setDisplayCount(count)

        // Bell already staged for island dock — just pop the badge.
        if (
          current === 'dock-ready'
          || current === 'enter-bell'
          || current === 'holding'
        ) {
          setShowBadge(true)
          setPhase('enter-badge')
          later(() => {
            if (!alive()) return
            setPhase('visible')
          }, 40)
          return clearTimers
        }

        if (current === 'visible' || current === 'enter-badge') {
          setShowBadge(true)
          if (current !== 'visible') setPhase('visible')
          return clearTimers
        }

        setShowBadge(false)
        setPhase('enter-shell')

        later(() => {
          if (!alive()) return
          setPhase('enter-bell')
        }, ENTER_BELL_AT)

        later(() => {
          if (!alive()) return
          setShowBadge(true)
          setPhase('enter-badge')
        }, ENTER_BADGE_AT)

        later(() => {
          if (!alive()) return
          setPhase('visible')
        }, ENTER_VISIBLE_AT)

        return clearTimers
      }

      // forceBell only — capsule + bell, badge stays hidden until settle.
      setShowBadge(false)
      setDisplayCount(lastPositiveRef.current)

      if (
        current === 'dock-ready'
        || current === 'enter-bell'
        || current === 'visible'
        || current === 'holding'
        || current === 'enter-badge'
      ) {
        if (current !== 'dock-ready') setPhase('dock-ready')
        return clearTimers
      }

      setPhase('enter-shell')
      later(() => {
        if (!alive()) return
        setPhase('enter-bell')
      }, ENTER_BELL_AT)
      later(() => {
        if (!alive()) return
        setPhase('dock-ready')
      }, ENTER_BELL_AT + NOTIFICATION_MOTION.ENTER_BELL_MS)

      return clearTimers
    }

    // Zero unread, not on home — hold capsule+bell.
    if (!settleHide) {
      if (current === 'enlarged') {
        setShowBadge(false)
        return clearTimers
      }
      setDisplayCount(lastPositiveRef.current)
      setShowBadge(true)
      if (current !== 'holding') setPhase('holding')
      return clearTimers
    }

    // On home, zero unread — staged exit (unless already enlarged / exiting).
    if (current === 'enlarged') {
      setShowBadge(false)
      return clearTimers
    }
    if (String(current).startsWith('exit')) {
      return clearTimers
    }

    setDisplayCount(lastPositiveRef.current)
    setShowBadge(true)
    setPhase('exit-bell')

    let t = NOTIFICATION_MOTION.EXIT_BELL_MS
    later(() => {
      if (!alive()) return
      setShowBadge(false)
      setPhase('exit-hold')
    }, t)

    t += NOTIFICATION_MOTION.EXIT_HOLD_MS
    later(() => {
      if (!alive()) return
      setPhase('exit-collapse')
    }, t)

    t += NOTIFICATION_MOTION.EXIT_COLLAPSE_MS
    later(() => {
      if (!alive()) return
      setPhase('exit-absorb')
    }, t)

    t += NOTIFICATION_MOTION.EXIT_ABSORB_MS
    later(() => {
      if (!alive()) return
      setPhase('exit-dissolve')
    }, t)

    t += NOTIFICATION_MOTION.EXIT_DISSOLVE_MS
    later(() => {
      if (!alive()) return
      setPhase('enlarged')
      setDisplayCount(0)
    }, t)

    return clearTimers
  }, [hasUnread, count, settleHide, forceBell, wantsPresence])

  useEffect(() => () => clearTimers(), [])

  const showBell =
    phase === 'visible'
    || phase === 'holding'
    || phase === 'dock-ready'
    || phase === 'exit-bell'
    || phase === 'exit-hold'
    || phase === 'enter-bell'
    || phase === 'enter-badge'

  const showShell =
    phase !== 'enlarged'

  const avatarMode =
    phase === 'enlarged' || phase === 'exit-absorb' || phase === 'exit-dissolve'
      ? 'enlarged'
      : phase === 'enter-shell'
        ? 'shrinking'
        : 'compact'

  return {
    phase,
    showShell,
    showBell,
    showBadge:
      showBadge
      && hasUnread
      && (
        phase === 'holding'
        || phase === 'exit-bell'
        || phase === 'enter-badge'
        || phase === 'visible'
      ),
    displayCount:
      phase === 'enlarged' ? 0 : (displayCount || lastPositiveRef.current),
    avatarMode,
  }
}
