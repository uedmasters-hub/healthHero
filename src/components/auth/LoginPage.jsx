import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AUTH_ERROR, useUser, validateLoginFields } from '../../user'
import AuthField from './AuthField'
import { AuthLayout, AuthSubmit, AuthTrust } from './AuthScreen'
import useProgressiveAuth from './useProgressiveAuth'

const LOGIN_ORDER = ['identifier', 'password']
const LOGIN_IDS = { identifier: 'login-identifier', password: 'login-password' }

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useUser()
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
      const result = await login(identifier, password)
      if (!result.ok) {
        setFormError(result.error || AUTH_ERROR.INVALID)
        return
      }
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
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
        {formError ? <p className="auth-banner" role="alert">{formError}</p> : null}
        <AuthField
          id="login-identifier"
          label="Email or mobile number"
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
      </form>
    </AuthLayout>
  )
}
