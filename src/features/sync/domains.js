/**
 * Domain sync handlers used by SyncEngine outbox + realtime.
 */
import { isSupabaseConfigured } from '../../lib/supabase'
import { pushProfileToSupabase } from './profileSync'
import { syncAppointmentRecord } from '../../booking/appointmentSync'
import {
  fetchRemoteNotifications,
  mapRemoteRow,
  upsertRemoteNotification,
  markRemoteRead,
  markAllRemoteRead,
  deleteRemoteNotification,
  deleteAllRemote,
} from '../notifications/remote'
import * as notifService from '../notifications/service'

export async function handleProfilePush({ userId, profile, credentials }) {
  if (!userId || !isSupabaseConfigured) return { ok: false, deferred: true }
  return pushProfileToSupabase(userId, profile || {}, credentials || {})
}

export async function handleAppointmentUpsert({ userId, recordId }) {
  if (!userId || !recordId || !isSupabaseConfigured) return { ok: false, deferred: true }
  const { getBookingEngine } = await import('../../booking/engine')
  const record = getBookingEngine().getById(recordId)
  if (!record) return { ok: true, skipped: true }
  const id = await syncAppointmentRecord(record, userId)
  return { ok: Boolean(id), appointmentId: id }
}

/**
 * Pull remote notifications and REPLACE the local mirror (remote is SSOT).
 * Stale responses are discarded via pull generation.
 */
export async function handleNotificationsPull({ userId }) {
  if (!userId || !isSupabaseConfigured) return { ok: false, deferred: true }

  const generation = notifService.beginPullGeneration()
  const result = await fetchRemoteNotifications(userId)
  if (!result.ok) {
    if (result.deferred) return result
    return { ok: false, error: result.error }
  }

  const mapped = (result.rows || []).map(mapRemoteRow).filter(Boolean)
  const applied = notifService.applyRemoteSnapshot(userId, mapped, { generation })
  if (applied?.stale) return { ok: true, stale: true }
  return {
    ok: true,
    count: applied.count,
    unreadCount: applied.unreadCount,
  }
}

export async function handleNotificationUpsert({ userId, notification }) {
  if (!userId || !notification) return { ok: false, deferred: true }
  return upsertRemoteNotification(userId, notification)
}

export async function handleNotificationsMarkRead({ userId, ids }) {
  if (!userId) return { ok: false, deferred: true }
  const result = await markRemoteRead(userId, ids || [])
  if (result?.ok) notifService.clearPendingRead(ids || [])
  return result
}

export async function handleNotificationsMarkAllRead({ userId }) {
  if (!userId) return { ok: false, deferred: true }
  const result = await markAllRemoteRead(userId)
  if (result?.ok) notifService.clearPendingMarkAllRead()
  return result
}

export async function handleNotificationDelete({ userId, id }) {
  if (!userId || !id) return { ok: false, deferred: true }
  const result = await deleteRemoteNotification(userId, id)
  if (result?.ok) notifService.clearPendingDelete(id)
  return result
}

export async function handleNotificationsDeleteAll({ userId }) {
  if (!userId) return { ok: false, deferred: true }
  const result = await deleteAllRemote(userId)
  if (result?.ok) notifService.clearPendingDeleteAll()
  return result
}

export async function runOutboxJob(job) {
  switch (job.type) {
    case 'profile.push':
      return handleProfilePush(job.payload || {})
    case 'appointment.upsert':
      return handleAppointmentUpsert(job.payload || {})
    case 'notifications.pull':
      return handleNotificationsPull(job.payload || {})
    case 'notifications.upsert':
      return handleNotificationUpsert(job.payload || {})
    case 'notifications.mark_read':
      return handleNotificationsMarkRead(job.payload || {})
    case 'notifications.mark_all_read':
      return handleNotificationsMarkAllRead(job.payload || {})
    case 'notifications.delete':
      return handleNotificationDelete(job.payload || {})
    case 'notifications.delete_all':
      return handleNotificationsDeleteAll(job.payload || {})
    // Legacy bulk push — no-op (prevents re-uploading stale local seed lists)
    case 'notifications.push':
      return { ok: true, skipped: true }
    default:
      return { ok: false, error: `Unknown job type: ${job.type}` }
  }
}
