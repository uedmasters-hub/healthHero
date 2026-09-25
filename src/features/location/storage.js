/**
 * Local + Supabase persistence for discovery location preferences.
 * Recent locations are an MRU list: normalized identity, no duplicates, capped.
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import {
  LOCATION_CACHE_KEY,
  DEFAULT_SEARCH_RADIUS_KM,
  clampRadiusKm,
} from './constants'
import {
  dedupeRecentList,
  normalizeRecent,
  pushRecentLocation,
} from './recent'

export { dedupeRecentList, normalizeRecent, pushRecentLocation }

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function withCleanRecent(data) {
  if (!data || typeof data !== 'object') return data
  const recent = dedupeRecentList(data.recent)
  return { ...data, recent }
}

export function readLocalLocationCache() {
  if (typeof localStorage === 'undefined') return null
  const data = safeParse(localStorage.getItem(LOCATION_CACHE_KEY))
  if (!data || typeof data !== 'object') return null
  const cleaned = withCleanRecent(data)
  const latitude = Number(cleaned.latitude)
  const longitude = Number(cleaned.longitude)

  // Persist migration if duplicates were stripped.
  const beforeLen = Array.isArray(data.recent) ? data.recent.length : 0
  const afterLen = cleaned.recent.length
  if (beforeLen !== afterLen) {
    try {
      localStorage.setItem(
        LOCATION_CACHE_KEY,
        JSON.stringify({ ...cleaned, updatedAt: new Date().toISOString() }),
      )
    } catch {
      /* ignore quota */
    }
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      locality: null,
      latitude: null,
      longitude: null,
      source: cleaned.source || 'cached',
      radiusKm: clampRadiusKm(cleaned.radiusKm, DEFAULT_SEARCH_RADIUS_KM),
      recent: cleaned.recent,
      updatedAt: cleaned.updatedAt || null,
    }
  }
  return {
    locality: cleaned.locality || null,
    latitude,
    longitude,
    source: cleaned.source || 'cached',
    radiusKm: clampRadiusKm(cleaned.radiusKm, DEFAULT_SEARCH_RADIUS_KM),
    recent: cleaned.recent,
    updatedAt: cleaned.updatedAt || null,
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
    recent: dedupeRecentList(patch.recent ?? prev.recent),
    radiusKm: clampRadiusKm(patch.radiusKm ?? prev.radiusKm, DEFAULT_SEARCH_RADIUS_KM),
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(next))
  return next
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

    const recent = dedupeRecentList(data.recent_locations)
    // Migrate remote duplicates when we detect them.
    if (Array.isArray(data.recent_locations) && data.recent_locations.length !== recent.length) {
      upsertRemoteLocationPrefs(userId, {
        latitude: data.latitude,
        longitude: data.longitude,
        locality: data.locality,
        source: data.source,
        radiusKm: data.radius_km,
        recent,
      }).catch(() => {})
    }

    return {
      locality: data.locality || null,
      latitude: data.latitude != null ? Number(data.latitude) : null,
      longitude: data.longitude != null ? Number(data.longitude) : null,
      source: data.source || 'cached',
      radiusKm: clampRadiusKm(data.radius_km, DEFAULT_SEARCH_RADIUS_KM),
      recent,
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
      recent_locations: dedupeRecentList(state.recent),
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
