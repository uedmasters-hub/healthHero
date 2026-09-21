import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatTicketId } from '../ticket'
import { formatBookingStatusLabel } from '../bookingChat'
import { CONVERSATION_KIND } from '../types'
import { presentBookingCard } from '../../../booking'
import ProviderAvatar from '../../../components/ProviderAvatar'

function titleCase(value) {
  const raw = String(value || '').replace(/_/g, ' ').trim()
  if (!raw) return '—'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function doctorName(meta, booking, presented) {
  const name = presented?.doctor?.name || meta.provider_name || booking?.doctor?.name
  if (!name) return '—'
  return name.startsWith('Dr.') ? name : `Dr. ${name}`
}

function visitLabel(booking, meta, presented) {
  if (presented?.timeLabel || presented?.dateLabel) {
    return [presented.dateLabel, presented.timeLabel].filter(Boolean).join(' · ') || '—'
  }
  if (booking?.date?.dayName || booking?.slot || booking?.time) {
    const day = booking?.date?.dayName || ''
    const slot = booking?.slot || booking?.time || ''
    return [day, slot].filter(Boolean).join(' · ') || '—'
  }
  return meta.visit_label || '—'
}

export default function ContextCard({ conversation, booking = null, compact = false }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const isSupport = conversation?.kind === CONVERSATION_KIND.SUPPORT
  const ticket = conversation?.support_ticket
  const meta = conversation?.metadata || {}
  const isPharmacy = Boolean(conversation?.pharmacy_order_id || meta.pharmacy)
  const isProvider = !isSupport && !isPharmacy

  const presented = isProvider
    ? presentBookingCard(booking || {
      doctor: {
        id: meta.doctor_id,
        name: meta.provider_name,
        specialty: meta.specialty,
        photo: meta.photo,
      },
      providerName: meta.provider_name,
      serviceType: 'doctor_consultation',
    })
    : null

  const statusLabel = formatBookingStatusLabel(
    booking?.status || meta.booking_status || conversation?.status,
  )

  const title = isSupport
    ? (ticket?.ticket_id ? formatTicketId(ticket.ticket_id) : 'Support ticket')
    : doctorName(meta, booking, presented)

  const subtitle = isSupport
    ? `${titleCase(ticket?.category || 'general')} · ${titleCase(ticket?.status || conversation?.status || 'open')}`
    : [
        presented?.doctor?.specialty || meta.specialty || booking?.doctor?.specialty || '',
        statusLabel,
      ].filter(Boolean).join(' · ') || 'Care chat'

  const linkedBookingLabel = booking?.doctor?.name || presented?.doctor?.name
    ? `${doctorName(meta, booking, presented)}${statusLabel ? ` · ${statusLabel}` : ''}`
    : (conversation?.booking_ref || null)

  const visitType = String(booking?.visitType || meta.visit_type || '').toLowerCase()
  const isVideo = visitType === 'video' || visitType.includes('video')

  return (
    <div className={`chat-context ${compact ? 'is-compact' : ''} ${isProvider ? 'is-provider' : ''}`}>
      <button
        type="button"
        className="chat-context-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="chat-context-toggle-main">
          {isProvider ? (
            <ProviderAvatar
              className="chat-context-avatar"
              doctor={presented?.doctor}
              src={presented?.photo || meta.photo}
              size={40}
            />
          ) : null}
          <span>
            <strong>{isSupport && compact ? 'Ticket details' : (isProvider ? 'Appointment' : title)}</strong>
            <span>{subtitle}</span>
          </span>
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
                <b>{meta.order_status || statusLabel || 'pending'}</b>
              </div>
              <div className="chat-context-row">
                <span>ETA</span>
                <b>{meta.eta || 'Updating…'}</b>
              </div>
            </>
          ) : (
            <>
              <div className="chat-context-row">
                <span>Doctor</span>
                <b>{doctorName(meta, booking, presented)}</b>
              </div>
              <div className="chat-context-row">
                <span>Specialty</span>
                <b>{presented?.doctor?.specialty || meta.specialty || booking?.doctor?.specialty || '—'}</b>
              </div>
              <div className="chat-context-row">
                <span>Visit</span>
                <b>{visitLabel(booking, meta, presented)}</b>
              </div>
              <div className="chat-context-row">
                <span>Status</span>
                <b>{statusLabel || '—'}</b>
              </div>
              <div className="chat-context-actions">
                {isVideo ? (
                  <button
                    type="button"
                    className="chat-context-action"
                    onClick={() => navigate('/prepare-visit', {
                      state: { bookingId: booking?.id || conversation.booking_ref },
                    })}
                  >
                    Join Consultation
                  </button>
                ) : null}
                <button
                  type="button"
                  className="chat-context-action"
                  onClick={() => navigate('/profile/records', {
                    state: {
                      intent: 'upload_prescription',
                      bookingId: booking?.id || conversation.booking_ref,
                    },
                  })}
                >
                  Upload Prescription
                </button>
                <button
                  type="button"
                  className="chat-context-action"
                  onClick={() => navigate('/profile/records', {
                    state: {
                      intent: 'share_report',
                      bookingId: booking?.id || conversation.booking_ref,
                    },
                  })}
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
