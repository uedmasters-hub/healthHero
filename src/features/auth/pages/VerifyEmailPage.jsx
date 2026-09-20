/**
 * Signup email OTP verification — primary in-app experience.
 * Magic Link / confirmationUrl is a secondary browser fallback only when provided.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { isValidEmail, normalizeEmail } from '../../../user'
import { useAuth } from '../hooks/useAuth'
import EmailOtpVerify from '../components/EmailOtpVerify'

function resolveConfirmationUrl(stateUrl, queryUrl) {
  const raw = String(stateUrl || queryUrl || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    // Never treat login / register as a confirmation deep link.
    if (/\/(login|register)\/?$/i.test(url.pathname)) return ''
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return url.toString()
  } catch {
    return ''
  }
}

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { isAuthenticated, verifyEmailOtp, resendEmail, user } = useAuth()
  const [ready, setReady] = useState(false)

  const email = normalizeEmail(location.state?.email || user?.email || '')
  const registerDraft = location.state?.registerDraft || null
  const confirmationUrl = useMemo(
    () => resolveConfirmationUrl(
      location.state?.confirmationUrl,
      params.get('confirmation_url') || params.get('confirmationUrl'),
    ),
    [location.state?.confirmationUrl, params],
  )

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 240)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const onVerify = useCallback(async (token) => {
    if (!email || !isValidEmail(email)) {
      return { ok: false, error: 'Enter a valid email address.', reason: 'other' }
    }
    const result = await verifyEmailOtp(email, token, { type: 'signup' })
    if (result.ok) {
      navigate('/', { replace: true })
    }
    return result
  }, [email, verifyEmailOtp, navigate])

  const onResend = useCallback(async () => {
    if (!email) return { ok: false, error: 'Enter a valid email address.' }
    return resendEmail(email)
  }, [email, resendEmail])

  const onChangeEmail = useCallback(() => {
    navigate('/register', {
      replace: true,
      state: registerDraft ? { registerDraft } : { registerDraft: { email } },
    })
  }, [navigate, registerDraft, email])

  return (
    <EmailOtpVerify
      email={email}
      title="Verify your email"
      supportingText="Enter the 6-digit code sent to your email"
      stage="verify"
      loading={!ready}
      onVerify={onVerify}
      onResend={onResend}
      onChangeEmail={onChangeEmail}
      confirmationUrl={confirmationUrl}
      openAppLabel="Open eMedicalls"
      footer={<Link to="/login" className="auth-text-btn">Back to sign in</Link>}
    />
  )
}
