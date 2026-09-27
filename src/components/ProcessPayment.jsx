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
import { AppBar, Badge, Button, EmptyState, Icon, SectionHead } from './ui'
import './ProcessPayment.css'

function PaymentDoctorSummary({ doctor, date, time, amount, currency, orderId, ready, locked }) {
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
    : `${date?.day || ''} ${time || ''}`.trim()

  return (
    <div className={`pay-hero-card ds-card is-padded ${ready ? '' : 'is-pending'} ${locked ? 'is-locked' : ''}`}>
      <div className="pay-hero-top">
        <DoctorCard doctor={doctor} context="identity" className="pay-hero-doctor" disableNavigate />
        <div className="pay-hero-fee">
          <span className="pay-hero-fee-label">Consult Fee</span>
          <span className="pay-hero-fee-value">{formatMoney(amount, currency)}</span>
        </div>
      </div>

      <div className="pay-hero-amount-block">
        <div className="pay-amount-label ds-overline">Amount to pay</div>
        <div className="pay-amount-value">{formatMoney(amount, currency)}</div>
      </div>

      <div className="pay-hero-footer">
        <div className="pay-hero-when">
          <Icon.Calendar />
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
  if (id === 'upi') return 'Pay with digital wallet'
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
        <AppBar title="Payment & Checkout" as="div" />
        <EmptyState
          message="No payment session found."
          action={<Button onClick={() => navigate('/', { replace: true })}>Go to Home</Button>}
        />
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
      <AppBar title="Payment & Checkout" as="div" />

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
          <SectionHead
            title="Payment Method"
            action={(
              <button
                type="button"
                className="ds-link pay-add-link"
                disabled={isExpired}
                onClick={() => selectMethod('card', { addCard: true })}
              >
                <Icon.Plus />
                Add New
              </button>
            )}
          />

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
                  className={`pay-method ds-card is-interactive ${active ? 'is-selected' : ''} ${view.ready ? 'is-ready' : ''} ${isExpired ? 'is-locked' : ''}`}
                  onClick={() => selectMethod(method.id)}
                >
                  <span className={`ds-radio ${active ? 'is-on' : ''}`} aria-hidden="true" />
                  <span className="pay-method-copy">
                    <span className="pay-method-label-row">
                      <span className="pay-method-label">{view.label}</span>
                      {view.showEdit ? (
                        <span
                          className="pay-method-edit ds-link"
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
                      <Badge tone="primary" className="pay-method-default"><Icon.Check />Default</Badge>
                    ) : null}
                  </span>
                  <span className="pay-method-aside">
                    {view.logos?.map((src) => (
                      <img key={src} src={src} alt="" className="pay-brand-logo" />
                    ))}
                    {view.balance != null && !view.ready ? (
                      <Badge tone="info">{formatMoney(view.balance)}</Badge>
                    ) : null}
                    {view.showBankIcon ? (
                      <span className="ds-icon-well is-muted" aria-hidden="true">
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
            <div className="ds-callout is-warning pay-banner" role="status">
              <span className="ds-callout__body">Session expired. Refresh checkout to continue.</span>
              <button type="button" className="ds-link" onClick={handleRefreshCheckout}>
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
            <Icon.Close />
          </button>
        </div>

        <div className="pay-sheet-body">
          {sheetMethodId === 'card' ? (
            <>
              {!session.showAddCard ? (
                <button
                  type="button"
                  className="pay-sheet-choice ds-card is-interactive is-selected"
                  onClick={() => patchSession({ showAddCard: false })}
                >
                  <span className="pay-sheet-choice-copy">
                    <strong>Visa •••• 4242</strong>
                    <span>Expires 08/27 · Default</span>
                  </span>
                  <span className="ds-radio is-on" aria-hidden="true" />
                </button>
              ) : null}

              <div className="pay-card-form ds-card is-padded">
                <div className="pay-card-form-head">
                  <h3>{session.showAddCard ? 'Add card' : 'Or add a new card'}</h3>
                  {session.showAddCard ? (
                    <button type="button" className="ds-link" onClick={() => patchSession({ showAddCard: false })}>
                      Use saved card
                    </button>
                  ) : (
                    <button type="button" className="ds-link" onClick={() => patchSession({ showAddCard: true })}>
                      Add new
                    </button>
                  )}
                </div>

                {session.showAddCard ? (
                  <>
                    <label className="pay-field">
                      <span className="ds-field-label">Card number</span>
                      <input
                        className={`ds-field ${cardErrors.number ? 'is-error' : ''}`}
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
                      {cardErrors.number ? <em className="ds-field-error">{cardErrors.number}</em> : null}
                    </label>
                    <label className="pay-field">
                      <span className="ds-field-label">Name on card</span>
                      <input
                        className={`ds-field ${cardErrors.name ? 'is-error' : ''}`}
                        autoComplete="cc-name"
                        placeholder="Full name"
                        value={session.cardDraft.name}
                        onChange={(e) => patchSession({
                          cardDraft: { ...session.cardDraft, name: e.target.value },
                        })}
                      />
                      {cardErrors.name ? <em className="ds-field-error">{cardErrors.name}</em> : null}
                    </label>
                    <div className="pay-field-row">
                      <label className="pay-field">
                        <span className="ds-field-label">Expiry</span>
                        <input
                          className={`ds-field ${cardErrors.expiry ? 'is-error' : ''}`}
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder="MM/YY"
                          value={session.cardDraft.expiry}
                          onChange={(e) => patchSession({
                            cardDraft: { ...session.cardDraft, expiry: formatExpiry(e.target.value) },
                          })}
                        />
                        {cardErrors.expiry ? <em className="ds-field-error">{cardErrors.expiry}</em> : null}
                      </label>
                      <label className="pay-field">
                        <span className="ds-field-label">CVV</span>
                        <input
                          className={`ds-field ${cardErrors.cvv ? 'is-error' : ''}`}
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
                        {cardErrors.cvv ? <em className="ds-field-error">{cardErrors.cvv}</em> : null}
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
            <div className="pay-upi-panel">
              <div className="pay-tab-group ds-segmented" role="group" aria-label="Wallet method">
                <button
                  type="button"
                  aria-pressed={session.upiMode === 'app'}
                  className="ds-segmented__item"
                  onClick={() => patchSession({ upiMode: 'app' })}
                >
                  Wallet apps
                </button>
                <button
                  type="button"
                  aria-pressed={session.upiMode === 'id'}
                  className="ds-segmented__item"
                  onClick={() => patchSession({ upiMode: 'id' })}
                >
                  Wallet ID
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
                        className={`pay-app-item ds-card is-interactive ${on ? 'is-selected' : ''}`}
                        onClick={() => patchSession({ upiAppId: app.id, upiMode: 'app' })}
                      >
                        <img src={app.logo} alt="" className="pay-app-logo" />
                        <span className="pay-app-info">
                          <span className="pay-app-name">{app.label}</span>
                          <span className="pay-app-sub">Pay directly with a single tap</span>
                        </span>
                        <span className={`ds-radio ${on ? 'is-on' : ''}`} aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
              ) : (
                <label className="pay-field">
                  <span className="ds-field-label">Enter Wallet ID</span>
                  <input
                    className={`ds-field ${session.upiId && !isValidUpiId(session.upiId) ? 'is-error' : ''}`}
                    placeholder="yourname@upi"
                    value={session.upiId}
                    onChange={(e) => patchSession({ upiId: e.target.value.trim() })}
                    autoComplete="off"
                  />
                  {session.upiId && !isValidUpiId(session.upiId) ? (
                    <em className="ds-field-error">Enter a valid Wallet ID (name@bank)</em>
                  ) : null}
                </label>
              )}
            </div>
          ) : null}

          {sheetMethodId === 'wallet' ? (
            <div className="pay-sheet-panel">
              <div className="pay-wallet-card ds-card is-muted is-padded">
                <span className="pay-wallet-label ds-overline">Available balance</span>
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
                      className={`pay-app-item ds-card is-interactive ${on ? 'is-selected' : ''}`}
                      onClick={() => patchSession({ bankId: bank.id })}
                    >
                      <span className="ds-icon-well is-tile is-muted" aria-hidden="true">
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
                      <span className={`ds-radio ${on ? 'is-on' : ''}`} aria-hidden="true" />
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
            className="ds-btn ds-btn--primary ds-btn--lg ds-btn--block"
            onClick={confirmMethodSheet}
            disabled={!sheetReady || submitting || isExpired}
          >
            {submitting ? 'Preparing secure checkout…' : 'Continue'}
          </button>
        </div>
      </AppBottomSheet>

      {expiredModalOpen ? (
        <SheetPortal>
          <div className="ds-dialog-overlay is-dimmed" role="presentation">
            <div
              className={`ds-dialog pay-expired-modal ${expiredModalView === 'cancelling' ? 'is-cancelling' : ''}`}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pay-expired-title"
              aria-describedby="pay-expired-desc"
              aria-busy={expiredModalView === 'cancelling'}
            >
              {expiredModalView === 'cancelling' ? (
                <>
                  <div className="pay-expired-skel" aria-hidden="true">
                    <span className="ds-skel is-circle pay-expired-skel-icon" />
                    <span className="ds-skel is-text pay-expired-skel-line" />
                    <span className="ds-skel is-text pay-expired-skel-line is-short" />
                    <span className="ds-skel is-btn" />
                  </div>
                  <h3 id="pay-expired-title" className="ds-dialog__title">Cancelling your booking…</h3>
                  <p id="pay-expired-desc" className="ds-dialog__copy">
                    Please wait while we securely cancel your appointment. This will only take a few seconds.
                  </p>
                </>
              ) : (
                <>
                  <div className="ds-dialog__icon is-danger" aria-hidden="true">
                    <Icon.Clock />
                  </div>
                  <h3 id="pay-expired-title" className="ds-dialog__title">Payment session expired</h3>
                  <p id="pay-expired-desc" className="ds-dialog__copy">
                    Your secure checkout window ended after 10 minutes. Refresh to generate a new session
                    with the same booking details, or cancel this booking.
                  </p>
                  <div className="ds-dialog__actions">
                    <Button size="lg" onClick={handleRefreshCheckout}>
                      Refresh Checkout
                    </Button>
                    <Button size="lg" variant="danger-quiet" onClick={handleExpiredCancelBooking}>
                      Cancel Booking
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </SheetPortal>
      ) : null}

      {cancelDialogOpen ? (
        <SheetPortal>
          <div className="ds-dialog-overlay is-dimmed" role="presentation">
            <div
              className="ds-dialog pay-expired-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pay-cancel-title"
              aria-describedby="pay-cancel-desc"
            >
              <div className="ds-dialog__icon is-danger" aria-hidden="true">
                <Icon.Close />
              </div>
              <h3 id="pay-cancel-title" className="ds-dialog__title">Cancel this booking?</h3>
              <p id="pay-cancel-desc" className="ds-dialog__copy">
                Payment isn’t complete yet. Continue to pay with your selected method, or cancel
                this booking and exit checkout.
              </p>
              <div className="ds-dialog__actions">
                <Button size="lg" onClick={handleContinueToPay}>
                  Continue to Pay
                </Button>
                <Button size="lg" variant="danger-quiet" onClick={handleConfirmCancelBooking}>
                  Cancel Booking
                </Button>
              </div>
            </div>
          </div>
        </SheetPortal>
      ) : null}
    </div>
  )
}
