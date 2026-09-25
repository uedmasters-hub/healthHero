import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOriginBack } from '../../pushNav'
import { useAuth } from '../../auth/hooks/useAuth'
import { chatLaunchState, listInbox, subscribeInbox } from '../index'
import { CONVERSATION_KIND } from '../types'
import ConversationListItem from '../components/ConversationListItem'
import { usePullToRefresh } from '../../../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../../../components/PullToRefreshIndicator'
import { refreshChatData } from '../../sync/pageRefresh'
import '../Chat.css'

function threadPath(conversation) {
  if (conversation?.kind === CONVERSATION_KIND.SUPPORT) {
    return `/chat/support/${conversation.id}`
  }
  return `/chat/${conversation.id}`
}

export default function ChatInboxPage() {
  const navigate = useNavigate()
  const goBack = useOriginBack('/')
  const { user, ready } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [conversations, setConversations] = useState([])
  const scrollRef = useRef(null)
  const paintedRef = useRef(false)

  const refresh = useCallback(async ({ background = false } = {}) => {
    if (!background && !paintedRef.current && !conversations.length) {
      setLoading(true)
    }
    const result = await listInbox()
    if (!result.ok) {
      setError(result.error || 'Could not load conversations.')
      if (!paintedRef.current) setConversations([])
    } else {
      setError('')
      setConversations(result.conversations || [])
    }
    paintedRef.current = true
    setLoading(false)
  }, [conversations.length])

  const onRefresh = useCallback(async () => {
    await refreshChatData()
    await refresh({ background: true })
  }, [refresh])
  const ptr = usePullToRefresh(scrollRef, onRefresh)

  useEffect(() => {
    if (!ready) return undefined
    let cancelled = false
    // Staged: screen mounts immediately; hydrate in background without blocking.
    refresh({ background: true }).catch(() => {})
    const unsubscribe = subscribeInbox(user?.id, {
      onChange: () => {
        if (!cancelled) refresh({ background: true })
      },
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [ready, user?.id, refresh])

  const openThread = (item) => {
    navigate(threadPath(item), {
      state: chatLaunchState('/chat', { from: 'inbox' }),
    })
  }

  const openNew = () => {
    navigate('/chat/new', {
      state: chatLaunchState('/chat', { from: 'inbox' }),
    })
  }

  const provider = conversations.filter((c) => c.kind === CONVERSATION_KIND.PROVIDER)
  const support = conversations.filter((c) => c.kind === CONVERSATION_KIND.SUPPORT)
  const showEmpty = !loading && !conversations.length

  return (
    <div className="chat-page page-push-in">
      <header className="chat-header">
        <button type="button" className="chat-header-back" onClick={goBack} aria-label="Back" data-push-back>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="chat-header-title">Chat</h1>
        <button type="button" className="chat-header-action" onClick={openNew}>
          New
        </button>
      </header>

      <div className="chat-body" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        {loading && !conversations.length ? <p className="chat-loading">Loading conversations…</p> : null}
        {error ? <p className="chat-banner" role="alert">{error}</p> : null}

        {showEmpty ? (
          <div className="chat-empty">
            <h2>Your messages</h2>
            <p>Chat with your care providers about a booking, or open a support ticket.</p>
            <button type="button" className="chat-empty-cta" onClick={openNew}>
              Start a conversation
            </button>
          </div>
        ) : null}

        {provider.length ? (
          <>
            <p className="chat-section-label">Care providers</p>
            <div className="chat-list">
              {provider.map((c) => (
                <ConversationListItem
                  key={c.id}
                  conversation={c}
                  onClick={openThread}
                />
              ))}
            </div>
          </>
        ) : null}

        {support.length ? (
          <>
            <p className="chat-section-label">Support tickets</p>
            <div className="chat-list">
              {support.map((c) => (
                <ConversationListItem
                  key={c.id}
                  conversation={c}
                  onClick={openThread}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
