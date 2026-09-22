import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useNow from '../hooks/useNow'
import { useDeviceShell, SHELL_MODE } from '../hooks/useDeviceShell'
import { hasStickyCta } from '../features/fab/config'
import './PhoneFrame.css'

const IDLE_MS = 900
const DELTA = 6

function formatStatusTime(date) {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).formatToParts(date)
    const hour = parts.find((part) => part.type === 'hour')?.value ?? ''
    const minute = parts.find((part) => part.type === 'minute')?.value ?? ''
    return `${hour}:${minute}`
  } catch {
    const hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const h12 = hours % 12 || 12
    return `${h12}:${minutes}`
  }
}

function StatusSignalIcon() {
  return (
    <svg className="phone-signal" viewBox="0 0 19.2 12.2" aria-hidden="true">
      <rect x="0" y="8.2" width="3.2" height="4" rx="0.75" fill="currentColor" />
      <rect x="5.2" y="5.6" width="3.2" height="6.6" rx="0.75" fill="currentColor" />
      <rect x="10.4" y="2.8" width="3.2" height="9.4" rx="0.75" fill="currentColor" />
      <rect x="15.6" y="0" width="3.2" height="12.2" rx="0.75" fill="currentColor" />
    </svg>
  )
}

function StatusWifiIcon() {
  return (
    <svg
      className="phone-wifi"
      viewBox="0 0 16 12"
      fill="none"
      aria-hidden="true"
      shapeRendering="geometricPrecision"
    >
      <circle cx="8" cy="10.55" r="1.05" fill="currentColor" />
      <path
        d="M5.44 8.4A3.35 3.35 0 0 1 10.56 8.4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M3.26 6.56A6.2 6.2 0 0 1 12.74 6.56"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M1.12 4.76A9 9 0 0 1 14.88 4.76"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

function StatusBatteryIcon() {
  return (
    <svg className="phone-battery" viewBox="0 0 27.5 13" aria-hidden="true">
      <rect
        x="0.6"
        y="0.6"
        width="23"
        height="11.8"
        rx="3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.4"
      />
      <rect x="2.2" y="2.2" width="19.8" height="8.6" rx="2" fill="currentColor" />
      <path
        d="M25.2 4.1c1.35.55 1.35 4.25 0 4.8V4.1Z"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  )
}

/**
 * Device-aware app shell.
 * - native: edge-to-edge PWA on phone (mockup chrome hidden via CSS)
 * - preview: centered phone frame on tablet/desktop
 *
 * `#phone-screen` / `.phone-app` stay mounted across mode changes so portals,
 * sheets, FAB, and nav keep binding without remount flash.
 */
export default function AppShell({ children }) {
  const shellMode = useDeviceShell()
  const isNative = shellMode === SHELL_MODE.NATIVE
  const location = useLocation()
  const stickyCta = hasStickyCta(location.pathname)
  const appRef = useRef(null)
  const [navHiddenState, setNavHidden] = useState(false)
  // Sticky-footer screens: bottom CTA owns the safe area — never run Home-style nav hide.
  const navHidden = stickyCta ? false : navHiddenState
  const now = useNow(1000)
  const liveTime = formatStatusTime(now)

  useEffect(() => {
    if (isNative) {
      document.documentElement.style.removeProperty('--phone-scale')
      return undefined
    }
    const fit = () => {
      const frameW = 440 + 28
      const frameH = 956 + 28
      const sx = (window.innerWidth - 40) / frameW
      const sy = (window.innerHeight - 40) / frameH
      const scale = Math.max(0.2, Math.min(1, sx, sy))
      document.documentElement.style.setProperty('--phone-scale', String(scale))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [isNative])

  useEffect(() => {
    const app = appRef.current
    if (!app || stickyCta) return undefined
    let idleTimer = 0
    const lastY = new WeakMap()

    const show = () => setNavHidden(false)

    const onScroll = (event) => {
      const el = event.target
      if (!(el instanceof Element)) return
      const y = el.scrollTop
      const prev = lastY.get(el)
      lastY.set(el, y)

      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(show, IDLE_MS)

      if (prev == null) return
      const diff = y - prev
      if (Math.abs(diff) < DELTA) return

      if (y <= 0 || diff < 0) {
        show()
      } else {
        setNavHidden(true)
      }
    }

    app.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      app.removeEventListener('scroll', onScroll, { capture: true })
      window.clearTimeout(idleTimer)
    }
  }, [stickyCta])

  return (
    <div
      className={`phone-stage ${isNative ? 'is-native' : 'is-preview'}`}
      data-shell={shellMode}
    >
      <div className="phone-scale">
        <div className="phone-frame">
          <span className="phone-btn phone-btn-silent" aria-hidden="true" />
          <span className="phone-btn phone-btn-vol-up" aria-hidden="true" />
          <span className="phone-btn phone-btn-vol-down" aria-hidden="true" />
          <span className="phone-btn phone-btn-power" aria-hidden="true" />
          <div
            className={`phone-screen${stickyCta ? ' is-sticky-cta' : ''}`}
            id="phone-screen"
            data-shell={shellMode}
          >
            <header className="phone-status-bar" aria-hidden="true">
              <time className="phone-time" dateTime={now.toISOString()}>
                {liveTime}
              </time>
              <div className="phone-island" />
              <div className="phone-status-icons">
                <StatusSignalIcon />
                <StatusWifiIcon />
                <StatusBatteryIcon />
              </div>
            </header>
            <div
              className={`phone-app ${navHidden ? 'nav-hidden' : ''}`}
              ref={appRef}
            >
              {children}
            </div>
            <footer className="phone-footer" aria-hidden="true">
              <div className="phone-home-bar" />
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
