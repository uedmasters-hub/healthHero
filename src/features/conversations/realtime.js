/**
 * Supabase Realtime subscriptions for Conversation Center.
 */
import { requireSupabase } from '../../lib/supabase'

/**
 * Subscribe to new messages + events for a conversation.
 * @returns {() => void} unsubscribe
 */
export function subscribeConversation(conversationId, {
  onMessage,
  onEvent,
  onConversation,
} = {}) {
  if (!conversationId) return () => {}
  const supabase = requireSupabase()
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage?.(payload.new),
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_events',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onEvent?.(payload.new),
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`,
      },
      (payload) => onConversation?.(payload.new),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/** Inbox-level updates when any of the user's conversations change. */
export function subscribeInbox(userId, { onChange } = {}) {
  if (!userId) return () => {}
  const supabase = requireSupabase()
  const channel = supabase
    .channel(`inbox:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      () => onChange?.(),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      () => onChange?.(),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
