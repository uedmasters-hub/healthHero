import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { validateLoginFields } from '../../user'
import AuthField from './AuthField'
import { AuthLayout, AuthSubmit, AuthTrust } from './AuthScreen'
import useProgressiveAuth from './useProgressiveAuth'

const FORGOT_ORDER = ['identifier']
const FORGOT_IDS = { identifier: 'reset-identifier' }

export default function ForgotPasswordPage() {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [identifier, setIdentifier] = useState(() => String(location.state?.identifier || ''))
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const sendTimer = useRef(null)

  const identifierError = validateLoginFields({ identifier, password: 'ok' }).identifier
  const fieldErrors = identifierError ? { identifier: identifierError } : {}
  const { begin, errorFor } = useProgressiveAuth(FORGOT_ORDER, FORGOT_IDS, fieldErrors)

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 280)
    return () => {
      window.clearTimeout(id)
      if (sendTimer.current) window.clearTimeout(sendTimer.current)
    }
  }, [])

  const onSubmit = (event) => {
    event.preventDefault()
    if (begin()) return
    setBusy(true)
    sendTimer.current = window.setTimeout(() => {
      setBusy(false)
      setSent(true)
    }, 420)
  }

  return (
    <AuthLayout
      loading={!ready}
      stage={sent ? 'sent' : 'forgot'}
      title={sent ? 'Check your inbox' : 'Forgot password?'}
      subtitle={sent
        ? 'If an account matches that email or mobile number, you’ll receive a reset link shortly.'
        : 'Enter the email or mobile number on your account.'}
      extra={<AuthTrust />}
      footer={(
        <Link to="/login" className="auth-text-btn">Back to sign in</Link>
      )}
    >
      {sent ? null : (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <AuthField
            id="reset-identifier"
            label="Email or mobile number"
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
