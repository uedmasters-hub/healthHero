import { ONBOARD_LOGO } from '../../lib/onboarding'
import './Auth.css'

export function AuthSplash() {
  return (
    <div className="auth-splash" role="status" aria-label="Health Hero">
      <div className="auth-brand">
        <img src={ONBOARD_LOGO} alt="" className="auth-logo" />
        <p className="auth-wordmark">Health Hero</p>
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
      <p className="auth-trust-badge">
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
            <p className="auth-wordmark">Health Hero</p>
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
    <button type="submit" className="auth-cta" disabled={disabled || busy}>
      {busy ? (
        <span className="auth-cta-busy">
          <span className="auth-spinner" aria-hidden="true" />
          <span>{children}</span>
        </span>
      ) : children}
    </button>
  )
}
