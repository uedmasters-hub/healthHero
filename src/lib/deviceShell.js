/**
 * Device-aware shell detection for eMedicalls.
 *
 * Uses viewport geometry + input capability (+ UA as a phone/tablet hint),
 * not a single fixed width breakpoint. Phones render edge-to-edge (PWA);
 * tablets and desktops keep the centered preview frame.
 */

export const SHELL_MODE = Object.freeze({
  NATIVE: 'native',
  PREVIEW: 'preview',
})

function readUa() {
  return typeof navigator !== 'undefined' ? (navigator.userAgent || '') : ''
}

function readPlatform() {
  return typeof navigator !== 'undefined' ? (navigator.platform || '') : ''
}

function touchPoints() {
  return typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0
}

function mq(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia(query).matches
  } catch {
    return false
  }
}

/**
 * True when the device should run as a full-bleed phone PWA shell.
 * Tablets (iPad / Android tablet) and desktops always return false.
 */
export function shouldUseNativeShell() {
  if (typeof window === 'undefined') return false

  const ua = readUa()
  const platform = readPlatform()
  const maxTouch = touchPoints()

  // iPadOS 13+ can report as MacIntel with multi-touch.
  const isIpad = /iPad/i.test(ua) || (platform === 'MacIntel' && maxTouch > 1)
  const isIphone = /iPhone|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isAndroidPhone = isAndroid && /Mobile/i.test(ua)
  const isAndroidTablet = isAndroid && !/Mobile/i.test(ua)

  if (isIpad || isAndroidTablet) return false
  if (isIphone || isAndroidPhone) return true

  const coarse = mq('(pointer: coarse)')
  const hoverNone = mq('(hover: none)')
  const canTouch = maxTouch > 0 || (typeof window !== 'undefined' && 'ontouchstart' in window)
  const touchPrimary = canTouch && (coarse || hoverNone)

  // Shortest side stays phone-like in landscape; tablets are usually ≥600–768.
  const shortest = Math.min(window.innerWidth, window.innerHeight)
  const longest = Math.max(window.innerWidth, window.innerHeight)
  const phoneViewport = shortest <= 520 || (shortest <= 600 && longest <= 960)

  return touchPrimary && phoneViewport
}

export function getShellMode() {
  return shouldUseNativeShell() ? SHELL_MODE.NATIVE : SHELL_MODE.PREVIEW
}

export function subscribeShellMode(onStoreChange) {
  if (typeof window === 'undefined') return () => {}

  const media = [
    '(pointer: coarse)',
    '(hover: none)',
    '(max-width: 600px)',
    '(max-height: 600px)',
  ].map((q) => {
    try {
      return window.matchMedia(q)
    } catch {
      return null
    }
  }).filter(Boolean)

  const onChange = () => onStoreChange()
  window.addEventListener('resize', onChange)
  window.addEventListener('orientationchange', onChange)
  media.forEach((mql) => {
    if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange)
    else if (typeof mql.addListener === 'function') mql.addListener(onChange)
  })

  return () => {
    window.removeEventListener('resize', onChange)
    window.removeEventListener('orientationchange', onChange)
    media.forEach((mql) => {
      if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange)
      else if (typeof mql.removeListener === 'function') mql.removeListener(onChange)
    })
  }
}
