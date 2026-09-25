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
  return rpcConfirmVisitYes(clientId)
}

export async function rpcConfirmVisitYes(clientId) {
  if (!clientId || !isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) {
    enqueueLifecycle('appointment.confirm_yes', {
      clientId,
      action: 'confirm_yes',
      toStatus: 'completed_pending_provider',
    })
    return { ok: false, deferred: true }
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('confirm_visit_yes', {
      p_client_id: String(clientId),
    })
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    try {
      const sb = requireSupabase()
      const { data, error } = await sb.rpc('confirm_visit_completed', {
        p_client_id: String(clientId),
      })
      if (error) throw error
      return { ok: true, ...(data || {}) }
    } catch {
      enqueueLifecycle('appointment.confirm_yes', {
        clientId,
        action: 'confirm_yes',
      })
      return { ok: false, deferred: true }
    }
  }
}

export async function rpcSubmitPatientVisitReport(clientId, report) {
  if (!clientId || !isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) {
    enqueueLifecycle('appointment.patient_report', {
      clientId,
      action: 'patient_report',
      report,
    })
    return { ok: false, deferred: true }
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('submit_patient_visit_report', {
      p_client_id: String(clientId),
      p_report: report || {},
    })
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    enqueueLifecycle('appointment.patient_report', {
      clientId,
      action: 'patient_report',
      report,
    })
    return { ok: false, deferred: true }
  }
}

export async function rpcProviderCompleteVisit(clientId, outcomes) {
  if (!clientId || !isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) {
    enqueueLifecycle('appointment.provider_complete', {
      clientId,
      action: 'provider_complete',
      outcomes,
      toStatus: 'completed',
    })
    return { ok: false, deferred: true }
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('provider_complete_visit', {
      p_client_id: String(clientId),
      p_outcomes: outcomes || {},
    })
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    enqueueLifecycle('appointment.provider_complete', {
      clientId,
      action: 'provider_complete',
      outcomes,
    })
    return { ok: false, deferred: true }
  }
}

export async function rpcSnoozeVisitConfirmation(clientId, untilIso) {
  return rpcKeepVisitActive(clientId, untilIso)
}

export async function rpcKeepVisitActive(clientId, untilIso) {
  if (!clientId || !isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) {
    enqueueLifecycle('appointment.keep_active', {
      clientId,
      action: 'keep_active',
      until: untilIso,
      toStatus: 'visit_active',
    })
    return { ok: false, deferred: true }
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('keep_visit_active', {
      p_client_id: String(clientId),
      p_reminder_at: untilIso || null,
    })
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    // Fall back to legacy snooze RPC name if migration not yet applied.
    try {
      const sb = requireSupabase()
      const { data, error } = await sb.rpc('snooze_visit_confirmation', {
        p_client_id: String(clientId),
        p_until: untilIso || null,
      })
      if (error) throw error
      return { ok: true, ...(data || {}) }
    } catch {
      enqueueLifecycle('appointment.keep_active', {
        clientId,
        action: 'keep_active',
        until: untilIso,
        toStatus: 'visit_active',
      })
      return { ok: false, deferred: true }
    }
  }
}

export async function rpcSetVisitException(clientId, toStatus, reason, payload) {
  if (!clientId || !toStatus || !isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) {
    enqueueLifecycle('appointment.visit_exception', {
      clientId,
      action: 'exception',
      toStatus,
      reason,
      payload,
    })
    return { ok: false, deferred: true }
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('set_visit_exception', {
      p_client_id: String(clientId),
      p_to_status: String(toStatus),
      p_reason: reason || null,
      p_payload: payload || {},
    })
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    enqueueLifecycle('appointment.visit_exception', {
      clientId,
      action: 'exception',
      toStatus,
      reason,
      payload,
    })
    return { ok: false, deferred: true }
  }
}

export async function rpcCancelAppointmentWithReason(clientId, {
  reason,
  branch = 'cancel',
  note,
  payload,
} = {}) {
  if (!clientId || !isSupabaseConfigured) return { ok: false, deferred: true }
  if (!isOnline()) {
    enqueueLifecycle('appointment.cancel_reason', {
      clientId,
      action: 'cancel',
      reason,
      branch,
      note,
      payload,
      toStatus: branch === 'reschedule' ? 'reschedule_requested' : 'cancelled',
    })
    return { ok: false, deferred: true }
  }
  try {
    const sb = requireSupabase()
    const { data, error } = await sb.rpc('cancel_appointment_with_reason', {
      p_client_id: String(clientId),
      p_reason: reason || 'Cancelled by patient',
      p_branch: branch || 'cancel',
      p_note: note || null,
      p_payload: payload || {},
    })
    if (error) throw error
    return { ok: true, ...(data || {}) }
  } catch {
    enqueueLifecycle('appointment.cancel_reason', {
      clientId,
      action: 'cancel',
      reason,
      branch,
      note,
      payload,
    })
    return { ok: false, deferred: true }
  }
}
