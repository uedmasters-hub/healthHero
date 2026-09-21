/**
 * Remote notification API — Supabase is SSOT for authenticated users.
 */
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase'
import { createNotification } from './models'

export function mapRemoteRow(row) {
  if (!row) return null
  const id = String(row.source_id || row.id)
  return createNotification({
    id,
    title: row.title || 'Notification',
    body: row.body || '',
    type: row.data?.type || 'system',
    to: row.data?.to || '',
    unread: row.status !== 'read',
    timestamp: row.created_at || new Date().toISOString(),
    // keep remote identity for mutations
    remoteId: row.id,
  })
}

export async function fetchRemoteNotifications(userId, { limit = 80 } = {}) {
  if (!userId || !isSupabaseConfigured) {
    return { ok: false, deferred: true, rows: [] }
  }
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select('id, source_id, title, body, data, status, created_at, read_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { ok: false, error: error.message, rows: [] }
  return { ok: true, rows: data || [] }
}

export async function upsertRemoteNotification(userId, notification) {
  if (!userId || !notification?.id || !isSupabaseConfigured) {
    return { ok: false, deferred: true }
  }
  const row = {
    user_id: userId,
    source_id: String(notification.id),
    channel: 'in_app',
    title: notification.title || 'Notification',
    body: notification.body || '',
    data: {
      to: notification.to || null,
      type: notification.type || null,
    },
    status: notification.unread === false ? 'read' : 'sent',
    read_at: notification.unread === false ? (notification.readAt || new Date().toISOString()) : null,
    sent_at: new Date().toISOString(),
  }
  const { data, error } = await requireSupabase()
    .from('notifications')
    .upsert(row, { onConflict: 'user_id,source_id' })
    .select('id, source_id, title, body, data, status, created_at, read_at')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  return { ok: true, row: data }
}

export async function markRemoteRead(userId, ids = []) {
  if (!userId || !isSupabaseConfigured) return { ok: false, deferred: true }
  const sourceIds = ids.map(String).filter(Boolean)
  if (!sourceIds.length) return { ok: true, skipped: true }

  const now = new Date().toISOString()
  const sb = requireSupabase()

  // Match by source_id (client ids) OR primary id (server-only rows)
  const { error: bySource } = await sb
    .from('notifications')
    .update({ status: 'read', read_at: now })
    .eq('user_id', userId)
    .in('source_id', sourceIds)

  if (bySource) return { ok: false, error: bySource.message }

  const { error: byId } = await sb
    .from('notifications')
    .update({ status: 'read', read_at: now })
    .eq('user_id', userId)
    .in('id', sourceIds)

  // id filter may fail if values aren't UUIDs — ignore that class of error
  if (byId && !/invalid input syntax|uuid/i.test(byId.message || '')) {
    return { ok: false, error: byId.message }
  }
  return { ok: true }
}

export async function markAllRemoteRead(userId) {
  if (!userId || !isSupabaseConfigured) return { ok: false, deferred: true }
  const now = new Date().toISOString()
  const { error } = await requireSupabase()
    .from('notifications')
    .update({ status: 'read', read_at: now })
    .eq('user_id', userId)
    .neq('status', 'read')

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deleteRemoteNotification(userId, id) {
  if (!userId || !id || !isSupabaseConfigured) return { ok: false, deferred: true }
  const sb = requireSupabase()
  const sourceId = String(id)

  const { error: bySource } = await sb
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('source_id', sourceId)
  if (bySource) return { ok: false, error: bySource.message }

  const { error: byId } = await sb
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('id', sourceId)
  if (byId && !/invalid input syntax|uuid/i.test(byId.message || '')) {
    return { ok: false, error: byId.message }
  }
  return { ok: true }
}

export async function deleteAllRemote(userId) {
  if (!userId || !isSupabaseConfigured) return { ok: false, deferred: true }
  const { error } = await requireSupabase()
    .from('notifications')
    .delete()
    .eq('user_id', userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
