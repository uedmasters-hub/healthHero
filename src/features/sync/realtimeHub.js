/**
 * Shared realtime channels for appointments + notifications.
 * Conversation realtime stays in features/conversations/realtime.js.
 *
 * Notifications: apply postgres_changes payloads immediately (instant UI).
 * Re-subscribes on channel errors; callers also re-start on online/visibility.
 */
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase'

let channel = null
let activeUserId = null
let activeHandlers = null
let restartTimer = null
let status = 'idle'

function clearRestartTimer() {
  if (restartTimer && typeof window !== 'undefined') {
    window.clearTimeout(restartTimer)
  }
  restartTimer = null
}

export function getRealtimeHubStatus() {
  return { status, userId: activeUserId, subscribed: Boolean(channel) }
}

export function startRealtimeHub({
  userId,
  onAppointmentsChange,
  onNotificationEvent,
  onNotificationsChange,
  onStatus,
} = {}) {
  if (!userId || !isSupabaseConfigured) return () => {}

  activeHandlers = {
    userId,
    onAppointmentsChange,
    onNotificationEvent,
    onNotificationsChange,
    onStatus,
  }

  if (activeUserId === userId && channel) {
    return () => stopRealtimeHub()
  }

  stopRealtimeHub({ preserveHandlers: true })
  activeUserId = userId
  const sb = requireSupabase()
  const topic = `sync-hub:${userId}:${Date.now().toString(36)}`

  channel = sb
    .channel(topic)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `user_id=eq.${userId}`,
      },
      () => activeHandlers?.onAppointmentsChange?.(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `patient_id=eq.${userId}`,
      },
      () => activeHandlers?.onAppointmentsChange?.(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // Instant path only — full pulls run on bootstrap / reconnect / resume.
        activeHandlers?.onNotificationEvent?.(payload)
      },
    )
    .subscribe((nextStatus, err) => {
      status = nextStatus || 'unknown'
      activeHandlers?.onStatus?.(status, err)
      // Auto-resubscribe on channel-level failures.
      if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
        scheduleRestart(1200)
      }
    })

  return () => stopRealtimeHub()
}

function scheduleRestart(delayMs = 1000) {
  if (typeof window === 'undefined') return
  if (!activeHandlers?.userId) return
  clearRestartTimer()
  restartTimer = window.setTimeout(() => {
    restartTimer = null
    const handlers = activeHandlers
    if (!handlers?.userId) return
    // Force a fresh channel
    activeUserId = null
    if (channel) {
      try { requireSupabase().removeChannel(channel) } catch { /* ignore */ }
      channel = null
    }
    startRealtimeHub(handlers)
  }, delayMs)
}

export function restartRealtimeHub() {
  if (!activeHandlers?.userId) return
  activeUserId = null
  startRealtimeHub(activeHandlers)
}

export function stopRealtimeHub({ preserveHandlers = false } = {}) {
  clearRestartTimer()
  if (channel) {
    try {
      requireSupabase().removeChannel(channel)
    } catch { /* ignore */ }
  }
  channel = null
  activeUserId = null
  status = 'idle'
  if (!preserveHandlers) activeHandlers = null
}
