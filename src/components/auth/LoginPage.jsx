import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AUTH_ERROR, validateLoginFields } from '../../user'
import { useAuth } from '../../features/auth/hooks/useAuth'
import OAuthButtons from '../../features/auth/components/OAuthButtons'
import AuthField from './AuthField'
import { AuthLayout, AuthSubmit, AuthTrust } from './AuthScreen'
import useProgressiveAuth from './useProgressiveAuth'

const LOGIN_ORDER = ['identifier', 'password']
const LOGIN_IDS = { identifier: 'login-identifier', password: 'login-password' }
const APPLE_ENABLED = import.meta.env.VITE_APPLE_SIGNIN_ENABLED === 'true'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signInWithPassword, googleSignIn, appleSignIn, bootError } = useAuth()
  const [ready, setReady] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const fieldErrors = validateLoginFields({ identifier, password })
  const { begin, errorFor } = useProgressiveAuth(LOGIN_ORDER, LOGIN_IDS, fieldErrors)

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
      stage="login"
      title="Welcome back"
      subtitle="Sign in to continue your care."
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
        <AuthSubmit busy={busy} disabled={busy}>
          {busy ? 'Signing in…' : 'Continue'}
        </AuthSubmit>
        <OAuthButtons onGoogle={onGoogle} onApple={onApple} busy={busy} appleReady={APPLE_ENABLED} />
      </form>
    </AuthLayout>
  )
}
