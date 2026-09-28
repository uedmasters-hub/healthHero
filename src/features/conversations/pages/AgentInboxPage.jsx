import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePushBack } from '../../pushNav'
import { useAuth } from '../../auth/hooks/useAuth'
import { listInbox, SUPPORT_CATEGORY, SUPPORT_TICKET_STATUS } from '../index'
import ConversationListItem from '../components/ConversationListItem'
import '../Chat.css'
import { AppBar } from '../../../components/ui'

const STATUS_FILTERS = [
  { id: 'open', label: 'Open', match: (c) => c.support_ticket?.status === SUPPORT_TICKET_STATUS.OPEN },
  { id: 'escalated', label: 'Escalated', match: (c) => c.support_ticket?.status === SUPPORT_TICKET_STATUS.ESCALATED },
  { id: 'resolved', label: 'Resolved', match: (c) => c.support_ticket?.status === SUPPORT_TICKET_STATUS.RESOLVED },
  { id: 'billing', label: 'Billing', match: (c) => c.support_ticket?.category === SUPPORT_CATEGORY.BILLING },
  { id: 'technical', label: 'Technical', match: (c) => c.support_ticket?.category === SUPPORT_CATEGORY.TECHNICAL },
]

/**
 * Agent filter workspace stub — full chrome lands in Phase 2.
 * Gated to staff/admin.
 */
export default function AgentInboxPage() {
  const navigate = useNavigate()
  const goBack = usePushBack('/chat')
  const { appUser, ready } = useAuth()
  const [conversations, setConversations] = useState([])
  const [filter, setFilter] = useState('open')
  const [loading, setLoading] = useState(true)

  const isAgent = appUser?.role === 'staff' || appUser?.role === 'admin'

  const refresh = useCallback(async () => {
    const result = await listInbox()
    setConversations((result.conversations || []).filter((c) => c.kind === 'support'))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!ready || !isAgent) return
    refresh()
  }, [ready, isAgent, refresh])

  const filtered = useMemo(() => {
    const rule = STATUS_FILTERS.find((f) => f.id === filter)
    if (!rule) return conversations
    return conversations.filter(rule.match)
  }, [conversations, filter])

  if (ready && !isAgent) {
    return <Navigate to="/chat" replace />
  }

  return (
    <div className="chat-page">
      <AppBar className="chat-header" title="Support desk" onBack={goBack} />

      <div className="chat-agent-filters" role="toolbar" aria-label="Ticket filters">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="ds-chip ds-chip--sm"
              aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="chat-body">
        {loading ? <p className="ds-page__note chat-loading" role="status">Loading tickets…</p> : null}
        {!loading && !filtered.length ? (
          <div className="ds-empty chat-empty">
            <p className="ds-empty__title">No tickets</p>
            <p className="ds-empty__copy">Nothing matches this filter yet.</p>
          </div>
        ) : (
          <div className="ds-list chat-list">
            {filtered.map((c) => (
              <ConversationListItem
                key={c.id}
                conversation={c}
                onClick={(item) => navigate(`/chat/support/${item.id}`, {
                  state: { returnTo: '/chat/agent', from: 'agent' },
                })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
