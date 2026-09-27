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
import { AppBar, Badge, Button, Callout, EmptyState, Icon } from './ui'
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
    ? start.toLocaleString('en-NP', {
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
        <AppBar title="Verify & Pay" onBack={() => navigate('/process-payment')} as="div" />
        <EmptyState
          message="No active payment to verify."
          action={(
            <Button onClick={() => navigate('/process-payment')}>
              Back to Checkout
            </Button>
          )}
        />
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
      <AppBar title="Verify & Pay" onBack={() => navigate('/process-payment')} as="div" />

      <div className="vp-body">
        <div className="vp-hero-card ds-card is-padded">
          <div className="vp-hero-top">
            <DoctorCard doctor={doctor} context="identity" className="vp-hero-doctor" disableNavigate />
            <div className="vp-hero-fee">
              <span className="vp-hero-fee-label">Consult Fee</span>
              <span className="vp-hero-fee-value">{formatMoney(session.amount, session.currency)}</span>
            </div>
          </div>
          <div className="vp-hero-meta ds-card__section">
            <Icon.Calendar />
            <span>{when}</span>
          </div>
          <div className="vp-hero-method">Paying with {paymentLabelFromSession(session)}</div>
        </div>

        <div className="vp-pin-section">
          <p className="vp-lock-icon ds-overline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure payment verification
          </p>
          <h2 className="vp-pin-title">Enter OTP to pay</h2>
          <div className="vp-pin-boxes ds-otp" aria-label="OTP input">
            {pin.map((digit, index) => {
              const filled = digit !== ''
              const focused = !filled && pin.findIndex((d) => d === '') === index
              return (
                <div
                  key={`otp-${index}`}
                  className={`ds-otp__box ${filled ? 'is-filled' : ''} ${focused ? 'is-focus' : ''} ${status === 'error' ? 'is-error' : ''}`}
                >
                  {filled ? <span className="ds-otp__dot" /> : null}
                </div>
              )
            })}
          </div>
          <p className="vp-pin-note">OTP is verified securely before your booking is confirmed. Demo code: 1234</p>

          <Badge tone="danger" className={`vp-timer-badge ${remaining <= 60 ? 'is-urgent' : ''}`}>
            <span className="vp-timer-dot" />
            {remaining > 0 ? `${formatCountdown(remaining)} remaining` : 'Expired'}
          </Badge>

          {error ? <Callout tone="danger" role="alert" className="vp-error">{error}</Callout> : null}
          {status === 'processing' ? <div className="vp-processing">Verifying payment…</div> : null}
          {status === 'success' ? <div className="vp-success">Payment successful</div> : null}
          {resendFlash ? <div className="vp-success">A new OTP was sent</div> : null}

          <Button variant="text" onClick={handleResend} disabled={remaining <= 0 || status === 'processing'}>
            Resend OTP
          </Button>
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                      <path d="m18 9-6 6M12 9l6 6" />
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
