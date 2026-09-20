import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DoctorCard from './DoctorCard'
import { BookingReveal, useBookingReveal } from './BookingReveal'
import StickyFooterCta from './StickyFooterCta'
import AppBottomSheet from './AppBottomSheet'
import { SheetPortal, useAppSheet, useTransition } from './PageTransition'
import { useBooking } from './BookingContext'
import { useSharedHero } from './SharedHero'
import { useBookingById } from '../booking'
import { getAppointmentStart } from '../lib/bookingPolicy'
import {
  NET_BANKS,
  PAYMENT_METHODS,
  UPI_APPS,
  canProceedCheckout,
  clearPaymentSession,
  createPaymentSession,
  formatCardNumber,
  formatCountdown,
  formatExpiry,
  formatMoney,
  isValidUpiId,
  proceedCtaLabel,
  readPaymentSession,
  refreshPaymentSession,
  resolveMethodView,
  secondsRemaining,
  validateCardDraft,
} from '../lib/paymentSession'
import './ProcessPayment.css'

function PaymentDoctorSummary({ doctor, date, time, amount, currency, orderId, ready, locked }) {
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
    : `${date?.day || ''} ${time || ''}`.trim()

  return (
    <div className={`pay-hero-card ds-card ${ready ? '' : 'is-pending'} ${locked ? 'is-locked' : ''}`}>
      <div className="pay-hero-top">
        <DoctorCard doctor={doctor} context="identity" className="pay-hero-doctor" disableNavigate />
        <div className="pay-hero-fee">
          <span className="pay-hero-fee-label">Consult Fee</span>
          <span className="pay-hero-fee-value">{formatMoney(amount, currency)}</span>
        </div>
      </div>

      <div className="pay-hero-amount-block">
        <div className="pay-amount-label">Amount to pay</div>
        <div className="pay-amount-value">{formatMoney(amount, currency)}</div>
      </div>

      <div className="pay-hero-footer">
        <div className="pay-hero-when">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{when}</span>
        </div>
        <span className="pay-hero-footer-sep" aria-hidden="true">|</span>
        <div className="pay-order-id">Order ID: #{orderId}</div>
      </div>
    </div>
  )
}

function methodSheetTitle(id) {
  if (id === 'card') return 'Card details'
  if (id === 'upi') return 'Pay with UPI'
  if (id === 'wallet') return 'Health Wallet'
  if (id === 'netbanking') return 'Net Banking'
  return 'Payment details'
}

export default function ProcessPayment() {
  const navigate = useNavigate()
  const location = useLocation()
  const { paymentSession, setPaymentSession, refreshCheckout, focusBooking, cancelAppointment } = useBooking()
  const { openSheet, closeSheet } = useTransition()
  const shared = useSharedHero()
  const boot = location.state || {}
  const bookingId = boot.bookingId || paymentSession?.bookingEngineId || null
  const storeBooking = useBookingById(bookingId)

  useEffect(() => {
    if (bookingId) focusBooking?.(bookingId)
  }, [bookingId, focusBooking])

  const [now, setNow] = useState(() => Date.now())
  const [cardErrors, setCardErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [sheetMethodId, setSheetMethodId] = useState(null)
  const [expiredModalOpen, setExpiredModalOpen] = useState(false)
  const [expiredModalView, setExpiredModalView] = useState('alert')
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [refreshPrompt, setRefreshPrompt] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const expiredPromptedRef = useRef(false)
  const allowLeaveRef = useRef(false)
  const cancelTimerRef = useRef(null)
  const {
    isPresented: methodSheetOpen,
    isClosing: methodSheetClosing,
    show: openMethodSheet,
    hide: closeMethodSheet,
  } = useAppSheet()

  const session = useMemo(() => {
    if (paymentSession && paymentSession.status !== 'paid') {
      const draftBooking = paymentSession.draftBooking || storeBooking
      return draftBooking ? { ...paymentSession, draftBooking, bookingEngineId: bookingId || paymentSession.bookingEngineId } : paymentSession
    }
    const stored = readPaymentSession()
    if (stored && stored.status !== 'paid') {
      const draftBooking = stored.draftBooking || storeBooking
      return draftBooking ? { ...stored, draftBooking, bookingEngineId: bookingId || stored.bookingEngineId } : stored
    }
    if (storeBooking && (boot.flow === 'reschedule' || storeBooking.paymentPending)) {
      return createPaymentSession({
        flow: boot.flow || 'booking',
        draftBooking: storeBooking,
        appointmentData: boot.appointmentData || null,
        amount: boot.amount ?? storeBooking.payment?.amount,
      })
    }
    if (boot.draftBooking || boot.flow === 'reschedule') {
      return createPaymentSession({
        flow: boot.flow || 'booking',
        draftBooking: boot.draftBooking,
        appointmentData: boot.appointmentData || null,
        amount: boot.amount,
      })
    }
    return null
  }, [paymentSession, boot, storeBooking, bookingId])

  useEffect(() => {
    if (!session) return
    if (!paymentSession || paymentSession.orderId !== session.orderId) {
      setPaymentSession({ ...session, step: 'checkout' })
    }
  }, [session, paymentSession, setPaymentSession])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const remaining = secondsRemaining(session, now)
  const isExpired = Boolean(session && (session.status === 'expired' || remaining <= 0))
  const ready = useBookingReveal(
    `pay-checkout:${session?.orderId || 'none'}`,
    Boolean(session?.draftBooking?.doctor) && !refreshing,
  )

  useEffect(() => {
    if (!session?.draftBooking) return
    if (!isExpired) {
      expiredPromptedRef.current = false
      return
    }
    if (session.status !== 'expired') {
      setPaymentSession((prev) => (prev ? { ...prev, status: 'expired' } : prev))
    }
    if (expiredPromptedRef.current) return
    expiredPromptedRef.current = true
    if (methodSheetOpen) {
      closeMethodSheet(() => setSheetMethodId(null))
    } else {
      setSheetMethodId(null)
    }
    setExpiredModalView('alert')
    setExpiredModalOpen(true)
    openSheet()
  }, [isExpired, session, setPaymentSession, closeMethodSheet, openSheet, methodSheetOpen])

  useEffect(() => {
    if (!refreshPrompt) return undefined
    const timer = window.setTimeout(() => setRefreshPrompt(false), 3200)
    return () => window.clearTimeout(timer)
  }, [refreshPrompt])

  useEffect(() => {
    if (!session?.draftBooking) return undefined
    window.history.pushState({ checkoutLock: true }, '', window.location.href)
    const onPopState = () => {
      if (allowLeaveRef.current) return
      window.history.pushState({ checkoutLock: true }, '', window.location.href)
      if (isExpired) {
        setExpiredModalView('alert')
        setExpiredModalOpen(true)
        return
      }
      setCancelDialogOpen(true)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [session?.draftBooking, isExpired])

  useEffect(() => () => {
    if (cancelTimerRef.current) window.clearTimeout(cancelTimerRef.current)
  }, [])

  if (!session?.draftBooking) {
    return (
      <div className="pay-page">
        <div className="pay-header-bar">
          <div className="pay-header-spacer" />
          <h1 className="pay-header-title">Payment & Checkout</h1>
          <div className="pay-header-spacer" />
        </div>
        <div className="pay-empty">
          <p>No payment session found.</p>
          <button type="button" className="app-flow-cta" onClick={() => navigate('/', { replace: true })}>
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  const doctor = session.draftBooking.doctor
  const { date, time } = session.draftBooking
  const selected = session.selectedMethodId
  const canPay = canProceedCheckout(session) && !isExpired && !submitting && !refreshing
  const walletMethod = PAYMENT_METHODS.find((m) => m.id === 'wallet')
  const locked = isExpired && !expiredModalOpen

  const patchSession = (patch) => {
    setPaymentSession((prev) => {
      const base = prev || session
      return {
        ...base,
        ...patch,
        lastError: null,
        bookingEngineId: bookingId || base.bookingEngineId || session?.bookingEngineId,
      }
    })
  }

  const promptRefresh = () => {
    setRefreshPrompt(true)
  }

  const presentMethodSheet = (id) => {
    if (isExpired) {
      promptRefresh()
      return
    }
    setSheetMethodId(id)
    openMethodSheet()
  }

  const selectMethod = (id, { addCard = false, openSheet: shouldOpen = true } = {}) => {
    if (isExpired) {
      promptRefresh()
      return
    }
    const patch = { selectedMethodId: id }
    if (id === 'card' && addCard) patch.showAddCard = true
    patchSession(patch)
    setCardErrors({})
    if (shouldOpen) presentMethodSheet(id)
  }

  const hideMethodSheet = () => {
    closeMethodSheet(() => setSheetMethodId(null))
  }

  const handleRefreshCheckout = () => {
    const result = refreshCheckout?.(session) || { session: refreshPaymentSession(session) }
    const next = result?.session
    if (!next) return
    expiredPromptedRef.current = false
    setExpiredModalView('alert')
    setRefreshing(true)
    setExpiredModalOpen(false)
    closeSheet(220)
    setRefreshPrompt(false)
    if (methodSheetOpen) {
      closeMethodSheet(() => setSheetMethodId(null))
    } else {
      setSheetMethodId(null)
    }
    setPaymentSession(next)
    window.setTimeout(() => setRefreshing(false), 360)
  }

  const closeCancelDialog = () => {
    setCancelDialogOpen(false)
  }

  const handleContinueToPay = () => {
    closeCancelDialog()
    if (isExpired) {
      setExpiredModalView('alert')
      setExpiredModalOpen(true)
      openSheet()
      return
    }
    goToOtpConfirmation()
  }

  const finishCancelBooking = () => {
    const id = bookingId || session.bookingEngineId || session.draftBooking?.engineId || session.draftBooking?.id
    allowLeaveRef.current = true
    if (id) cancelAppointment(id)
    setPaymentSession(null)
    clearPaymentSession()
    shared?.reset?.()
    setExpiredModalOpen(false)
    setCancelDialogOpen(false)
    closeSheet(0)
    navigate('/', { replace: true })
  }

  const handleConfirmCancelBooking = () => {
    finishCancelBooking()
  }

  const handleExpiredCancelBooking = () => {
    if (expiredModalView === 'cancelling' || cancelTimerRef.current) return
    setExpiredModalView('cancelling')
    cancelTimerRef.current = window.setTimeout(() => {
      cancelTimerRef.current = null
      finishCancelBooking()
    }, 1800)
  }

  const sheetReady = (() => {
    if (!sheetMethodId || isExpired) return false
    if (sheetMethodId === 'card') {
      if (session.showAddCard) return validateCardDraft(session.cardDraft).valid
      return true
    }
    if (sheetMethodId === 'upi') {
      if (session.upiMode === 'id') return isValidUpiId(session.upiId)
      return Boolean(session.upiAppId)
    }
    if (sheetMethodId === 'netbanking') return Boolean(session.bankId)
    return true
  })()

  const goToOtpConfirmation = () => {
    if (isExpired || submitting || !canProceedCheckout(session)) return
    allowLeaveRef.current = true
    setSubmitting(true)
    patchSession({ step: 'verify', status: 'pending' })
    closeMethodSheet(() => setSheetMethodId(null))
    window.setTimeout(() => {
      navigate('/verify-payment', {
        replace: false,
        state: { bookingId: bookingId || session.bookingEngineId, fromCheckout: true },
      })
      setSubmitting(false)
    }, 280)
  }

  const confirmMethodSheet = () => {
    if (isExpired) {
      promptRefresh()
      return
    }
    if (sheetMethodId === 'card' && session.showAddCard) {
      const result = validateCardDraft(session.cardDraft)
      setCardErrors(result.errors)
      if (!result.valid) return
    }
    if (sheetMethodId === 'upi') {
      if (session.upiMode === 'id' && !isValidUpiId(session.upiId)) return
      if (session.upiMode === 'app' && !session.upiAppId) return
    }
    if (sheetMethodId === 'netbanking' && !session.bankId) return
    goToOtpConfirmation()
  }

  const handleProceed = () => {
    if (isExpired) {
      if (expiredModalView !== 'cancelling') setExpiredModalView('alert')
      setExpiredModalOpen(true)
      openSheet()
      return
    }
    if (!canProceedCheckout(session)) {
      presentMethodSheet(session.selectedMethodId)
      return
    }
    goToOtpConfirmation()
  }

  const ctaLabel = submitting
    ? 'Preparing secure checkout…'
    : refreshing
      ? 'Refreshing checkout…'
      : isExpired
        ? 'Refresh Checkout'
        : proceedCtaLabel(session)

  return (
    <div className={`pay-page ${locked ? 'is-locked' : ''} ${isExpired ? 'is-expired' : ''}`}>
      <div className="pay-header-bar">
        <div className="pay-header-spacer" />
        <h1 className="pay-header-title">Payment & Checkout</h1>
        <div className="pay-header-spacer" />
      </div>

      <div className="pay-body">
        <PaymentDoctorSummary
          doctor={doctor}
          date={date}
          time={time}
          amount={session.amount}
          currency={session.currency}
          orderId={session.orderId}
          ready={ready && !refreshing}
          locked={locked || isExpired}
        />

        <BookingReveal
          ready={ready && !refreshing}
          skeleton={(
            <>
              <div className="booking-skel-label shimmer" />
              <div className="booking-skel-card is-tall shimmer" />
              <div className="booking-skel-card shimmer" />
              <div className="booking-skel-card shimmer" />
            </>
          )}
        >
          <div className="pay-section-head">
            <h2 className="pay-section-title">Payment Method</h2>
            <button
              type="button"
              className="pay-add-link"
              disabled={isExpired}
              onClick={() => selectMethod('card', { addCard: true })}
            >
              + Add New
            </button>
          </div>

          <div className={`pay-methods ${isExpired ? 'is-disabled' : ''}`} role="radiogroup" aria-label="Payment methods">
            {PAYMENT_METHODS.map((method) => {
              const active = selected === method.id
              const view = resolveMethodView(session, method)
              return (
                <button
                  key={method.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-disabled={isExpired}
                  className={`pay-method ${active ? 'is-selected' : ''} ${view.ready ? 'is-ready' : ''} ${isExpired ? 'is-locked' : ''}`}
                  onClick={() => selectMethod(method.id)}
                >
                  <span className={`pay-radio ${active ? 'is-on' : ''}`} aria-hidden="true">
                    {active ? <span className="pay-radio-dot" /> : null}
                  </span>
                  <span className="pay-method-copy">
                    <span className="pay-method-label-row">
                      <span className="pay-method-label">{view.label}</span>
                      {view.showEdit ? (
                        <span
                          className="pay-method-edit"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectMethod(method.id)
                          }}
                        >
                          Edit
                        </span>
                      ) : null}
                    </span>
                    {view.status ? (
                      <span className="pay-method-status">{view.status}</span>
                    ) : view.subtitle ? (
                      <span className="pay-method-sub">{view.subtitle}</span>
                    ) : null}
                    {method.id === 'card' && active && method.default && !session.showAddCard && view.ready ? (
                      <span className="pay-method-default">✓ Default</span>
                    ) : null}
                  </span>
                  <span className="pay-method-aside">
                    {view.logos?.map((src) => (
                      <img key={src} src={src} alt="" className="pay-brand-logo" />
                    ))}
                    {view.balance != null && !view.ready ? (
                      <span className="pay-balance-chip">{formatMoney(view.balance)}</span>
                    ) : null}
                    {view.showBankIcon ? (
                      <span className="pay-bank-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 10h18L12 3 3 10Z" />
                          <path d="M5 10v8h14v-8" />
                          <path d="M2 18h20" />
                        </svg>
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="pay-secure-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>256-bit Bank Grade Encryption • HIPAA Compliant</span>
          </div>

          <div className={`pay-timer ${isExpired ? 'is-expired' : remaining <= 60 ? 'is-urgent' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {isExpired
              ? 'Expired'
              : `Complete payment within ${formatCountdown(remaining)} mins`}
          </div>

          {refreshPrompt ? (
            <div className="pay-banner is-warn" role="status">
              Session expired. Refresh checkout to continue.
              <button type="button" className="pay-banner-action" onClick={handleRefreshCheckout}>
                Refresh
              </button>
            </div>
          ) : null}
        </BookingReveal>
      </div>

      <StickyFooterCta
        primaryLabel={ctaLabel}
        onPrimary={handleProceed}
        primaryDisabled={(!canPay && !isExpired) || !ready || refreshing}
        secondaryLabel="Cancel Booking"
        onSecondary={() => {
          if (isExpired) {
            setExpiredModalView('alert')
            setExpiredModalOpen(true)
            openSheet()
            return
          }
          setCancelDialogOpen(true)
        }}
        pending={refreshing}
      />

      <AppBottomSheet
        open={methodSheetOpen && !isExpired}
        closing={methodSheetClosing}
        onClose={hideMethodSheet}
        labelledBy="pay-method-sheet-title"
        sheetClassName={`pay-method-sheet ${sheetMethodId === 'card' && session.showAddCard ? 'is-tall' : ''}`}
        className="is-blurred"
        dismissOnSwipe
        snapPoints={['mid', 'full']}
        keyboardAware
      >
        <div className="ds-sheet-header">
          <h3 id="pay-method-sheet-title">{methodSheetTitle(sheetMethodId)}</h3>
          <button type="button" className="ds-sheet-close" onClick={hideMethodSheet} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="pay-sheet-body">
          {sheetMethodId === 'card' ? (
            <>
              {!session.showAddCard ? (
                <button
                  type="button"
                  className="pay-sheet-choice is-selected"
                  onClick={() => patchSession({ showAddCard: false })}
                >
                  <span className="pay-sheet-choice-copy">
                    <strong>Visa •••• 4242</strong>
                    <span>Expires 08/27 · Default</span>
                  </span>
                  <span className="pay-radio is-on"><span className="pay-radio-dot" /></span>
                </button>
              ) : null}

              <div className="pay-card-form pay-sheet-panel">
                <div className="pay-card-form-head">
                  <h3>{session.showAddCard ? 'Add card' : 'Or add a new card'}</h3>
                  {session.showAddCard ? (
                    <button type="button" className="pay-text-btn" onClick={() => patchSession({ showAddCard: false })}>
                      Use saved card
                    </button>
                  ) : (
                    <button type="button" className="pay-text-btn" onClick={() => patchSession({ showAddCard: true })}>
                      Add new
                    </button>
                  )}
                </div>

                {session.showAddCard ? (
                  <>
                    <label className="pay-field">
                      <span>Card number</span>
                      <input
                        className={`pay-input ${cardErrors.number ? 'is-error' : ''}`}
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="ACCT-000003"
                        value={session.cardDraft.number}
                        onChange={(e) => {
                          patchSession({
                            cardDraft: { ...session.cardDraft, number: formatCardNumber(e.target.value) },
                          })
                        }}
                        onBlur={() => setCardErrors(validateCardDraft(session.cardDraft).errors)}
                      />
                      {cardErrors.number ? <em className="pay-field-error">{cardErrors.number}</em> : null}
                    </label>
                    <label className="pay-field">
                      <span>Name on card</span>
                      <input
                        className={`pay-input ${cardErrors.name ? 'is-error' : ''}`}
                        autoComplete="cc-name"
                        placeholder="Full name"
                        value={session.cardDraft.name}
                        onChange={(e) => patchSession({
                          cardDraft: { ...session.cardDraft, name: e.target.value },
                        })}
                      />
                      {cardErrors.name ? <em className="pay-field-error">{cardErrors.name}</em> : null}
                    </label>
                    <div className="pay-field-row">
                      <label className="pay-field">
                        <span>Expiry</span>
                        <input
                          className={`pay-input ${cardErrors.expiry ? 'is-error' : ''}`}
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder="MM/YY"
                          value={session.cardDraft.expiry}
                          onChange={(e) => patchSession({
                            cardDraft: { ...session.cardDraft, expiry: formatExpiry(e.target.value) },
                          })}
                        />
                        {cardErrors.expiry ? <em className="pay-field-error">{cardErrors.expiry}</em> : null}
                      </label>
                      <label className="pay-field">
                        <span>CVV</span>
                        <input
                          className={`pay-input ${cardErrors.cvv ? 'is-error' : ''}`}
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          placeholder="123"
                          value={session.cardDraft.cvv}
                          onChange={(e) => patchSession({
                            cardDraft: {
                              ...session.cardDraft,
                              cvv: e.target.value.replace(/\D/g, '').slice(0, 4),
                            },
                          })}
                        />
                        {cardErrors.cvv ? <em className="pay-field-error">{cardErrors.cvv}</em> : null}
                      </label>
                    </div>
                    <div className="pay-card-brands">
                      <img src="/img/payment/visa.png" alt="Visa" />
                      <img src="/img/payment/mastercard.png" alt="Mastercard" />
                      <img src="/img/payment/rupay.png" alt="RuPay" />
                    </div>
                  </>
                ) : (
                  <p className="pay-sheet-hint">Saved card is ready. Tap Continue to verify, or add a new card.</p>
                )}
              </div>
            </>
          ) : null}

          {sheetMethodId === 'upi' ? (
            <div className="pay-upi-panel pay-sheet-panel">
              <div className="pay-tab-group" role="tablist">
                <button
                  type="button"
                  className={`pay-tab ${session.upiMode === 'app' ? 'active' : ''}`}
                  onClick={() => patchSession({ upiMode: 'app' })}
                >
                  UPI Apps
                </button>
                <button
                  type="button"
                  className={`pay-tab ${session.upiMode === 'id' ? 'active' : ''}`}
                  onClick={() => patchSession({ upiMode: 'id' })}
                >
                  UPI ID
                </button>
              </div>
              {session.upiMode === 'app' ? (
                <div className="pay-apps-list">
                  {UPI_APPS.map((app) => {
                    const on = session.upiAppId === app.id
                    return (
                      <button
                        key={app.id}
                        type="button"
                        className={`pay-app-item ${on ? 'selected' : ''}`}
                        onClick={() => patchSession({ upiAppId: app.id, upiMode: 'app' })}
                      >
                        <img src={app.logo} alt="" className="pay-app-logo" />
                        <span className="pay-app-info">
                          <span className="pay-app-name">{app.label}</span>
                          <span className="pay-app-sub">Pay directly with a single tap</span>
                        </span>
                        <span className={`pay-radio ${on ? 'is-on' : ''}`}>
                          {on ? <span className="pay-radio-dot" /> : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <label className="pay-field">
                  <span>Enter UPI ID</span>
                  <input
                    className={`pay-input ${session.upiId && !isValidUpiId(session.upiId) ? 'is-error' : ''}`}
                    placeholder="yourname@upi"
                    value={session.upiId}
                    onChange={(e) => patchSession({ upiId: e.target.value.trim() })}
                    autoComplete="off"
                  />
                  {session.upiId && !isValidUpiId(session.upiId) ? (
                    <em className="pay-field-error">Enter a valid UPI ID (name@bank)</em>
                  ) : null}
                </label>
              )}
            </div>
          ) : null}

          {sheetMethodId === 'wallet' ? (
            <div className="pay-sheet-panel">
              <div className="pay-wallet-card">
                <span className="pay-wallet-label">Available balance</span>
                <strong className="pay-wallet-balance">{formatMoney(walletMethod?.balance ?? 0)}</strong>
                <p className="pay-sheet-hint">
                  Pay from your eMedicalls wallet. Eligible for this consultation.
                  No additional details are required.
                </p>
              </div>
            </div>
          ) : null}

          {sheetMethodId === 'netbanking' ? (
            <div className="pay-sheet-panel">
              <p className="pay-sheet-hint">Select your bank to continue with net banking.</p>
              <div className="pay-apps-list">
                {NET_BANKS.map((bank) => {
                  const on = session.bankId === bank.id
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      className={`pay-app-item ${on ? 'selected' : ''}`}
                      onClick={() => patchSession({ bankId: bank.id })}
                    >
                      <span className="pay-bank-icon is-inline" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 10h18L12 3 3 10Z" />
                          <path d="M5 10v8h14v-8" />
                          <path d="M2 18h20" />
                        </svg>
                      </span>
                      <span className="pay-app-info">
                        <span className="pay-app-name">{bank.label}</span>
                        <span className="pay-app-sub">Secure bank redirect</span>
                      </span>
                      <span className={`pay-radio ${on ? 'is-on' : ''}`}>
                        {on ? <span className="pay-radio-dot" /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="pay-sheet-footer">
          <button
            type="button"
            className="pay-sheet-continue"
            onClick={confirmMethodSheet}
            disabled={!sheetReady || submitting || isExpired}
          >
            {submitting ? 'Preparing secure checkout…' : 'Continue'}
          </button>
        </div>
      </AppBottomSheet>

      {expiredModalOpen ? (
        <SheetPortal>
          <div className="pay-expired-overlay" role="presentation">
            <div
              className={`pay-expired-modal ${expiredModalView === 'cancelling' ? 'is-cancelling' : ''}`}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pay-expired-title"
              aria-describedby="pay-expired-desc"
              aria-busy={expiredModalView === 'cancelling'}
            >
              {expiredModalView === 'cancelling' ? (
                <>
                  <div className="pay-expired-skel" aria-hidden="true">
                    <div className="pay-expired-skel-icon shimmer" />
                    <div className="pay-expired-skel-line shimmer" />
                    <div className="pay-expired-skel-line is-short shimmer" />
                    <div className="pay-expired-skel-cta shimmer" />
                    <div className="pay-expired-skel-cta is-secondary shimmer" />
                  </div>
                  <h3 id="pay-expired-title">Cancelling your booking…</h3>
                  <p id="pay-expired-desc">
                    Please wait while we securely cancel your appointment. This will only take a few seconds.
                  </p>
                </>
              ) : (
                <>
                  <div className="pay-expired-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <h3 id="pay-expired-title">Payment session expired</h3>
                  <p id="pay-expired-desc">
                    Your secure checkout window ended after 10 minutes. Refresh to generate a new session
                    with the same booking details, or cancel this booking.
                  </p>
                  <button type="button" className="pay-expired-primary" onClick={handleRefreshCheckout}>
                    Refresh Checkout
                  </button>
                  <button
                    type="button"
                    className="pay-expired-secondary is-danger"
                    onClick={handleExpiredCancelBooking}
                  >
                    Cancel Booking
                  </button>
                </>
              )}
            </div>
          </div>
        </SheetPortal>
      ) : null}

      {cancelDialogOpen ? (
        <SheetPortal>
          <div className="pay-expired-overlay" role="presentation">
            <div
              className="pay-expired-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pay-cancel-title"
              aria-describedby="pay-cancel-desc"
            >
              <div className="pay-expired-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h3 id="pay-cancel-title">Cancel this booking?</h3>
              <p id="pay-cancel-desc">
                Payment isn’t complete yet. Continue to pay with your selected method, or cancel
                this booking and exit checkout.
              </p>
              <button type="button" className="pay-expired-primary" onClick={handleContinueToPay}>
                Continue to Pay
              </button>
              <button type="button" className="pay-expired-secondary is-danger" onClick={handleConfirmCancelBooking}>
                Cancel Booking
              </button>
            </div>
          </div>
        </SheetPortal>
      ) : null}
    </div>
  )
}
