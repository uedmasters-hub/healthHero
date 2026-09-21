/**
 * Shared realtime channels for appointments + notifications.
 * Conversation realtime stays in features/conversations/realtime.js.
 */
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase'

let channel = null
let activeUserId = null

export function startRealtimeHub({ userId, onAppointmentsChange, onNotificationsChange } = {}) {
  if (!userId || !isSupabaseConfigured) return () => {}
  if (activeUserId === userId && channel) return () => stopRealtimeHub()

  stopRealtimeHub()
  activeUserId = userId
  const sb = requireSupabase()

  channel = sb
    .channel(`sync-hub:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `user_id=eq.${userId}`,
      },
      () => onAppointmentsChange?.(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `patient_id=eq.${userId}`,
      },
      () => onAppointmentsChange?.(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => onNotificationsChange?.(),
    )
    .subscribe()

  return () => stopRealtimeHub()
}

export function stopRealtimeHub() {
  if (!channel) {
    activeUserId = null
    return
  }
  try {
    requireSupabase().removeChannel(channel)
  } catch { /* ignore */ }
  channel = null
  activeUserId = null
}
