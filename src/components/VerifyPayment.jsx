import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DoctorCard from './DoctorCard'
import { useBooking } from './BookingContext'
import { useRouteBookingId } from '../booking'
import {
  DEMO_OTP,
  OTP_LENGTH,
  PAYMENT_WINDOW_MS,
  buildPaidBooking,
  clearPaymentSession,
  formatCountdown,
  formatMoney,
  paymentLabelFromSession,
  readPaymentSession,
  secondsRemaining,
} from '../lib/paymentSession'
import { getAppointmentStart } from '../lib/bookingPolicy'
import './VerifyPayment.css'

export default function VerifyPayment() {
  const navigate = useNavigate()
  const location = useLocation()
  const { paymentSession, setPaymentSession, confirmPaid, completeReschedule, focusBooking } = useBooking()
  const bookingId = useRouteBookingId(location.state)
  const [session, setSession] = useState(() => paymentSession || readPaymentSession())
  const [pin, setPin] = useState(() => Array.from({ length: OTP_LENGTH }, () => ''))
  const [now, setNow] = useState(() => Date.now())
  const [status, setStatus] = useState('idle') // idle | processing | error | success
  const [error, setError] = useState('')
  const [resendFlash, setResendFlash] = useState(false)
  const processingRef = useRef(false)

  useEffect(() => {
    if (bookingId) focusBooking?.(bookingId)
  }, [bookingId, focusBooking])

  useEffect(() => {
    if (paymentSession) setSession(paymentSession)
  }, [paymentSession])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!session) return
    if (session.step !== 'verify') {
      setPaymentSession({ ...session, step: 'verify' })
    }
  }, [session, setPaymentSession])

  const remaining = secondsRemaining(session, now)
  const doctor = session?.draftBooking?.doctor
  const date = session?.draftBooking?.date
  const time = session?.draftBooking?.time
  const start = date && time ? getAppointmentStart(date, time) : null
  const when = start
    ? start.toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    : ''

  useEffect(() => {
    if (remaining <= 0 && session && session.status !== 'expired') {
      setStatus('error')
      setError('Session expired. Restart payment to continue.')
      setPaymentSession((prev) => (prev ? { ...prev, status: 'expired' } : prev))
    }
  }, [remaining, session, setPaymentSession])

  if (!session?.draftBooking) {
    return (
      <div className="vp-page">
        <div className="vp-header-bar">
          <button type="button" className="vp-back-btn" onClick={() => navigate('/process-payment')} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="vp-header-title">Verify & Pay</h1>
          <div className="vp-header-spacer" />
        </div>
        <div className="vp-empty">
          <p>No active payment to verify.</p>
          <button type="button" className="app-flow-cta" onClick={() => navigate('/process-payment')}>
            Back to Checkout
          </button>
        </div>
      </div>
    )
  }

  const finishSuccess = () => {
    const id = bookingId || session.bookingEngineId
    if (session.flow === 'reschedule') {
      try {
        completeReschedule?.(session, session.appointmentData)
      } catch {
        clearPaymentSession()
        setPaymentSession(null)
      }
      navigate('/reschedule-success', {
        replace: true,
        state: {
          bookingId: id,
          amount: session.amount,
          appointmentData: session.appointmentData,
        },
      })
      return
    }

    let booking
    try {
      booking = confirmPaid(session)
    } catch {
      booking = buildPaidBooking(session)
      setPaymentSession(null)
      clearPaymentSession()
    }
    setPaymentSession(null)
    navigate('/booking/confirm', {
      replace: true,
      state: {
        bookingId: booking?.engineId || booking?.id || id,
        showSuccess: true,
        paid: true,
      },
    })
  }

  const submitPin = (digits) => {
    if (processingRef.current || remaining <= 0) return
    processingRef.current = true
    setStatus('processing')
    setError('')

    window.setTimeout(() => {
      const code = digits.join('')
      const attempts = (session.otpAttempts || 0) + 1
      if (code !== DEMO_OTP) {
        setStatus('error')
        setError('Incorrect OTP. Use 1234 for this demo, or tap Resend OTP.')
        setPin(Array.from({ length: OTP_LENGTH }, () => ''))
        setPaymentSession((prev) => (prev ? { ...prev, otpAttempts: attempts, lastError: 'otp' } : prev))
        processingRef.current = false
        return
      }

      setStatus('success')
      setPaymentSession((prev) => (prev ? { ...prev, status: 'paid', otpAttempts: attempts } : prev))
      window.setTimeout(finishSuccess, 700)
    }, 900)
  }

  const handleDigit = (digit) => {
    if (status === 'processing' || status === 'success' || remaining <= 0) return
    setPin((prev) => {
      const next = [...prev]
      const emptyIdx = next.findIndex((d) => d === '')
      if (emptyIdx === -1) return prev
      next[emptyIdx] = digit
      if (next.every((d) => d !== '')) submitPin(next)
      return next
    })
    if (status === 'error') {
      setStatus('idle')
      setError('')
    }
  }

  const handleDelete = () => {
    if (status === 'processing' || status === 'success') return
    setPin((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i] !== '') {
          next[i] = ''
          break
        }
      }
      return next
    })
  }

  const handleResend = () => {
    if (remaining <= 0) return
    setPin(Array.from({ length: OTP_LENGTH }, () => ''))
    setStatus('idle')
    setError('')
    setResendFlash(true)
    setPaymentSession((prev) => (
      prev
        ? {
          ...prev,
          expiresAt: Date.now() + PAYMENT_WINDOW_MS,
          lastError: null,
        }
        : prev
    ))
    window.setTimeout(() => setResendFlash(false), 1800)
  }

  const numpad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ]

  return (
    <div className={`vp-page ${status === 'processing' ? 'is-processing' : ''}`}>
      <div className="vp-header-bar">
        <button type="button" className="vp-back-btn" onClick={() => navigate('/process-payment')} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="vp-header-title">Verify & Pay</h1>
        <div className="vp-header-spacer" />
      </div>

      <div className="vp-body">
        <div className="vp-hero-card ds-card">
          <div className="vp-hero-top">
            <DoctorCard doctor={doctor} context="identity" className="vp-hero-doctor" disableNavigate />
            <div className="vp-hero-fee">
              <span className="vp-hero-fee-label">Consult Fee</span>
              <span className="vp-hero-fee-value">{formatMoney(session.amount, session.currency)}</span>
            </div>
          </div>
          <div className="vp-hero-meta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{when}</span>
          </div>
          <div className="vp-hero-method">Paying with {paymentLabelFromSession(session)}</div>
        </div>

        <div className="vp-pin-section">
          <div className="vp-lock-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure payment verification
          </div>
          <h2 className="vp-pin-title">Enter OTP to pay</h2>
          <div className="vp-pin-boxes" aria-label="OTP input">
            {pin.map((digit, index) => {
              const filled = digit !== ''
              const focused = !filled && pin.findIndex((d) => d === '') === index
              return (
                <div
                  key={`otp-${index}`}
                  className={`vp-pin-box ${filled ? 'is-filled' : ''} ${focused ? 'is-focus' : ''} ${status === 'error' ? 'is-error' : ''}`}
                >
                  {filled ? <span className="vp-pin-mask" /> : null}
                </div>
              )
            })}
          </div>
          <p className="vp-pin-note">OTP is verified securely before your booking is confirmed. Demo code: 1234</p>

          <div className={`vp-timer-badge ${remaining <= 60 ? 'is-urgent' : ''}`}>
            <span className="vp-timer-dot" />
            {remaining > 0 ? `${formatCountdown(remaining)} remaining` : 'Expired'}
          </div>

          {error ? <div className="vp-error" role="alert">{error}</div> : null}
          {status === 'processing' ? <div className="vp-processing">Verifying payment…</div> : null}
          {status === 'success' ? <div className="vp-success">Payment successful</div> : null}
          {resendFlash ? <div className="vp-success">A new OTP was sent</div> : null}

          <button type="button" className="vp-help-link" onClick={handleResend} disabled={remaining <= 0 || status === 'processing'}>
            Resend OTP
          </button>
        </div>
      </div>

      <div className="vp-keypad" aria-label="Number pad">
        {numpad.map((row) => (
          <div key={row.join('-')} className="vp-keypad-row">
            {row.map((key) => {
              if (key === '') return <div key="blank" className="vp-key is-blank" />
              if (key === 'del') {
                return (
                  <button key="del" type="button" className="vp-key is-action" onClick={handleDelete} aria-label="Delete">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 12l4-4m-4 4l-4-4m4 4l4 4m-4-4l-4 4" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </button>
                )
              }
              return (
                <button key={key} type="button" className="vp-key" onClick={() => handleDigit(key)}>
                  <span className="vp-key-num">{key}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
