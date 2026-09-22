/**
 * Page-level background refresh helpers (non-blocking).
 * UI stays mounted; these only refetch durable sources.
 */
import { isSupabaseConfigured } from '../../lib/supabase'
import { hydrateProviders } from '../providers'
import { getCenters, hydrateCenters } from '../providers/centersRepository'
import { handleNotificationsPull } from './domains'
import { getSyncState, requestFlush } from './syncEngine'

let homeInFlight = null
let treatInFlight = null
let notifInFlight = null
let profileInFlight = null
let centersInFlight = null
let chatInFlight = null

export async function refreshHomeData() {
  if (homeInFlight) return homeInFlight
  homeInFlight = (async () => {
    const tasks = [
      hydrateProviders().catch(() => {}),
      hydrateCenters().catch(() => {}),
    ]
    const { userId } = getSyncState()
    if (userId && isSupabaseConfigured) {
      const { getBookingEngine } = await import('../../booking/engine')
      const { hydrateAppointmentsFromRemote } = await import('../../booking/appointmentSync')
      tasks.push(hydrateAppointmentsFromRemote(getBookingEngine(), userId).catch(() => {}))
      tasks.push(handleNotificationsPull({ userId }).catch(() => {}))
      requestFlush()
    }
    await Promise.all(tasks)
  })().finally(() => { homeInFlight = null })
  return homeInFlight
}

export async function refreshTreatData() {
  if (treatInFlight) return treatInFlight
  treatInFlight = (async () => {
    const { userId } = getSyncState()
    if (!userId || !isSupabaseConfigured) return
    const { getBookingEngine } = await import('../../booking/engine')
    const { hydrateAppointmentsFromRemote } = await import('../../booking/appointmentSync')
    await hydrateAppointmentsFromRemote(getBookingEngine(), userId).catch(() => {})
    requestFlush()
  })().finally(() => { treatInFlight = null })
  return treatInFlight
}

export async function refreshNotificationsData() {
  if (notifInFlight) return notifInFlight
  notifInFlight = (async () => {
    const { userId } = getSyncState()
    if (!userId || !isSupabaseConfigured) return
    await handleNotificationsPull({ userId }).catch(() => {})
  })().finally(() => { notifInFlight = null })
  return notifInFlight
}

export async function refreshProfileData() {
  if (profileInFlight) return profileInFlight
  profileInFlight = (async () => {
    const mod = await import('../../user/store')
    await mod.hydrateProfileFromSupabase().catch(() => {})
    requestFlush()
  })().finally(() => { profileInFlight = null })
  return profileInFlight
}

export async function refreshAppointmentData() {
  return refreshTreatData()
}

export async function refreshCentersData() {
  if (centersInFlight) return centersInFlight
  centersInFlight = hydrateCenters({ force: true }).catch(() => getCenters()).finally(() => { centersInFlight = null })
  return centersInFlight
}

export async function refreshDoctorsData() {
  return refreshHomeData()
}

export async function refreshChatData() {
  if (chatInFlight) return chatInFlight
  chatInFlight = (async () => {
    try {
      const mod = await import('../conversations')
      if (typeof mod.listInbox === 'function') {
        await mod.listInbox()
      }
    } catch {
      /* ignore */
    }
  })().finally(() => { chatInFlight = null })
  return chatInFlight
}

/** Generic tab/list refresh used by settings, pharmacy, articles (best-effort sync). */
export async function refreshPageData() {
  return refreshHomeData()
}
