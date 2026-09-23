/**
 * Supabase RPCs for atomic appointment lifecycle transitions.
 * Prefer these over plain upserts so appointment_history + notifications stay consistent.
 */
import { requireSupabase, isSupabaseConfigured } from '../lib/supabase'
import { enqueueOutbox } from '../features/sync/outbox'
import { isOnline } from '../features/sync/connectivity'

function enqueueLifecycle(type, payload) {
  return enqueueOutbox({
    type,
    id: `${type}:${payload.clientId}:${payload.toStatus || payload.action || 'x'}`,
    payload,
  })
}

export async function rpcAdvanceAppointment(clientId) {
  if (!clientId || !isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) {
    enqueueLifecycle('appointment.lifecycle_advance', { clientId, action: 'advance' })
    return { ok: false, deferred: true }
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('advance_appointment_lifecycle', {
      p_client_id: String(clientId),
    })
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    enqueueLifecycle('appointment.lifecycle_advance', { clientId, action: 'advance' })
    return { ok: false, deferred: true }
  }
}

export async function rpcAdvanceMyAppointments() {
  if (!isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) return { ok: false, deferred: true }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('advance_my_appointments')
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    return { ok: false }
  }
}

export async function rpcConfirmVisitCompleted(clientId) {
  if (!clientId || !isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) {
    enqueueLifecycle('appointment.complete', {
      clientId,
      action: 'complete',
      toStatus: 'completed',
    })
    return { ok: false, deferred: true }
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('confirm_visit_completed', {
      p_client_id: String(clientId),
    })
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    enqueueLifecycle('appointment.complete', {
      clientId,
      action: 'complete',
      toStatus: 'completed',
    })
    return { ok: false, deferred: true }
  }
}

export async function rpcSnoozeVisitConfirmation(clientId, untilIso) {
  if (!clientId || !isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) {
    enqueueLifecycle('appointment.lifecycle_snooze', {
      clientId,
      action: 'snooze',
      until: untilIso,
    })
    return { ok: false, deferred: true }
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('snooze_visit_confirmation', {
      p_client_id: String(clientId),
      p_until: untilIso || null,
    })
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    enqueueLifecycle('appointment.lifecycle_snooze', {
      clientId,
      action: 'snooze',
      until: untilIso,
    })
    return { ok: false, deferred: true }
  }
}
