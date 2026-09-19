/**
 * @file src/features/auth/components/OAuthButtons.jsx
 * Google Sign-In plus prepared Apple Sign-In. Apple does not require
 * credentials in this environment; failures map to a pending-setup message.
 */
export default function OAuthButtons({
  onGoogle,
  onApple,
  busy,
  appleReady = false,
}) {
  return (
    <div className="auth-oauth">
      <div className="auth-oauth-rule" role="separator">
        <span>or continue with</span>
      </div>
      <div className="auth-oauth-row">
        <button type="button" className="auth-oauth-btn" onClick={onGoogle} disabled={busy}>
          <GoogleMark />
          Google
        </button>
        <button
          type="button"
          className="auth-oauth-btn"
          onClick={onApple}
          disabled={busy || !appleReady}
          title={appleReady ? 'Continue with Apple' : 'Apple Sign-In will be available once credentials are configured'}
        >
          <AppleMark />
          Apple
        </button>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.4 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.4-2.4C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1-.2-1.5H12z" />
      <path fill="#34A853" d="M3.9 7.4 6.9 9.6C7.7 7.6 9.7 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.4-2.4C16.7 3.7 14.6 2.8 12 2.8 8.3 2.8 5.1 4.9 3.9 7.4z" />
      <path fill="#FBBC05" d="M12 21.2c2.5 0 4.6-.8 6.1-2.2l-2.8-2.2c-.8.6-1.9 1-3.3 1-2.6 0-4.8-1.7-5.6-4.1l-3 2.3C5 19.1 8.2 21.2 12 21.2z" />
      <path fill="#4285F4" d="M20.8 12.2c0-.6-.1-1-.2-1.5H12v3.6h5.1c-.3 1.4-1.2 2.4-2.4 3.1l2.8 2.2c1.9-1.8 3.3-4.4 3.3-7.4z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-.1 2.9-2.3c1-.1.4-1.1 1.8-2.3-1.8-.7-2.1-2.2-2.1-4.1zM14.6 6.3c.6-.8 1.1-1.9.9-3-1 .1-2.1.7-2.8 1.5-.6.7-1.2 1.8-.9 2.9 1.1.1 2.1-.6 2.8-1.4z" />
    </svg>
  )
}
