import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BAR_SELECTOR = '.app-footer-bar'
const HIDDEN_LAYER = '[inert], [aria-hidden="true"], .is-behind'
/** Matches the FAB's resting gap above the nav (`--qc-gap`). */
const FAB_FOOTER_GAP = 16
/** Keep measuring briefly after a trigger so page/nav transitions settle. */
const SETTLE_MS = 700

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function readVar(el, name) {
  return Number.parseFloat(el?.style.getPropertyValue(name)) || 0
}

function writeVar(el, name, value, unit = '', epsilon = 0.001) {
  if (!el) return
  const current = el.style.getPropertyValue(name)
  if (current && Math.abs(Number.parseFloat(current) - value) <= epsilon) return
  if (!current && value === 0) return
  el.style.setProperty(name, `${value.toFixed(3)}${unit}`)
}

function findActiveBar(app, appRect) {
  const bars = app.querySelectorAll(BAR_SELECTOR)
  for (const bar of bars) {
    if (bar.closest(HIDDEN_LAYER)) continue
    const rect = bar.getBoundingClientRect()
    if (!rect.height) continue
    if (rect.top < appRect.bottom && rect.bottom > appRect.top) {
      return { el: bar, rect }
    }
  }
  return null
}

/**
 * Colored-footer adaptation, driven by scroll position every frame:
 * - `--footer-tone` (0 Dark → 1 Light) on the footer band as it enters and docks.
 * - `--nav-tone` (0 Light → 1 Dark) on the tab bar / home indicator so chrome
 *   and band meet without a hard edge.
 * - `--qc-footer-lift` on the FAB so it always rests a fixed gap above the band.
 */
export function useAdaptiveFooter() {
  const location = useLocation()

  useEffect(() => {
    let raf = 0
    let settleUntil = 0
    let lastBar = null

    const frame = () => {
      raf = 0
      const app = document.querySelector('.phone-app')
      if (!app) return
      const nav = document.querySelector('.bottom-nav')
      const homeBar = document.querySelector('.phone-footer')
      const fab = document.querySelector('.quick-care')
      const appRect = app.getBoundingClientRect()
      const scale = app.offsetWidth ? appRect.width / app.offsetWidth : 1
      const active = findActiveBar(app, appRect)

      let footerTone = 0
      let navTone = 0
      let lift = 0

      if (active) {
        const { el: barEl, rect: bar } = active
        const navHeight = nav?.getBoundingClientRect().height || 0
        // Footer Light progress: 0 while only the under-nav clearance is on
        // screen, 1 once the content row above the nav is fully revealed.
        const lightRange = Math.max(bar.height - navHeight, 1)
        footerTone = clamp01((appRect.bottom - bar.top - navHeight) / lightRange)
        if (navHeight) navTone = clamp01((appRect.bottom - bar.top) / navHeight)

        if (fab) {
          // Measured bottom includes nav-hide motion; add back our own lift to get the resting edge.
          const restBottom = fab.getBoundingClientRect().bottom + readVar(fab, '--qc-footer-lift') * scale
          lift = Math.max(0, (restBottom - (bar.top - FAB_FOOTER_GAP * scale)) / scale)
        }

        if (lastBar && lastBar !== barEl) writeVar(lastBar, '--footer-tone', 0)
        lastBar = barEl
        writeVar(barEl, '--footer-tone', footerTone)
      } else if (lastBar) {
        writeVar(lastBar, '--footer-tone', 0)
        lastBar = null
      }

      writeVar(nav, '--nav-tone', navTone)
      writeVar(homeBar, '--nav-tone', navTone)
      writeVar(fab, '--qc-footer-lift', lift, 'px', 0.1)
      if (active || performance.now() < settleUntil) raf = window.requestAnimationFrame(frame)
    }

    const kick = () => {
      settleUntil = performance.now() + SETTLE_MS
      if (!raf) raf = window.requestAnimationFrame(frame)
    }

    kick()
    document.addEventListener('scroll', kick, { capture: true, passive: true })
    window.addEventListener('resize', kick)
    return () => {
      window.cancelAnimationFrame(raf)
      document.removeEventListener('scroll', kick, { capture: true })
      window.removeEventListener('resize', kick)
      if (lastBar) lastBar.style.removeProperty('--footer-tone')
    }
  }, [location.pathname])
}
