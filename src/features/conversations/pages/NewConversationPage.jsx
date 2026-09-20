import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePushBack } from '../../pushNav'
import { useAuth } from '../../auth/hooks/useAuth'
import { useBookingStore } from '../../../booking'
import { BOOKING_STATUS } from '../../../booking/constants'
import {
  createSupportConversation,
  getOrCreateProviderConversation,
  SUPPORT_CATEGORY,
} from '../index'
import '../Chat.css'

const CATEGORIES = [
  { id: SUPPORT_CATEGORY.GENERAL, label: 'General' },
  { id: SUPPORT_CATEGORY.BOOKING, label: 'Booking' },
  { id: SUPPORT_CATEGORY.BILLING, label: 'Billing' },
  { id: SUPPORT_CATEGORY.TECHNICAL, label: 'Technical' },
  { id: SUPPORT_CATEGORY.CLINICAL, label: 'Clinical' },
  { id: SUPPORT_CATEGORY.PHARMACY, label: 'Pharmacy' },
]

function supportThreadPath(conversationId) {
  return `/chat/support/${conversationId}`
}

export default function NewConversationPage() {
  const navigate = useNavigate()
  const goBack = usePushBack('/chat')
  const { user } = useAuth()
  const { bookings } = useBookingStore()
  const [mode, setMode] = useState(null) // provider | support
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [category, setCategory] = useState(SUPPORT_CATEGORY.GENERAL)
  const [message, setMessage] = useState('')
  const [linkBookingId, setLinkBookingId] = useState('')
  const submittingRef = useRef(false)

  const eligibleBookings = useMemo(
    () => (bookings || []).filter((b) => (
      b?.id
      && ![BOOKING_STATUS.DRAFT, BOOKING_STATUS.CANCELLED].includes(b.status)
    )),
    [bookings],
  )

  const startProvider = async (booking) => {
    if (!user?.id || !booking?.id || busy || submittingRef.current) return
    submittingRef.current = true
    setBusy(true)
    setError('')
    try {
      const result = await getOrCreateProviderConversation({
        userId: user.id,
        bookingRef: booking.id,
        subject: booking.doctor?.name
          ? `Chat with ${booking.doctor.name}`
          : 'Care conversation',
        metadata: {
          provider_name: booking.doctor?.name || '',
          specialty: booking.doctor?.specialty || '',
          visit_type: booking.visitType || booking.visit_type || '',
          visit_label: booking.slot || '',
        },
      })
      if (!result.ok) {
        setError(result.error || 'Could not start conversation.')
        return
      }
      navigate(`/chat/${result.conversation.id}`, { replace: true })
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  const startSupport = async (event) => {
    event.preventDefault()
    if (!user?.id || busy || submittingRef.current) return

    const text = message.trim()
    if (!text) {
      setError('Describe your issue before creating a ticket.')
      return
    }
    if (!category) {
      setError('Choose a category.')
      return
    }

    submittingRef.current = true
    setBusy(true)
    setError('')
    try {
      const linked = eligibleBookings.find((b) => b.id === linkBookingId)
      const result = await createSupportConversation({
        userId: user.id,
        category,
        subject: 'Support request',
        body: text,
        bookingRef: linked?.id || null,
      })
      if (!result.ok) {
        setError(result.error || 'Could not create support ticket. Nothing was saved — try again.')
        return
      }

      const conversationId = result.conversationId || result.conversation?.id
      if (!conversationId) {
        setError('Ticket created but we could not open the chat. Check your inbox.')
        return
      }

      navigate(supportThreadPath(conversationId), {
        replace: true,
        state: {
          fromCreate: true,
          conversation: result.conversation,
          ticket: result.ticket,
        },
      })
    } catch (err) {
      setError(err?.message || 'Could not create support ticket. Nothing was saved — try again.')
    } finally {
      submittingRef.current = false
      setBusy(false)
    }
  }

  return (
    <div className="chat-page page-push-in">
      <header className="chat-header">
        <button type="button" className="chat-header-back" onClick={goBack} aria-label="Back" data-push-back>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="chat-header-title">New conversation</h1>
      </header>

      <div className="chat-body">
        {error ? <p className="chat-banner" role="alert">{error}</p> : null}

        {!mode ? (
          <>
            <button type="button" className="chat-choice-card" onClick={() => setMode('provider')} disabled={busy}>
              <strong>Message a care provider</strong>
              <span>Choose an existing booking to open a permanent chat for that visit.</span>
            </button>
            <button type="button" className="chat-choice-card" onClick={() => setMode('support')} disabled={busy}>
              <strong>Contact support</strong>
              <span>Creates a ticket ID and opens a live chat thread.</span>
            </button>
          </>
        ) : null}

        {mode === 'provider' ? (
          <>
            <button type="button" className="chat-header-action" onClick={() => setMode(null)} disabled={busy}>Back</button>
            <p className="chat-section-label">Your bookings</p>
            {!eligibleBookings.length ? (
              <div className="chat-empty">
                <h2>No bookings yet</h2>
                <p>Book a visit first, then you can chat with that provider here.</p>
                <button type="button" className="chat-empty-cta" onClick={() => navigate('/booking')}>
                  Book appointment
                </button>
              </div>
            ) : (
              eligibleBookings.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  className="chat-booking-row"
                  disabled={busy}
                  onClick={() => startProvider(booking)}
                >
                  <strong>{booking.doctor?.name || 'Provider'}</strong>
                  <span>
                    {booking.doctor?.specialty || 'Care'}
                    {booking.status ? ` · ${booking.status}` : ''}
                  </span>
                </button>
              ))
            )}
          </>
        ) : null}

        {mode === 'support' ? (
          <form onSubmit={startSupport} aria-busy={busy}>
            <button type="button" className="chat-header-action" onClick={() => setMode(null)} disabled={busy}>Back</button>
            <label className="chat-form-label" htmlFor="support-category">Category</label>
            <select
              id="support-category"
              className="chat-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={busy}
              required
            >
              {CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>

            <label className="chat-form-label" htmlFor="support-booking">Link a booking (optional)</label>
            <select
              id="support-booking"
              className="chat-select"
              value={linkBookingId}
              onChange={(e) => setLinkBookingId(e.target.value)}
              disabled={busy}
            >
              <option value="">No linked booking</option>
              {eligibleBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.doctor?.name || 'Booking'} — {booking.status}
                </option>
              ))}
            </select>

            <label className="chat-form-label" htmlFor="support-message">How can we help?</label>
            <textarea
              id="support-message"
              className="chat-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue"
              disabled={busy}
              required
              minLength={1}
            />

            <button type="submit" className="chat-submit" disabled={busy || !message.trim()}>
              {busy ? 'Opening chat…' : 'Create support ticket'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
