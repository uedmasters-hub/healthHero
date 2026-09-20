import { MESSAGE_TYPE, PARTICIPANT_ROLE } from '../types'
import AttachmentCard from './AttachmentCard'

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function SystemEventRow({ text }) {
  return <div className="chat-system-event" role="status">{text}</div>
}

export default function MessageBubble({ message, isMine }) {
  if (message.message_type === MESSAGE_TYPE.SYSTEM || message.sender_role === PARTICIPANT_ROLE.SYSTEM) {
    return <SystemEventRow text={message.body || 'Update'} />
  }

  return (
    <div className={`chat-bubble-row ${isMine ? 'is-mine' : 'is-theirs'}`}>
      <div className="chat-bubble">
        {message.body}
        {(message.attachments || []).map((att) => (
          <AttachmentCard key={att.id} attachment={att} />
        ))}
      </div>
      <span className="chat-bubble-meta">{formatTime(message.created_at)}</span>
    </div>
  )
}
