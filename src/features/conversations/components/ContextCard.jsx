import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatTicketId } from '../ticket'
import { CONVERSATION_KIND } from '../types'

function titleCase(value) {
  const raw = String(value || '').replace(/_/g, ' ').trim()
  if (!raw) return '—'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function ContextCard({ conversation, booking = null, compact = false }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(!compact)
  const isSupport = conversation?.kind === CONVERSATION_KIND.SUPPORT
  const ticket = conversation?.support_ticket
  const meta = conversation?.metadata || {}
  const isPharmacy = Boolean(conversation?.pharmacy_order_id || meta.pharmacy)

  const title = isSupport
    ? (ticket?.ticket_id ? formatTicketId(ticket.ticket_id) : 'Support ticket')
    : (meta.provider_name || booking?.doctor?.name || conversation?.subject || 'Care conversation')

  const subtitle = isSupport
    ? `${titleCase(ticket?.category || 'general')} · ${titleCase(ticket?.status || conversation?.status || 'open')}`
    : (meta.specialty || booking?.doctor?.specialty || booking?.status || 'Booking chat')

  const linkedBookingLabel = booking?.doctor?.name
    ? `${booking.doctor.name}${booking.status ? ` · ${booking.status}` : ''}`
    : (conversation?.booking_ref || null)

  return (
    <div className={`chat-context ${compact ? 'is-compact' : ''}`}>
      <button
        type="button"
        className="chat-context-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          <strong>{isSupport && compact ? 'Ticket details' : title}</strong>
          <span>{subtitle}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points={open ? '6 14 12 8 18 14' : '6 10 12 16 18 10'} />
        </svg>
      </button>

      {open ? (
        <div className="chat-context-body">
          {isSupport ? (
            <>
              <div className="chat-context-row">
                <span>Category</span>
                <b>{titleCase(ticket?.category || meta.category || 'general')}</b>
              </div>
              <div className="chat-context-row">
                <span>Status</span>
                <b>{titleCase(ticket?.status || conversation?.status || 'open')}</b>
              </div>
              <div className="chat-context-row">
                <span>Linked booking</span>
                <b>{linkedBookingLabel || 'None'}</b>
              </div>
              {!compact ? (
                <div className="chat-context-row">
                  <span>Team</span>
                  <b>{ticket?.assigned_team || 'Care Support'}</b>
                </div>
              ) : null}
            </>
          ) : isPharmacy ? (
            <>
              <div className="chat-context-row">
                <span>Order</span>
                <b>{conversation.pharmacy_order_id || conversation.booking_ref || '—'}</b>
              </div>
              <div className="chat-context-row">
                <span>Status</span>
                <b>{meta.order_status || booking?.status || 'pending'}</b>
              </div>
              <div className="chat-context-row">
                <span>ETA</span>
                <b>{meta.eta || 'Updating…'}</b>
              </div>
            </>
          ) : (
            <>
              <div className="chat-context-row">
                <span>Provider</span>
                <b>{meta.provider_name || booking?.doctor?.name || '—'}</b>
              </div>
              <div className="chat-context-row">
                <span>Specialty</span>
                <b>{meta.specialty || booking?.doctor?.specialty || '—'}</b>
              </div>
              <div className="chat-context-row">
                <span>Visit</span>
                <b>
                  {booking?.date?.dayName
                    ? `${booking.date.dayName} · ${booking.slot || ''}`
                    : (meta.visit_label || '—')}
                </b>
              </div>
              <div className="chat-context-row">
                <span>Status</span>
                <b>{booking?.status || conversation?.status || '—'}</b>
              </div>
              <div className="chat-context-actions">
                {booking?.visitType === 'video' || meta.visit_type === 'video' ? (
                  <button
                    type="button"
                    className="chat-context-action"
                    onClick={() => navigate('/prepare-visit', { state: { bookingId: booking?.id || conversation.booking_ref } })}
                  >
                    Join Consultation
                  </button>
                ) : null}
                <button
                  type="button"
                  className="chat-context-action"
                  onClick={() => navigate('/profile/records')}
                >
                  Upload Prescription
                </button>
                <button
                  type="button"
                  className="chat-context-action"
                  onClick={() => navigate('/profile/records')}
                >
                  Share Report
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
