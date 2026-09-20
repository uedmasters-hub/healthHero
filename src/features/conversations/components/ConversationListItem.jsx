import { formatTicketId } from '../ticket'
import { CONVERSATION_KIND } from '../types'

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function titleFor(conversation) {
  if (conversation.kind === CONVERSATION_KIND.SUPPORT) {
    const ticket = conversation.support_ticket?.ticket_id
    return ticket ? formatTicketId(ticket) : 'Support'
  }
  return conversation.subject || conversation.metadata?.provider_name || 'Care chat'
}

function initials(conversation) {
  if (conversation.kind === CONVERSATION_KIND.SUPPORT) return 'S'
  const name = conversation.metadata?.provider_name || conversation.subject || 'C'
  return String(name).trim().slice(0, 1).toUpperCase() || 'C'
}

export default function ConversationListItem({ conversation, onClick }) {
  const isSupport = conversation.kind === CONVERSATION_KIND.SUPPORT
  return (
    <button type="button" className="chat-list-item" onClick={() => onClick?.(conversation)}>
      <span className={`chat-list-avatar ${isSupport ? 'is-support' : ''}`}>{initials(conversation)}</span>
      <div className="chat-list-main">
        <div className="chat-list-top">
          <p className="chat-list-name">{titleFor(conversation)}</p>
          <span className={`chat-list-badge ${isSupport ? 'is-support' : ''}`}>
            {isSupport ? 'Support' : 'Provider'}
          </span>
        </div>
        <p className="chat-list-preview">
          {conversation.last_message_preview || 'No messages yet'}
        </p>
      </div>
      <div className="chat-list-meta">
        <span className="chat-list-time">{formatTime(conversation.last_message_at)}</span>
        {conversation.unread ? <span className="chat-list-unread" aria-label="Unread" /> : null}
      </div>
    </button>
  )
}
