/**
 * Domain mirrors — live push with outbox fallback. No React / engine imports
 * (avoids cycles with booking engine + user store).
 */
import { isSupabaseConfigured } from '../../lib/supabase'
import { isOnline } from './connectivity'
import { enqueueOutbox } from './outbox'
import { pushProfileToSupabase } from './profileSync'
import { syncAppointmentRecord } from '../../booking/appointmentSync'

function enqueue(type, payload) {
  return enqueueOutbox({ type, payload })
}

/** Prefer live appointment upsert; enqueue when offline or failed. */
export async function mirrorAppointment(record, userId) {
  if (!record?.id || !userId) return null
  if (!isOnline() || !isSupabaseConfigured) {
    enqueue('appointment.upsert', { userId, recordId: record.id })
    return null
  }
  const id = await syncAppointmentRecord(record, userId)
  if (!id) {
    enqueue('appointment.upsert', { userId, recordId: record.id })
  }
  return id
}

/** Prefer live profile push; enqueue when offline or failed. */
export async function mirrorProfile(userId, profile, credentials) {
  if (!userId) return { ok: false }
  if (!isOnline() || !isSupabaseConfigured) {
    enqueue('profile.push', { userId, profile, credentials })
    return { ok: false, deferred: true }
  }
  const result = await pushProfileToSupabase(userId, profile || {}, credentials || {})
  if (!result?.ok) {
    enqueue('profile.push', { userId, profile, credentials })
  }
  return result
}
