import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AUTH_ERROR, validateRegisterFields } from '../../user'
import { useAuth } from '../../features/auth/hooks/useAuth'
import OAuthButtons from '../../features/auth/components/OAuthButtons'
import PasswordStrength from '../../features/auth/components/PasswordStrength'
import AuthField from './AuthField'
import { AuthLayout, AuthSubmit } from './AuthScreen'
import useProgressiveAuth from './useProgressiveAuth'
import { PhoneInput, toE164 } from '../PhoneInput'

const REGISTER_ORDER = ['name', 'email', 'phone', 'password', 'confirm']
const REGISTER_IDS = {
  name: 'register-name',
  email: 'register-email',
  phone: 'register-phone',
  password: 'register-password',
  confirm: 'register-confirm',
}
const APPLE_ENABLED = import.meta.env.VITE_APPLE_SIGNIN_ENABLED === 'true'

function draftFromState(state) {
  const draft = state?.registerDraft
  if (!draft || typeof draft !== 'object') return null
  return {
    name: String(draft.name || ''),
    email: String(draft.email || ''),
    phone: String(draft.phone || ''),
    phoneCountry: String(draft.phoneCountry || '+91'),
    password: String(draft.password || ''),
    confirm: String(draft.confirm || ''),
  }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signUp, googleSignIn, appleSignIn } = useAuth()
  const restored = draftFromState(location.state)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState(() => restored?.name || '')
  const [email, setEmail] = useState(() => restored?.email || '')
  const [phone, setPhone] = useState(() => restored?.phone || '')
  const [phoneCountry, setPhoneCountry] = useState(() => restored?.phoneCountry || '+91')
  const [password, setPassword] = useState(() => restored?.password || '')
  const [confirm, setConfirm] = useState(() => restored?.confirm || '')
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
      const result = await signUp({ name, email, phone: toE164(phoneCountry, phone), password })
      if (!result.ok) {
        setFormError(result.error || AUTH_ERROR.EXISTS)
        return
      }
      if (result.needsVerification) {
        navigate('/verify', {
          replace: true,
          state: {
            email,
            registerDraft: { name, email, phone, phoneCountry, password, confirm },
          },
        })
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
        <PhoneInput
          label="Mobile number"
          value={phone}
          country={phoneCountry}
          onCountryChange={setPhoneCountry}
          onChange={(val) => setPhone(val)}
          placeholder="98765 43210"
          disabled={busy}
          error={errorFor('phone')}
          required
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
        <PasswordStrength value={password} />
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
        <OAuthButtons onGoogle={onGoogle} onApple={onApple} busy={busy} appleReady={APPLE_ENABLED} />
      </form>
    </AuthLayout>
  )
}
