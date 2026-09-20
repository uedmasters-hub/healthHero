import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { usePushBack } from '../../pushNav'
import { useAuth } from '../../auth/hooks/useAuth'
import { useBookingById } from '../../../booking'
import {
  filterThreadItems,
  getConversation,
  listEvents,
  listMessages,
  markRead,
  sendMessage,
  subscribeConversation,
  uploadChatAttachment,
  CONVERSATION_KIND,
  MESSAGE_TYPE,
  PARTICIPANT_ROLE,
} from '../index'
import ContextCard from '../components/ContextCard'
import MessageBubble, { SystemEventRow } from '../components/MessageBubble'
import ChatComposer from '../components/ChatComposer'
import { formatTicketId } from '../ticket'
import '../Chat.css'

const AGENT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'customer', label: 'Customer' },
  { id: 'agent', label: 'Agent' },
  { id: 'media', label: 'Media' },
  { id: 'system', label: 'System' },
]

function titleCase(value) {
  const raw = String(value || '').replace(/_/g, ' ').trim()
  if (!raw) return ''
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export default function ConversationThreadPage({ supportRoute = false } = {}) {
  const { conversationId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const goBack = usePushBack('/chat')
  const { user, appUser } = useAuth()
  const seed = location.state?.conversation || null
  const [conversation, setConversation] = useState(seed)
  const [messages, setMessages] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const bottomRef = useRef(null)

  const booking = useBookingById(conversation?.booking_ref)
  const isAgent = appUser?.role === 'staff' || appUser?.role === 'admin'
  const isSupport = conversation?.kind === CONVERSATION_KIND.SUPPORT
    || supportRoute
    || Boolean(conversation?.support_ticket)

  const load = useCallback(async () => {
    if (!conversationId) return
    const [convResult, msgResult, eventResult] = await Promise.all([
      getConversation(conversationId),
      listMessages(conversationId),
      listEvents(conversationId),
    ])
    if (!convResult.ok) {
      setError(convResult.error || 'Conversation not found.')
      setLoading(false)
      return
    }
    setConversation(convResult.conversation)
    setMessages(msgResult.messages || [])
    setEvents(eventResult.events || [])
    setLoading(false)
    if (user?.id) markRead(conversationId, user.id)
  }, [conversationId, user?.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!conversationId) return undefined
    return subscribeConversation(conversationId, {
      onMessage: (row) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id || (row.client_id && m.client_id === row.client_id))) {
            return prev
          }
          return [...prev, { ...row, attachments: row.attachments || [] }]
        })
        if (user?.id) markRead(conversationId, user.id)
      },
      onEvent: (row) => {
        setEvents((prev) => (prev.some((e) => e.id === row.id) ? prev : [...prev, row]))
      },
      onConversation: (row) => {
        setConversation((prev) => (prev ? { ...prev, ...row } : row))
      },
    })
  }, [conversationId, user?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const onKeyboardInsetChange = useCallback((inset) => {
    if (inset > 0) {
      // Keep the latest message visible while the composer lifts with the keyboard.
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [])

  // Canonical support URL when opened via /chat/:id
  useEffect(() => {
    if (
      !loading
      && conversation?.kind === CONVERSATION_KIND.SUPPORT
      && !supportRoute
      && conversationId
    ) {
      navigate(`/chat/support/${conversationId}`, { replace: true, state: location.state })
    }
  }, [loading, conversation?.kind, supportRoute, conversationId, navigate, location.state])

  if (
    !loading
    && supportRoute
    && conversation
    && conversation.kind
    && conversation.kind !== CONVERSATION_KIND.SUPPORT
  ) {
    return <Navigate to={`/chat/${conversationId}`} replace />
  }

  const filtered = useMemo(() => {
    if (!isAgent || filter === 'all') return { messages, events }
    return filterThreadItems({
      messages,
      events,
      customerOnly: filter === 'customer',
      agentOnly: filter === 'agent',
      mediaOnly: filter === 'media',
      systemOnly: filter === 'system',
    })
  }, [messages, events, filter, isAgent])

  const ticket = conversation?.support_ticket
  const ticketId = formatTicketId(ticket?.ticket_id)
  const ticketStatus = titleCase(ticket?.status || conversation?.status || 'open')
  const ticketCategory = titleCase(ticket?.category || conversation?.metadata?.category || 'general')

  const title = isSupport
    ? ticketId
    : (conversation?.metadata?.provider_name || conversation?.subject || 'Chat')

  const onSend = async (text) => {
    if (!user?.id || !conversationId || sending) return
    setSending(true)
    setError('')
    const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const optimistic = {
      id: clientId,
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: isAgent ? PARTICIPANT_ROLE.SUPPORT_AGENT : PARTICIPANT_ROLE.PATIENT,
      message_type: MESSAGE_TYPE.TEXT,
      body: text,
      client_id: clientId,
      created_at: new Date().toISOString(),
      attachments: [],
    }
    setMessages((prev) => [...prev, optimistic])
    try {
      const result = await sendMessage({
        conversationId,
        userId: user.id,
        senderRole: isAgent ? PARTICIPANT_ROLE.SUPPORT_AGENT : PARTICIPANT_ROLE.PATIENT,
        body: text,
        clientId,
      })
      if (!result.ok) {
        setError(result.error || 'Could not send.')
        setMessages((prev) => prev.filter((m) => m.client_id !== clientId))
        return
      }
      setMessages((prev) => prev.map((m) => (m.client_id === clientId ? { ...result.message, attachments: [] } : m)))
    } finally {
      setSending(false)
    }
  }

  const onAttach = async (file) => {
    if (!user?.id || !conversationId || sending) return
    setSending(true)
    setError('')
    try {
      const result = await uploadChatAttachment({
        conversationId,
        userId: user.id,
        senderRole: isAgent ? PARTICIPANT_ROLE.SUPPORT_AGENT : PARTICIPANT_ROLE.PATIENT,
        file,
      })
      if (!result.ok) {
        setError(result.error || 'Upload failed.')
        return
      }
      await load()
    } finally {
      setSending(false)
    }
  }

  const timeline = useMemo(() => {
    const rows = []
    filtered.messages.forEach((m) => {
      rows.push({ sort: m.created_at, type: 'message', item: m })
    })
    if (filter === 'all' || filter === 'system') {
      filtered.events.forEach((e) => {
        if (e.event_type === 'created') return
        rows.push({
          sort: e.created_at,
          type: 'event',
          item: e,
        })
      })
    }
    return rows.sort((a, b) => new Date(a.sort) - new Date(b.sort))
  }, [filtered, filter])

  const composerReady = Boolean(conversation) && !loading && !error

  return (
    <div className={`chat-page page-push-in ${isSupport ? 'is-support-thread' : ''}`}>
      <header className={`chat-header ${isSupport ? 'is-support' : ''}`}>
        <button type="button" className="chat-header-back" onClick={goBack} aria-label="Back" data-push-back>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="chat-header-copy">
          <h1 className="chat-header-title">{loading && !title ? 'Opening…' : title}</h1>
          {isSupport ? (
            <p className="chat-header-sub">
              <span className="chat-header-pill is-status">{ticketStatus || 'Open'}</span>
              <span className="chat-header-dot" aria-hidden="true">·</span>
              <span>{ticketCategory || 'Support'}</span>
            </p>
          ) : null}
        </div>
        {isAgent ? (
          <button type="button" className="chat-header-action" onClick={() => navigate('/chat/agent')}>
            Filters
          </button>
        ) : null}
      </header>

      {isAgent ? (
        <div className="chat-agent-filters" role="toolbar" aria-label="Message filters">
          {AGENT_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chat-agent-chip ${filter === item.id ? 'is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="chat-thread">
        <div className="chat-thread-scroll">
          {loading && !conversation ? <p className="chat-loading">Opening conversation…</p> : null}
          {error ? <p className="chat-banner" role="alert">{error}</p> : null}

          {conversation ? (
            <ContextCard
              conversation={conversation}
              booking={booking}
              compact={isSupport}
            />
          ) : null}

          {timeline.map((row) => {
            if (row.type === 'event') {
              return (
                <SystemEventRow
                  key={`e-${row.item.id}`}
                  text={`${row.item.event_type.replace(/_/g, ' ')}`}
                />
              )
            }
            const mine = row.item.sender_id === user?.id
            return (
              <MessageBubble
                key={row.item.id || row.item.client_id}
                message={row.item}
                isMine={mine}
              />
            )
          })}
          <div ref={bottomRef} />
        </div>

        <ChatComposer
          disabled={!composerReady}
          sending={sending}
          onSend={onSend}
          onAttach={onAttach}
          onKeyboardInsetChange={onKeyboardInsetChange}
        />
      </div>
    </div>
  )
}
