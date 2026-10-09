import { useEffect } from 'react'
import { ONBOARD_LOGO } from '../../lib/onboarding'
import { BRAND_NAME } from '../../lib/brand'
import { clearStoredSession } from '../../features/auth/services/sessionGuard'
import './Auth.css'

/*
  Splash watchdog. Every boot wait is bounded well below this; if a splash is
  still up after it, reload once, and on a repeat stall drop the wedged
  session and open Home as a guest. Shared across splash instances so
  hand-offs between guards don't restart the clock.
*/
const SPLASH_WATCHDOG_MS = 25000
const SPLASH_HANDOFF_MS = 1000
const REPEAT_WINDOW_MS = 90000
const RECOVER_KEY = 'emedicalls.splashRecoveredAt'

let splashCount = 0
let watchdog = null
let releaseTimer = null

function recoverFromStall() {
  let last = 0
  try { last = Number(sessionStorage.getItem(RECOVER_KEY) || 0) } catch { /* private mode */ }
  const repeat = Date.now() - last < REPEAT_WINDOW_MS
  try { sessionStorage.setItem(RECOVER_KEY, String(Date.now())) } catch { /* private mode */ }
  if (repeat) {
    clearStoredSession()
    window.location.replace('/')
    return
  }
  window.location.reload()
}

function useSplashWatchdog(enabled) {
  useEffect(() => {
    if (!enabled) return undefined
    splashCount += 1
    clearTimeout(releaseTimer)
    if (!watchdog) watchdog = setTimeout(recoverFromStall, SPLASH_WATCHDOG_MS)
    return () => {
      splashCount -= 1
      if (splashCount > 0) return
      releaseTimer = setTimeout(() => {
        if (splashCount > 0) return
        clearTimeout(watchdog)
        watchdog = null
      }, SPLASH_HANDOFF_MS)
    }
  }, [enabled])
}

/** `watchdog={false}` only where the splash intentionally sits under a user-driven overlay. */
export function AuthSplash({ watchdog = true }) {
  useSplashWatchdog(watchdog)
  return (
    <div className="auth-splash" role="status" aria-label={BRAND_NAME}>
      <div className="auth-brand">
        <img src={ONBOARD_LOGO} alt="" className="auth-logo" />
        <p className="auth-wordmark">{BRAND_NAME}</p>
      </div>
    </div>
  )
}

export function AuthSkeleton({ fields = 2 }) {
  return (
    <div className="auth-skel" aria-hidden="true">
      <div className="auth-skel-logo shimmer" />
      <div className="auth-skel-title shimmer" />
      <div className="auth-skel-sub shimmer" />
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="auth-skel-field shimmer" />
      ))}
      <div className="auth-skel-cta shimmer" />
    </div>
  )
}

export function AuthTrust() {
  return (
    <div className="auth-trust">
      <p className="auth-trust-badge ds-badge is-primary is-caps">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        HIPAA & GDPR compliant
      </p>
      <p className="auth-trust-copy">
        Your health information is protected with end-to-end encryption and consent-based access.
      </p>
    </div>
  )
}

export function AuthLayout({
  title,
  subtitle,
  children,
  extra,
  footer,
  loading,
  skeletonFields = 2,
  stage = 'default',
}) {
  return (
    <div className="auth-page">
      {loading ? (
        <AuthSkeleton fields={skeletonFields} />
      ) : (
        <div className="auth-sheet">
          <div className="auth-brand is-compact">
            <img src={ONBOARD_LOGO} alt="" className="auth-logo" />
            <p className="auth-wordmark">{BRAND_NAME}</p>
          </div>
          <div className="auth-stage" key={stage} data-stage={stage}>
            <header className="auth-copy">
              <h1 className="auth-title">{title}</h1>
              {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
            </header>
            {children}
            {extra}
            {footer ? <div className="auth-footer">{footer}</div> : null}
          </div>
        </div>
      )}
    </div>
  )
}

export function AuthSubmit({ busy, children, disabled }) {
  return (
    <button type="submit" className="auth-cta ds-btn ds-btn--primary ds-btn--lg ds-btn--block" disabled={disabled || busy}>
      {busy ? (
        <span className="auth-cta-busy">
          <span className="ds-spinner" aria-hidden="true" />
          <span>{children}</span>
        </span>
      ) : children}
    </button>
  )
}
