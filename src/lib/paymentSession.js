/** Payment session SSOT — checkout, OTP, and incomplete-booking persistence */

import { BRAND_STORAGE } from './brand'

let sessionScope = 'anon'

export function setPaymentSessionScope(userId) {
  sessionScope = userId || 'anon'
}

function paymentStorageKey() {
  return `${BRAND_STORAGE.paymentSessionPrefix}${sessionScope}`
}

export const PAYMENT_WINDOW_MS = 10 * 60 * 1000
export const OTP_LENGTH = 4
export const DEMO_OTP = '1234'

export const PAYMENT_METHODS = [
  {
    id: 'card',
    label: 'Credit / Debit Card',
    kind: 'card',
    subtitle: 'Nabil Bank •••• 4242 · Expires 08/27',
    logos: ['/img/payment/visa.png', '/img/payment/mastercard.png'],
  },
  {
    id: 'upi',
    label: 'Digital Wallet',
    kind: 'upi',
    subtitle: 'Pay with eSewa, Khalti, or Fonepay.',
    logos: ['/img/payment/gpay.png', '/img/payment/phonepe.png'],
    default: true,
  },
  {
    id: 'wallet',
    label: 'Health Wallet',
    kind: 'wallet',
    subtitle: 'Pay from your eMedicalls wallet balance.',
    balance: 2500,
  },
  {
    id: 'netbanking',
    label: 'Net Banking',
    kind: 'netbanking',
    subtitle: 'All major Nepal banks.',
  },
]

export const UPI_APPS = [
  { id: 'esewa', label: 'eSewa', logo: '/img/payment/gpay.png' },
  { id: 'khalti', label: 'Khalti', logo: '/img/payment/phonepe.png' },
  { id: 'fonepay', label: 'Fonepay', logo: '/img/payment/paytm.png' },
]

export const NET_BANKS = [
  { id: 'nabil', label: 'Nabil Bank' },
  { id: 'nicasia', label: 'NIC Asia Bank' },
  { id: 'nbl', label: 'Nepal Bank Limited' },
  { id: 'globalime', label: 'Global IME Bank' },
  { id: 'kumari', label: 'Kumari Bank' },
]

export function createOrderId() {
  const n = Math.floor(10000 + Math.random() * 90000)
  return `MED-${n}`
}

export function formatMoney(amount, currency = 'NPR') {
  const value = Number(amount) || 0
  const digits = Number.isInteger(value) ? 0 : 2
  const formatted = value.toLocaleString('en-NP', { minimumFractionDigits: digits, maximumFractionDigits: 2 })
  if (String(currency).toUpperCase() === 'NPR') return `Rs. ${formatted}`
  return `${currency} ${formatted}`
}

export function amountFromDoctor(doctor, fallback = 800) {
  const fee = Number(doctor?.fee)
  return Number.isFinite(fee) && fee > 0 ? fee : fallback
}

function serializeDate(date) {
  if (!date) return null
  return {
    ...date,
    full: date.full instanceof Date ? date.full.toISOString() : date.full,
  }
}

function reviveDate(date) {
  if (!date) return null
  return {
    ...date,
    full: date.full ? new Date(date.full) : date.full,
  }
}

export function serializePaymentSession(session) {
  if (!session) return null
  return {
    ...session,
    draftBooking: session.draftBooking
      ? { ...session.draftBooking, date: serializeDate(session.draftBooking.date) }
      : null,
  }
}

export function revivePaymentSession(raw) {
  if (!raw) return null
  return {
    ...raw,
    draftBooking: raw.draftBooking
      ? { ...raw.draftBooking, date: reviveDate(raw.draftBooking.date) }
      : null,
  }
}

export function readPaymentSession() {
  try {
    const raw = localStorage.getItem(paymentStorageKey())
    if (!raw) return null
    const session = revivePaymentSession(JSON.parse(raw))
    if (!session?.orderId || !session?.draftBooking) return null
    if (session.status === 'paid') return null
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return { ...session, status: 'expired' }
    }
    return session
  } catch {
    return null
  }
}

export function writePaymentSession(session) {
  try {
    if (!session) {
      localStorage.removeItem(paymentStorageKey())
      return
    }
    localStorage.setItem(paymentStorageKey(), JSON.stringify(serializePaymentSession(session)))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPaymentSession() {
  writePaymentSession(null)
}

export function createPaymentSession({
  flow = 'booking',
  draftBooking,
  appointmentData = null,
  amount,
  currency = 'NPR',
} = {}) {
  const fee = amount != null ? Number(amount) : amountFromDoctor(draftBooking?.doctor)
  return {
    flow,
    step: 'checkout',
    status: 'pending',
    orderId: createOrderId(),
    amount: fee,
    currency,
    createdAt: Date.now(),
    expiresAt: Date.now() + PAYMENT_WINDOW_MS,
    selectedMethodId: 'card',
    upiMode: 'app',
    upiAppId: null,
    upiId: '',
    bankId: null,
    cardDraft: {
      number: '',
      name: '',
      expiry: '',
      cvv: '',
      setDefault: true,
    },
    showAddCard: false,
    draftBooking,
    appointmentData,
    otpAttempts: 0,
    lastError: null,
  }
}

export function secondsRemaining(session, now = Date.now()) {
  if (!session?.expiresAt) return 0
  return Math.max(0, Math.ceil((session.expiresAt - now) / 1000))
}

export function formatCountdown(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function isValidUpiId(value) {
  return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(String(value || '').trim())
}

export function formatCardNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function formatExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function validateCardDraft(card = {}) {
  const number = String(card.number || '').replace(/\D/g, '')
  const name = String(card.name || '').trim()
  const expiry = String(card.expiry || '').replace(/\s/g, '')
  const cvv = String(card.cvv || '').replace(/\D/g, '')
  const errors = {}

  if (number.length < 16) errors.number = 'Enter a valid 16-digit card number'
  if (name.length < 2) errors.name = 'Enter the name on the card'
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    errors.expiry = 'Use MM/YY'
  } else {
    const [mm, yy] = expiry.split('/').map(Number)
    if (mm < 1 || mm > 12) errors.expiry = 'Invalid month'
    else {
      const now = new Date()
      const exp = new Date(2000 + yy, mm)
      if (exp <= now) errors.expiry = 'Card is expired'
    }
  }
  if (cvv.length < 3) errors.cvv = 'Enter a valid CVV'

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function canProceedCheckout(session) {
  if (!session || session.status === 'expired') return false
  if (session.expiresAt && Date.now() > session.expiresAt) return false
  return isMethodReady(session, session.selectedMethodId)
}

export function isMethodReady(session, methodId = session?.selectedMethodId) {
  if (!session || !methodId) return false
  const method = PAYMENT_METHODS.find((item) => item.id === methodId)
  if (!method) return false

  if (method.id === 'card') {
    if (session.showAddCard) return validateCardDraft(session.cardDraft).valid
    return true
  }
  if (method.id === 'upi') {
    if (session.upiMode === 'id') return isValidUpiId(session.upiId)
    return Boolean(session.upiAppId)
  }
  if (method.id === 'wallet') return true
  if (method.id === 'netbanking') return Boolean(session.bankId)
  return false
}

export function paymentLabelFromSession(session) {
  const method = PAYMENT_METHODS.find((item) => item.id === session?.selectedMethodId)
  if (!method) return 'Card'
  if (method.id === 'card') {
    if (session.showAddCard) {
      const last4 = String(session.cardDraft?.number || '').replace(/\D/g, '').slice(-4)
      return last4 ? `Card •••• ${last4}` : 'New card'
    }
    return 'Visa •••• 4242'
  }
  if (method.id === 'upi') {
    if (session.upiMode === 'id' && session.upiId) return session.upiId
    const app = UPI_APPS.find((item) => item.id === session.upiAppId)
    return app?.label || 'Digital wallet'
  }
  if (method.id === 'netbanking') {
    const bank = NET_BANKS.find((item) => item.id === session.bankId)
    return bank?.label || method.label
  }
  if (method.id === 'wallet') return 'Health Wallet'
  return method.label
}

/** Live parent-card presentation for a payment method row (SSOT = session). */
export function resolveMethodView(session, method) {
  const active = session?.selectedMethodId === method.id
  const ready = active && isMethodReady(session, method.id)

  if (!active) {
    return {
      label: method.label,
      subtitle: method.subtitle,
      status: null,
      logos: method.logos || null,
      balance: method.balance,
      showEdit: false,
      ready: false,
      showBankIcon: method.id === 'netbanking',
    }
  }

  if (method.id === 'upi') {
    if (session.upiMode === 'app' && session.upiAppId) {
      const app = UPI_APPS.find((item) => item.id === session.upiAppId)
      return {
        label: app?.label || 'Digital wallet',
        subtitle: null,
        status: 'Ready to continue',
        logos: app?.logo ? [app.logo] : null,
        balance: null,
        showEdit: true,
        ready: true,
        showBankIcon: false,
      }
    }
    if (session.upiMode === 'id' && isValidUpiId(session.upiId)) {
      return {
        label: session.upiId,
        subtitle: null,
        status: 'Ready to continue',
        logos: ['/img/payment/gpay.png'],
        balance: null,
        showEdit: true,
        ready: true,
        showBankIcon: false,
      }
    }
    return {
      label: method.label,
      subtitle: 'Choose eSewa, Khalti, Fonepay, or enter a wallet ID',
      status: null,
      logos: method.logos,
      balance: null,
      showEdit: false,
      ready: false,
      showBankIcon: false,
    }
  }

  if (method.id === 'card') {
    if (session.showAddCard) {
      const last4 = String(session.cardDraft?.number || '').replace(/\D/g, '').slice(-4)
      if (ready) {
        return {
          label: `Card •••• ${last4}`,
          subtitle: null,
          status: 'Ready to continue',
          logos: method.logos,
          balance: null,
          showEdit: true,
          ready: true,
          showBankIcon: false,
        }
      }
      return {
        label: 'New card',
        subtitle: 'Complete card details to continue',
        status: null,
        logos: method.logos,
        balance: null,
        showEdit: true,
        ready: false,
        showBankIcon: false,
      }
    }
    return {
      label: 'Visa •••• 4242',
      subtitle: 'Expires 08/27 · Default',
      status: 'Ready to continue',
      logos: method.logos,
      balance: null,
      showEdit: true,
      ready: true,
      showBankIcon: false,
    }
  }

  if (method.id === 'wallet') {
    return {
      label: method.label,
      subtitle: method.balance != null ? `Available ${formatMoney(method.balance)}` : method.subtitle,
      status: 'Ready to continue',
      logos: null,
      balance: method.balance,
      showEdit: true,
      ready: true,
      showBankIcon: false,
    }
  }

  if (method.id === 'netbanking') {
    if (session.bankId) {
      const bank = NET_BANKS.find((item) => item.id === session.bankId)
      return {
        label: bank?.label || method.label,
        subtitle: null,
        status: 'Ready to continue',
        logos: null,
        balance: null,
        showEdit: true,
        ready: true,
        showBankIcon: true,
      }
    }
    return {
      label: method.label,
      subtitle: 'Select your bank to continue',
      status: null,
      logos: null,
      balance: null,
      showEdit: false,
      ready: false,
      showBankIcon: true,
    }
  }

  return {
    label: method.label,
    subtitle: method.subtitle,
    status: null,
    logos: method.logos || null,
    balance: method.balance,
    showEdit: false,
    ready: false,
    showBankIcon: method.id === 'netbanking',
  }
}

export function proceedCtaLabel(session) {
  if (!session) return 'Proceed'
  if (session.status === 'expired') return 'Refresh Checkout'
  if (!canProceedCheckout(session)) {
    return `Proceed • ${formatMoney(session.amount, session.currency)}`
  }
  return `Proceed with ${paymentLabelFromSession(session)}`
}

/** Refresh checkout window while preserving booking + method editor state. */
export function refreshPaymentSession(prev) {
  if (!prev?.draftBooking) return null
  return {
    ...prev,
    orderId: createOrderId(),
    createdAt: Date.now(),
    expiresAt: Date.now() + PAYMENT_WINDOW_MS,
    status: 'pending',
    step: 'checkout',
    otpAttempts: 0,
    lastError: null,
  }
}

export function buildPaidBooking(session) {
  const draft = session?.draftBooking
  if (!draft) return null
  const paymentId = `PAY-${String(session.orderId || 'MED').replace(/\D/g, '').slice(-6)}${Date.now().toString().slice(-4)}`
  return {
    ...draft,
    status: 'booked',
    preparationCompleted: false,
    prepStepIndex: 0,
    paymentPending: false,
    payment: {
      status: 'paid',
      amount: session.amount,
      currency: session.currency || 'NPR',
      method: paymentLabelFromSession(session),
      methodId: session.selectedMethodId,
      upiAppId: session.upiAppId || null,
      upiMode: session.upiMode || null,
      upiId: session.upiId || null,
      bankId: session.bankId || null,
      orderId: session.orderId,
      paymentId,
      bookingId: `BK-${session.orderId || createOrderId()}`,
      paidAt: new Date().toISOString(),
      consultationFee: session.amount,
      taxes: 0,
      discount: 0,
    },
  }
}

export function isPendingPaymentBooking(booking) {
  return Boolean(booking?.paymentPending || booking?.status === 'payment_pending')
}
