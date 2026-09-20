import { useCallback, useEffect, useRef, useState } from 'react'
import { SheetPortal } from './PageTransition'
import './AppBottomSheet.css'

const DISMISS_THRESHOLD = 110
const VELOCITY_DISMISS = 0.65

/**
 * Shared bottom-sheet chrome for the entire app.
 * Surface, overlay, top radius, elevation, handle, and safe-area padding
 * all resolve through design tokens — local sheets supply content only.
 *
 * Optional motion:
 * - dismissOnSwipe — drag down on handle / sheet to dismiss
 * - snapPoints — ['mid','full'] height snaps while dragging
 * - keyboardAware — lifts with visualViewport when inputs focus
 * - className "is-blurred" — frosted backdrop
 */
export default function AppBottomSheet({
  open,
  closing = false,
  onClose,
  children,
  showHandle = true,
  labelledBy,
  className = '',
  sheetClassName = '',
  portalTo = 'screen',
  dismissOnSwipe = false,
  snapPoints = null,
  keyboardAware = false,
}) {
  const sheetRef = useRef(null)
  const dragRef = useRef({
    active: false,
    startY: 0,
    lastY: 0,
    lastT: 0,
    dy: 0,
    velocity: 0,
  })
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [snap, setSnap] = useState(() => (snapPoints?.includes('full') ? 'full' : 'mid'))
  const [keyboardInset, setKeyboardInset] = useState(0)

  useEffect(() => {
    if (!open) {
      setDragY(0)
      setDragging(false)
      setSnap(snapPoints?.includes('mid') ? 'mid' : (snapPoints?.[0] || 'mid'))
    }
  }, [open, snapPoints])

  useEffect(() => {
    if (!open || !keyboardAware || typeof window === 'undefined') return undefined
    const vv = window.visualViewport
    if (!vv) return undefined

    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardInset(inset > 40 ? inset : 0)
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [open, keyboardAware])

  const endDrag = useCallback(() => {
    const { dy, velocity } = dragRef.current
    dragRef.current.active = false
    setDragging(false)

    if (dy > DISMISS_THRESHOLD || velocity > VELOCITY_DISMISS) {
      setDragY(0)
      onClose?.()
      return
    }

    if (snapPoints?.length) {
      const preferFull = dy < -40 || (snap === 'mid' && dy < -12)
      const next = preferFull && snapPoints.includes('full') ? 'full' : (snapPoints.includes('mid') ? 'mid' : snapPoints[0])
      setSnap(next)
    }
    setDragY(0)
  }, [onClose, snap, snapPoints])

  const onTouchStart = useCallback((e) => {
    if (!dismissOnSwipe || closing) return
    const touch = e.touches?.[0]
    if (!touch) return
    const sheet = sheetRef.current
    if (sheet && sheet.scrollTop > 0) return
    dragRef.current = {
      active: true,
      startY: touch.clientY,
      lastY: touch.clientY,
      lastT: performance.now(),
      dy: 0,
      velocity: 0,
    }
    setDragging(true)
  }, [dismissOnSwipe, closing])

  const onTouchMove = useCallback((e) => {
    if (!dragRef.current.active) return
    const touch = e.touches?.[0]
    if (!touch) return
    const now = performance.now()
    const dy = Math.max(0, touch.clientY - dragRef.current.startY)
    const dt = Math.max(1, now - dragRef.current.lastT)
    const velocity = (touch.clientY - dragRef.current.lastY) / dt
    dragRef.current.dy = dy
    dragRef.current.lastY = touch.clientY
    dragRef.current.lastT = now
    dragRef.current.velocity = velocity
    setDragY(dy)
    if (dy > 8) e.preventDefault()
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current.active) return
    endDrag()
  }, [endDrag])

  if (!open) return null

  const snapClass = snapPoints?.length ? `is-snap-${snap}` : ''
  const style = {
    transform: dragY ? `translateY(${dragY}px)` : undefined,
    transition: dragging ? 'none' : undefined,
    paddingBottom: keyboardInset
      ? `calc(var(--sheet-pad-bottom) + ${keyboardInset}px)`
      : undefined,
    maxHeight: keyboardInset
      ? `calc(var(--app-sheet-max-height) - ${Math.min(keyboardInset, 180)}px)`
      : undefined,
  }

  return (
    <SheetPortal to={portalTo}>
      <div
        className={`ds-sheet-overlay ${closing ? 'is-closing' : ''} ${className}`.trim()}
        onClick={onClose}
      >
        <div
          ref={sheetRef}
          className={`ds-sheet ${snapClass} ${dragging ? 'is-dragging' : ''} ${sheetClassName}`.trim()}
          style={style}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
        >
          {showHandle ? (
            <div
              className="ds-sheet-handle"
              aria-hidden="true"
              onTouchStart={onTouchStart}
            />
          ) : null}
          {children}
        </div>
      </div>
    </SheetPortal>
  )
}
