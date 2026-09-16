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

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  loading,
  skeletonFields = 2,
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
          <header className="auth-copy">
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
          </header>
          {children}
          {footer ? <div className="auth-footer">{footer}</div> : null}
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
