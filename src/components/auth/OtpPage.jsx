import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AUTH_ERROR, isValidEmail, normalizeEmail } from '../../user'
import { useAuth } from '../../features/auth/hooks/useAuth'
import AuthField from './AuthField'
import { AuthLayout, AuthSubmit } from './AuthScreen'

const OTP_LENGTH = 6

export default function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmailOtp, sendEmailOtp } = useAuth()
  const email = normalizeEmail(location.state?.email || '')
  const [ready, setReady] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (!email || !isValidEmail(email)) {
      navigate('/login', { replace: true })
      return undefined
    }
    const id = window.setTimeout(() => setReady(true), 220)
    return () => window.clearTimeout(id)
  }, [email, navigate])

  useEffect(() => {
    if (!ready) return undefined
    const id = window.setTimeout(() => {
      document.getElementById('otp-code')?.focus()
    }, 40)
    return () => window.clearTimeout(id)
  }, [ready])

  const onVerify = async (event) => {
    event.preventDefault()
    setFormError('')
    setInfo('')
    const token = String(code || '').replace(/\D/g, '')
    if (token.length !== OTP_LENGTH) {
      setFormError(AUTH_ERROR.OTP_INVALID)
      return
    }
    setBusy(true)
    try {
      const result = await verifyEmailOtp(email, token)
      if (!result.ok) {
        setFormError(result.error || AUTH_ERROR.OTP_INVALID)
        return
      }
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const onResend = async () => {
    setFormError('')
    setInfo('')
    setResendBusy(true)
    try {
      const result = await sendEmailOtp(email)
      if (!result.ok) {
        setFormError(result.error || AUTH_ERROR.GENERIC)
        return
      }
      setInfo('A new code is on its way.')
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <AuthLayout
      loading={!ready}
      stage="otp"
      title="Enter your code"
      subtitle={email ? `We sent a 6-digit code to ${email}.` : 'Check your email for a 6-digit code.'}
      footer={(
        <>
          Wrong email? <Link to="/login">Go back</Link>
        </>
      )}
    >
      <form className="auth-form" onSubmit={onVerify} noValidate>
        {formError ? <p className="auth-banner" role="alert">{formError}</p> : null}
        {info ? <p className="auth-banner auth-banner--info" role="status">{info}</p> : null}
        <AuthField
          id="otp-code"
          label="Verification code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => {
            const next = String(event.target.value || '').replace(/\D/g, '').slice(0, OTP_LENGTH)
            setCode(next)
          }}
          disabled={busy}
          placeholder="••••••"
          maxLength={OTP_LENGTH}
        />
        <AuthSubmit busy={busy} disabled={busy || code.length !== OTP_LENGTH}>
          {busy ? 'Verifying…' : 'Verify code'}
        </AuthSubmit>
        <div className="auth-otp-resend">
          <button
            type="button"
            className="auth-text-btn"
            onClick={onResend}
            disabled={busy || resendBusy}
          >
            {resendBusy ? 'Sending…' : 'Resend code'}
          </button>
          <p className="auth-otp-hint">Magic Link in the email also works.</p>
        </div>
      </form>
    </AuthLayout>
  )
}
