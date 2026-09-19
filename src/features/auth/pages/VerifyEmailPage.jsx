/**
 * @file src/features/auth/pages/VerifyEmailPage.jsx
 * Email confirmation waiting room. Completes automatically after the
 * Supabase redirect; otherwise the patient can resend the link.
 */
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AUTH_ERROR } from '../../../user'
import { AuthLayout, AuthSubmit, AuthTrust } from '../../../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, resendEmail, user } = useAuth()
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const email = String(location.state?.email || user?.email || '')

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 280)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const onResend = async (event) => {
    event.preventDefault()
    if (!email) {
      setError(AUTH_ERROR.EMAIL)
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await resendEmail(email)
      if (!result.ok) {
        setError(result.error || AUTH_ERROR.GENERIC)
        return
      }
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      loading={!ready}
      stage="verify"
      title="Verify your email"
      subtitle={email
        ? `We sent a confirmation link to ${email}. Open it to activate your Health Hero account.`
        : 'Open the confirmation link we sent to activate your Health Hero account.'}
      extra={<AuthTrust />}
      footer={<Link to="/login" className="auth-text-btn">Back to sign in</Link>}
    >
      <form className="auth-form" onSubmit={onResend}>
        {error ? <p className="auth-banner" role="alert">{error}</p> : null}
        {sent ? <p className="auth-banner is-success" role="status">A new confirmation email is on its way.</p> : null}
        <AuthSubmit busy={busy} disabled={busy || !email}>
          {busy ? 'Sending…' : 'Resend confirmation'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  )
}
