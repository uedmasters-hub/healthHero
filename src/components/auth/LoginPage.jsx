import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AUTH_ERROR, isValidEmail, normalizeEmail, validateLoginFields } from '../../user'
import { useAuth } from '../../features/auth/hooks/useAuth'
import OAuthButtons from '../../features/auth/components/OAuthButtons'
import AuthField from './AuthField'
import { AuthLayout, AuthSubmit, AuthTrust } from './AuthScreen'
import useProgressiveAuth from './useProgressiveAuth'

const OTP_ORDER = ['identifier']
const OTP_IDS = { identifier: 'login-identifier' }
const PASSWORD_ORDER = ['identifier', 'password']
const PASSWORD_IDS = { identifier: 'login-identifier', password: 'login-password' }
const APPLE_ENABLED = import.meta.env.VITE_APPLE_SIGNIN_ENABLED === 'true'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    signInWithPassword,
    sendEmailOtp,
    googleSignIn,
    appleSignIn,
    bootError,
  } = useAuth()
  const [ready, setReady] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(() => (
    String(location.state?.authCallbackError || '')
  ))

  const fieldErrors = usePassword
    ? validateLoginFields({ identifier, password })
    : {
      identifier: !String(identifier || '').trim()
        ? AUTH_ERROR.IDENTIFIER
        : (!isValidEmail(identifier) ? AUTH_ERROR.EMAIL : undefined),
    }
  const { begin, errorFor } = useProgressiveAuth(
    usePassword ? PASSWORD_ORDER : OTP_ORDER,
    usePassword ? PASSWORD_IDS : OTP_IDS,
    fieldErrors,
  )

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
      if (usePassword) {
        const result = await signInWithPassword(identifier, password)
        if (!result.ok) {
          if (result.code === 'email_not_confirmed') {
            navigate('/verify', { replace: true, state: { email: identifier } })
            return
          }
          setFormError(result.error || AUTH_ERROR.INVALID)
          return
        }
        navigate('/', { replace: true })
        return
      }

      const email = normalizeEmail(identifier)
      const result = await sendEmailOtp(email)
      if (!result.ok) {
        setFormError(result.error || AUTH_ERROR.GENERIC)
        return
      }
      navigate('/otp', { replace: true, state: { email } })
    } finally {
      setBusy(false)
    }
  }

  const onGoogle = async () => {
    setFormError('')
    setBusy(true)
    const result = await googleSignIn()
    if (!result.ok) {
      setBusy(false)
      setFormError(result.error || AUTH_ERROR.OAUTH_FAILED)
    }
  }

  const onApple = async () => {
    if (!APPLE_ENABLED) {
      setFormError(AUTH_ERROR.APPLE_PENDING)
      return
    }
    setFormError('')
    setBusy(true)
    const result = await appleSignIn()
    if (!result.ok) {
      setBusy(false)
      setFormError(result.error || AUTH_ERROR.APPLE_PENDING)
    }
  }

  return (
    <AuthLayout
      loading={!ready}
      stage={usePassword ? 'login-password' : 'login-otp'}
      title="Welcome back"
      subtitle={usePassword
        ? 'Sign in with your password to continue.'
        : 'Enter your email — we will send a one-time code.'}
      extra={<AuthTrust />}
      footer={(
        <>
          New to Health Hero? <Link to="/register">Create account</Link>
        </>
      )}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError || bootError ? <p className="auth-banner" role="alert">{formError || bootError}</p> : null}
        <AuthField
          id="login-identifier"
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
        {usePassword ? (
          <AuthField
            id="login-password"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errorFor('password')}
            autoComplete="current-password"
            disabled={busy}
            placeholder="Enter your password"
            labelAction={(
              <Link to="/forgot" className="auth-field-link" state={{ identifier }}>
                Forgot password?
              </Link>
            )}
          />
        ) : null}
        <AuthSubmit busy={busy} disabled={busy}>
          {busy
            ? (usePassword ? 'Signing in…' : 'Sending code…')
            : (usePassword ? 'Sign in' : 'Continue')}
        </AuthSubmit>
        <p className="auth-mode-switch">
          <button
            type="button"
            className="auth-text-btn"
            disabled={busy}
            onClick={() => {
              setFormError('')
              setUsePassword((v) => !v)
            }}
          >
            {usePassword ? 'Use email code instead' : 'Sign in with password'}
          </button>
        </p>
        <OAuthButtons onGoogle={onGoogle} onApple={onApple} busy={busy} appleReady={APPLE_ENABLED} />
      </form>
    </AuthLayout>
  )
}
