import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AUTH_ERROR, validateLoginFields } from '../../user'
import { useAuth } from '../../features/auth/hooks/useAuth'
import AuthField from './AuthField'
import { AuthLayout, AuthSubmit, AuthTrust } from './AuthScreen'
import useProgressiveAuth from './useProgressiveAuth'

const FORGOT_ORDER = ['identifier']
const FORGOT_IDS = { identifier: 'reset-identifier' }

export default function ForgotPasswordPage() {
  const location = useLocation()
  const { forgotPassword } = useAuth()
  const [ready, setReady] = useState(false)
  const [identifier, setIdentifier] = useState(() => String(location.state?.identifier || ''))
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState('')

  const identifierError = validateLoginFields({ identifier, password: 'ok' }).identifier
  const fieldErrors = identifierError ? { identifier: identifierError } : {}
  const { begin, errorFor } = useProgressiveAuth(FORGOT_ORDER, FORGOT_IDS, fieldErrors)

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 280)
    return () => window.clearTimeout(id)
  }, [])

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (begin()) return
    setBusy(true)
    try {
      const result = await forgotPassword(identifier)
      if (!result.ok) {
        setFormError(result.error || AUTH_ERROR.GENERIC)
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
      stage={sent ? 'sent' : 'forgot'}
      title={sent ? 'Check your inbox' : 'Forgot password?'}
      subtitle={sent
        ? AUTH_ERROR.RESET_SENT
        : 'Enter the email on your account.'}
      extra={<AuthTrust />}
      footer={(
        <Link to="/login" className="auth-text-btn">Back to sign in</Link>
      )}
    >
      {sent ? null : (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {formError ? <p className="auth-banner" role="alert">{formError}</p> : null}
          <AuthField
            id="reset-identifier"
            label="Email"
            type="email"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            error={errorFor('identifier')}
            autoComplete="username"
            inputMode="email"
            disabled={busy}
            placeholder="name@email.com"
          />
          <AuthSubmit busy={busy} disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </AuthSubmit>
        </form>
      )}
    </AuthLayout>
  )
}
