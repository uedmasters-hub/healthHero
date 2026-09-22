import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as notificationService from '../features/notifications/service'
import { Types, Priority } from '../features/notifications/models'
import { useAppScrim } from './AppScrim'
import { subscribeScrimClick } from '../lib/appScrim'
import { useFab } from '../features/fab/FabProvider'
import { FAB_MODE, FAB_MOTION } from '../features/fab/config'
import { FabIcon } from '../features/fab/icons'
import './QuickCareFab.css'

const CLOSE_MS = 220

/**
 * Global context-aware FAB — hub / utility / hidden.
 * Presentation only; mode + actions come from FabProvider + config.js.
 */
export default function QuickCareFab() {
  const { mode, motion, actions, action, runAction, isHidden } = useFab()
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [portalEl, setPortalEl] = useState(null)
  const pushedRef = useRef(false)
  const ignorePopRef = useRef(false)
  const closeTimerRef = useRef(0)
  const pendingActionRef = useRef(null)
  const longPressRef = useRef(0)

  // Close hub when leaving Action Hub mode
  useEffect(() => {
    if (mode !== FAB_MODE.HUB && (open || closing)) {
      setOpen(false)
      setClosing(false)
      pendingActionRef.current = null
      window.clearTimeout(closeTimerRef.current)
      if (pushedRef.current) {
        ignorePopRef.current = true
        pushedRef.current = false
        window.history.back()
      }
    }
  }, [mode, open, closing])

  const finishClose = useCallback(() => {
    setOpen(false)
    setClosing(false)
    const pending = pendingActionRef.current
    pendingActionRef.current = null
    if (pending) runAction(pending)
  }, [runAction])

  const closeMenu = useCallback(({ actionId = null, fromPopstate = false } = {}) => {
    if (closing) {
      if (actionId) pendingActionRef.current = actionId
      return
    }
    if (!open) return

    pendingActionRef.current = actionId
    setClosing(true)
    window.clearTimeout(closeTimerRef.current)

    if (pushedRef.current && !fromPopstate) {
      ignorePopRef.current = true
      pushedRef.current = false
      window.history.back()
    } else {
      pushedRef.current = false
    }

    closeTimerRef.current = window.setTimeout(finishClose, CLOSE_MS)
  }, [open, closing, finishClose])

  const openMenu = useCallback(() => {
    if (mode !== FAB_MODE.HUB) return
    window.clearTimeout(closeTimerRef.current)
    pendingActionRef.current = null
    setClosing(false)
    setOpen(true)
    if (!pushedRef.current) {
      window.history.pushState({ quickCare: true }, '')
      pushedRef.current = true
    }
  }, [mode])

  const toggleHub = useCallback(() => {
    if (open || closing) closeMenu()
    else openMenu()
  }, [open, closing, closeMenu, openMenu])

  const onUtilityClick = useCallback(() => {
    if (action) runAction(action)
  }, [action, runAction])

  useEffect(() => {
    if (!open) return undefined

    const onPopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false
        return
      }
      pushedRef.current = false
      closeMenu({ fromPopstate: true })
    }
    const onKey = (e) => {
      if (e.key === 'Escape') closeMenu()
    }

    window.addEventListener('popstate', onPopState)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, closeMenu])

  useEffect(() => () => {
    window.clearTimeout(closeTimerRef.current)
    window.clearTimeout(longPressRef.current)
  }, [])

  useEffect(() => {
    setPortalEl(document.getElementById('phone-screen'))
  }, [])

  const expanded = mode === FAB_MODE.HUB && open && !closing
  useAppScrim(expanded)

  useEffect(() => {
    if (!expanded) return undefined
    return subscribeScrimClick(() => closeMenu())
  }, [expanded, closeMenu])

  // DEV: long-press FAB to push a test notification (island pipeline)
  const onFabPointerDown = () => {
    if (!import.meta.env.DEV) return
    window.clearTimeout(longPressRef.current)
    longPressRef.current = window.setTimeout(() => {
      notificationService.pushNotification({
        title: 'Quick Care test',
        body: 'Long-press FAB pushed this notification through the island pipeline.',
        type: Types.TELEHEALTH,
        priority: Priority.NORMAL,
        to: '/profile/support',
        unread: true,
      })
    }, 650)
  }

  const clearLongPress = () => window.clearTimeout(longPressRef.current)

  if (isHidden || !portalEl) return null

  const isUtility = mode === FAB_MODE.UTILITY
  const isScrollMotion = motion === FAB_MOTION.SCROLL
  const fabIcon = isUtility ? (action?.icon || 'plus') : 'plus'
  const fabLabel = isUtility
    ? (action?.label || 'Action')
    : (expanded ? 'Close Quick Care' : 'Open Quick Care')

  const menu = (
    <div
      className={[
        'quick-care',
        expanded ? 'is-open' : '',
        closing ? 'is-closing' : '',
        isUtility ? 'is-utility' : 'is-hub',
        isScrollMotion ? 'is-scroll-motion' : 'is-fixed-motion',
      ].filter(Boolean).join(' ')}
    >
      {mode === FAB_MODE.HUB ? (
        <div
          className="quick-care__actions"
          id={menuId}
          role="menu"
          aria-hidden={!expanded}
        >
          {(actions || []).map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`quick-care__pill quick-care__pill--${item.tone || 'book'}`}
              style={{ '--qc-stagger': String(index) }}
              tabIndex={expanded ? 0 : -1}
              onClick={() => closeMenu({ actionId: item.id })}
            >
              <span className="quick-care__pill-icon">
                <FabIcon name={item.icon} />
              </span>
              <span className="quick-care__pill-label">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="quick-care__fab"
        aria-label={fabLabel}
        title={isUtility ? action?.label : undefined}
        aria-expanded={mode === FAB_MODE.HUB ? expanded : undefined}
        aria-controls={mode === FAB_MODE.HUB ? menuId : undefined}
        aria-haspopup={mode === FAB_MODE.HUB ? 'menu' : undefined}
        onClick={isUtility ? onUtilityClick : toggleHub}
        onPointerDown={onFabPointerDown}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
      >
        <span
          className={[
            'quick-care__fab-icon',
            isUtility ? 'is-utility-glyph' : '',
          ].filter(Boolean).join(' ')}
          aria-hidden="true"
        >
          <FabIcon name={fabIcon} />
        </span>
      </button>
    </div>
  )

  return createPortal(menu, portalEl)
}
