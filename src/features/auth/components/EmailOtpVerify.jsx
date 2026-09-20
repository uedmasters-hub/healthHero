/**
 * Reusable email OTP verification experience.
 * Supports signup verification and email OTP login via props.
 * Stays neutral until verifyOtp is attempted — no boot/session expiry noise.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AUTH_ERROR } from '../../../user'
import { AuthLayout, AuthTrust } from '../../../components/auth/AuthScreen'
import OtpBoxes, { maskEmail } from './OtpBoxes'

const OTP_LENGTH = 6
const DEFAULT_COUNTDOWN = 60

export default function EmailOtpVerify({
  email,
  title = 'Verify your email',
  supportingText = 'Enter the 6-digit code sent to your email',
  stage = 'verify-otp',
  loading = false,
  onVerify,
  onResend,
  onChangeEmail,
  changeEmailLabel = 'Change email',
  /** Absolute confirmation URL from the email flow — never /login. */
  confirmationUrl = '',
  openAppLabel = 'Open eMedicalls',
  countdownSeconds = DEFAULT_COUNTDOWN,
  footer,
}) {
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds)
  const [resendBusy, setResendBusy] = useState(false)
  const [toast, setToast] = useState('')
  const verifyLock = useRef(false)
  const toastTimer = useRef(0)
  const autoResendLock = useRef(false)

  const showOpenApp = Boolean(confirmationUrl)

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  useEffect(() => {
    if (secondsLeft <= 0) return undefined
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [secondsLeft])

  const triggerShake = useCallback(() => {
    setShaking(true)
    window.setTimeout(() => setShaking(false), 520)
  }, [])

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2800)
  }, [])

  const requestResend = useCallback(async ({ fromExpiry = false } = {}) => {
    if (resendBusy || verifying) return { ok: false }
    if (!fromExpiry && secondsLeft > 0) return { ok: false }
    setResendBusy(true)
    try {
      const result = await onResend?.()
      if (!result?.ok) {
        if (!fromExpiry) {
          setError(result?.error || AUTH_ERROR.GENERIC)
        }
        return result || { ok: false }
      }
      setError('')
      setCode('')
      setSecondsLeft(countdownSeconds)
      showToast('Code sent')
      return { ok: true }
    } finally {
      setResendBusy(false)
      verifyLock.current = false
    }
  }, [resendBusy, verifying, secondsLeft, onResend, countdownSeconds, showToast])

  const handleComplete = useCallback(async (token) => {
    if (verifyLock.current || verifying) return
    verifyLock.current = true
    setVerifying(true)
    setError('')
    try {
      const result = await onVerify?.(token)

      if (result?.ok) {
        // Parent navigates; keep verifying state for a seamless handoff.
        return
      }

      const reason = result?.reason || 'invalid'
      setCode('')
      triggerShake()

      if (reason === 'expired') {
        setError(result?.error || AUTH_ERROR.OTP_EXPIRED)
        setSecondsLeft(0)
        setVerifying(false)
        verifyLock.current = false
        if (!autoResendLock.current) {
          autoResendLock.current = true
          await requestResend({ fromExpiry: true })
          autoResendLock.current = false
        }
        return
      }

      setError(result?.error || AUTH_ERROR.OTP_INVALID)
      verifyLock.current = false
      setVerifying(false)
    } catch {
      setError(AUTH_ERROR.OTP_INVALID)
      triggerShake()
      setCode('')
      verifyLock.current = false
      setVerifying(false)
    }
  }, [onVerify, verifying, triggerShake, requestResend])

  const handleResend = async () => {
    setError('')
    await requestResend({ fromExpiry: false })
  }

  const masked = email ? maskEmail(email) : ''

  return (
    <AuthLayout
      loading={loading}
      stage={stage}
      title={title}
      subtitle={supportingText}
      skeletonFields={1}
      extra={<AuthTrust />}
      footer={footer}
    >
      <div className={`auth-otp-panel ${verifying ? 'is-verifying' : ''}`}>
        {email ? (
          <div className="auth-otp-email-row">
            <p className="auth-otp-email" title={email}>{masked}</p>
            {onChangeEmail ? (
              <button
                type="button"
                className="auth-text-btn auth-otp-change"
                onClick={onChangeEmail}
                disabled={verifying}
              >
                {changeEmailLabel}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="auth-otp-field">
          <OtpBoxes
            value={code}
            length={OTP_LENGTH}
            disabled={verifying || resendBusy}
            invalid={Boolean(error)}
            shaking={shaking}
            onChange={(next) => {
              setCode(next)
              if (error) setError('')
            }}
            onComplete={handleComplete}
          />
          {verifying ? (
            <div className="auth-otp-verifying" role="status" aria-live="polite">
              <span className="auth-spinner auth-spinner--dark" aria-hidden="true" />
              <span>Verifying…</span>
            </div>
          ) : null}
          {error && !verifying ? (
            <p className="auth-otp-error" role="alert">{error}</p>
          ) : null}
        </div>

        <div className="auth-otp-resend">
          {secondsLeft > 0 ? (
            <p className="auth-otp-countdown" aria-live="polite">
              Resend code in <span>{secondsLeft}s</span>
            </p>
          ) : (
            <button
              type="button"
              className="auth-text-btn"
              onClick={handleResend}
              disabled={resendBusy || verifying}
            >
              {resendBusy ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>

        {showOpenApp ? (
          <a
            className="auth-otp-open-app"
            href={confirmationUrl}
            target="_blank"
            rel="noreferrer"
          >
            {openAppLabel}
          </a>
        ) : null}
      </div>

      {toast ? (
        <div className="auth-otp-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </AuthLayout>
  )
}

export { maskEmail, OTP_LENGTH }
