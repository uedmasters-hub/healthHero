import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AUTH_ERROR, useUser, validateRegisterFields } from '../../user'
import AuthField from './AuthField'
import { AuthLayout, AuthSubmit } from './AuthScreen'
import useProgressiveAuth from './useProgressiveAuth'

const REGISTER_ORDER = ['name', 'email', 'phone', 'password', 'confirm']
const REGISTER_IDS = {
  name: 'register-name',
  email: 'register-email',
  phone: 'register-phone',
  password: 'register-password',
  confirm: 'register-confirm',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useUser()
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const fieldErrors = validateRegisterFields({ name, email, phone, password, confirm })
  const { begin, errorFor } = useProgressiveAuth(REGISTER_ORDER, REGISTER_IDS, fieldErrors)

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
      const result = await register({ name, email, phone, password })
      if (!result.ok) {
        setFormError(result.error || AUTH_ERROR.EXISTS)
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
      skeletonFields={5}
      stage="register"
      title="Create your account"
      subtitle="A few details to keep your care in one place."
      footer={(
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      )}
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError ? <p className="auth-banner" role="alert">{formError}</p> : null}
        <AuthField
          id="register-name"
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errorFor('name')}
          autoComplete="name"
          disabled={busy}
          placeholder="Your name"
        />
        <AuthField
          id="register-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errorFor('email')}
          autoComplete="email"
          inputMode="email"
          disabled={busy}
          placeholder="name@email.com"
        />
        <AuthField
          id="register-phone"
          label="Mobile number"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
          error={errorFor('phone')}
          autoComplete="tel"
          inputMode="numeric"
          maxLength={10}
          disabled={busy}
          placeholder="10-digit mobile number"
        />
        <AuthField
          id="register-password"
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errorFor('password')}
          hint={!errorFor('password') ? 'At least 8 characters with a letter and a number' : ''}
          autoComplete="new-password"
          disabled={busy}
          placeholder="Create a password"
        />
        <AuthField
          id="register-confirm"
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errorFor('confirm')}
          autoComplete="new-password"
          disabled={busy}
          placeholder="Re-enter password"
        />
        <AuthSubmit busy={busy} disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </AuthSubmit>
      </form>
    </AuthLayout>
  )
}
