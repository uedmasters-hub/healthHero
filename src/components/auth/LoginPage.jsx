import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AUTH_ERROR, useUser, validateLoginFields } from '../../user'
import AuthField from './AuthField'
import { AuthLayout, AuthSubmit } from './AuthScreen'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useUser()
  const [ready, setReady] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 280)
    return () => window.clearTimeout(id)
  }, [])

  const fieldErrors = validateLoginFields({ identifier, password })
  const show = (key) => (submitted || touched[key]) ? fieldErrors[key] : ''

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    setFormError('')
    if (fieldErrors.identifier || fieldErrors.password) return
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
      title="Welcome back"
      subtitle="Sign in to continue your care."
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
          onBlur={() => setTouched((prev) => ({ ...prev, identifier: true }))}
          error={show('identifier')}
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
          onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          error={show('password')}
          autoComplete="current-password"
          disabled={busy}
          placeholder="Enter your password"
        />
        <AuthSubmit busy={busy} disabled={busy}>
          {busy ? 'Signing in…' : 'Continue'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  )
}
