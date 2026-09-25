/**
 * Local + Supabase persistence for discovery location preferences.
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import {
  LOCATION_CACHE_KEY,
  LOCATION_RECENTS_MAX,
  DEFAULT_SEARCH_RADIUS_KM,
  clampRadiusKm,
} from './constants'

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function readLocalLocationCache() {
  if (typeof localStorage === 'undefined') return null
  const data = safeParse(localStorage.getItem(LOCATION_CACHE_KEY))
  if (!data || typeof data !== 'object') return null
  const latitude = Number(data.latitude)
  const longitude = Number(data.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      locality: null,
      latitude: null,
      longitude: null,
      source: data.source || 'cached',
      radiusKm: clampRadiusKm(data.radiusKm, DEFAULT_SEARCH_RADIUS_KM),
      recent: Array.isArray(data.recent) ? data.recent : [],
      updatedAt: data.updatedAt || null,
    }
  }
  return {
    locality: data.locality || null,
    latitude,
    longitude,
    source: data.source || 'cached',
    radiusKm: clampRadiusKm(data.radiusKm, DEFAULT_SEARCH_RADIUS_KM),
    recent: Array.isArray(data.recent) ? data.recent : [],
    updatedAt: data.updatedAt || null,
  }
}

export function writeLocalLocationCache(patch) {
  if (typeof localStorage === 'undefined') return null
  const prev = readLocalLocationCache() || {
    locality: null,
    latitude: null,
    longitude: null,
    source: 'cached',
    radiusKm: DEFAULT_SEARCH_RADIUS_KM,
    recent: [],
  }
  const next = {
    ...prev,
    ...patch,
    radiusKm: clampRadiusKm(patch.radiusKm ?? prev.radiusKm, DEFAULT_SEARCH_RADIUS_KM),
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(next))
  return next
}

function normalizeRecent(list, entry) {
  const nextEntry = {
    locality: entry.locality,
    latitude: entry.latitude,
    longitude: entry.longitude,
    source: entry.source || 'manual',
    at: new Date().toISOString(),
  }
  const filtered = (Array.isArray(list) ? list : [])
    .filter((item) => item && item.locality
      && !(item.locality === nextEntry.locality
        && Math.abs(Number(item.latitude) - nextEntry.latitude) < 0.0001
        && Math.abs(Number(item.longitude) - nextEntry.longitude) < 0.0001))
  return [nextEntry, ...filtered].slice(0, LOCATION_RECENTS_MAX)
}

export function pushRecentLocation(cache, entry) {
  if (!entry?.locality || !Number.isFinite(Number(entry.latitude))) return cache?.recent || []
  return normalizeRecent(cache?.recent, entry)
}

/**
 * Load prefs from Supabase for the signed-in user (falls back to local cache).
 */
export async function fetchRemoteLocationPrefs(userId) {
  if (!userId || !isSupabaseConfigured) return null
  try {
    const sb = requireSupabase()
    const { data, error } = await sb
      .from('user_location_preferences')
      .select('latitude, longitude, locality, source, radius_km, recent_locations, updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      locality: data.locality || null,
      latitude: data.latitude != null ? Number(data.latitude) : null,
      longitude: data.longitude != null ? Number(data.longitude) : null,
      source: data.source || 'cached',
      radiusKm: clampRadiusKm(data.radius_km, DEFAULT_SEARCH_RADIUS_KM),
      recent: Array.isArray(data.recent_locations) ? data.recent_locations : [],
      updatedAt: data.updated_at || null,
    }
  } catch (err) {
    console.warn('[location] remote prefs failed', err?.message || err)
    return null
  }
}

export async function upsertRemoteLocationPrefs(userId, state) {
  if (!userId || !isSupabaseConfigured) return
  try {
    const sb = requireSupabase()
    const payload = {
      user_id: userId,
      latitude: state.latitude,
      longitude: state.longitude,
      locality: state.locality,
      source: state.source || 'cached',
      radius_km: clampRadiusKm(state.radiusKm, DEFAULT_SEARCH_RADIUS_KM),
      recent_locations: Array.isArray(state.recent) ? state.recent : [],
      updated_at: new Date().toISOString(),
    }
    const { error } = await sb
      .from('user_location_preferences')
      .upsert(payload, { onConflict: 'user_id' })
    if (error) throw error
  } catch (err) {
    console.warn('[location] upsert prefs failed', err?.message || err)
  }
}
