import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  DEFAULT_SEARCH_RADIUS_KM,
  clampRadiusKm,
  coordsForPlace,
  nextExpandRadiusKm,
  canonicalLocality,
} from './constants'
import { readDevicePosition, reverseGeocode } from './geocode'
import {
  fetchRemoteLocationPrefs,
  pushRecentLocation,
  readLocalLocationCache,
  upsertRemoteLocationPrefs,
  writeLocalLocationCache,
} from './storage'

const LocationContext = createContext(null)

function hasCoords(state) {
  return Number.isFinite(Number(state?.latitude)) && Number.isFinite(Number(state?.longitude))
}

function buildSnapshot({
  locality = null,
  latitude = null,
  longitude = null,
  source = 'cached',
  radiusKm = DEFAULT_SEARCH_RADIUS_KM,
  recent = [],
  status = 'idle',
  error = null,
  updating = false,
  placeId = null,
} = {}) {
  return {
    locality,
    latitude: latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
    source,
    radiusKm: clampRadiusKm(radiusKm),
    recent: Array.isArray(recent) ? recent : [],
    status,
    error,
    updating,
    placeId: placeId || null,
  }
}

export function LocationProvider({ children }) {
  const { session, ready: authReady } = useAuth()
  const userId = session?.user?.id || null
  const bootRef = useRef(false)
  const persistTimer = useRef(null)
  /** Once the user picks a place manually, auto-GPS must not overwrite it. */
  const manualLockRef = useRef(false)

  const [state, setState] = useState(() => {
    const cached = readLocalLocationCache()
    if (cached?.source === 'manual' && hasCoords(cached)) {
      manualLockRef.current = true
    }
    if (cached && hasCoords(cached)) {
      return buildSnapshot({
        ...cached,
        source: cached.source === 'gps' ? 'cached' : (cached.source || 'cached'),
        status: 'ready',
      })
    }
    return buildSnapshot({
      radiusKm: cached?.radiusKm || DEFAULT_SEARCH_RADIUS_KM,
      recent: cached?.recent || [],
      status: 'idle',
    })
  })

  const persist = useCallback((next, { remote = true } = {}) => {
    const recent = next.locality && hasCoords(next)
      ? pushRecentLocation(next, {
        locality: next.locality,
        latitude: next.latitude,
        longitude: next.longitude,
        source: next.source,
        placeId: next.placeId || null,
      })
      : (next.recent || [])
    const saved = writeLocalLocationCache({ ...next, recent })
    if (!remote || !userId) return saved
    window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      upsertRemoteLocationPrefs(userId, saved || next)
    }, 280)
    return saved
  }, [userId])

  const applyLocation = useCallback((patch, { remember = true } = {}) => {
    setState((prev) => {
      const next = buildSnapshot({
        ...prev,
        ...patch,
        status: patch.status || (hasCoords({ ...prev, ...patch }) ? 'ready' : prev.status),
        error: patch.error ?? null,
      })
      if (remember && hasCoords(next)) {
        const saved = persist(next)
        return buildSnapshot({ ...next, recent: saved?.recent || next.recent })
      }
      if (remember && patch.radiusKm != null) {
        persist({ ...prev, radiusKm: next.radiusKm }, { remote: true })
      }
      return next
    })
  }, [persist])

  const requestGps = useCallback(async ({ silent = false, force = false } = {}) => {
    if (force) manualLockRef.current = false
    // Respect an explicit manual pick unless the user refreshes current location.
    if (manualLockRef.current && !force) {
      setState((prev) => ({ ...prev, updating: false }))
      return { ok: true, skipped: true }
    }

    setState((prev) => ({
      ...prev,
      updating: true,
      status: silent && prev.status === 'ready' ? prev.status : 'locating',
      error: null,
    }))
    try {
      const coords = await readDevicePosition({ enableHighAccuracy: true })
      // Re-check lock: user may have picked a city while GPS was in flight.
      if (manualLockRef.current && !force) {
        setState((prev) => ({ ...prev, updating: false, status: 'ready' }))
        return { ok: true, skipped: true }
      }
      let place
      try {
        place = await reverseGeocode(coords.latitude, coords.longitude)
      } catch {
        place = null
      }
      let localityLabel = place?.locality || 'Current location'
      setState((prev) => {
        if (manualLockRef.current && !force) {
          return { ...prev, updating: false, status: hasCoords(prev) ? 'ready' : prev.status }
        }
        if (!place?.locality && prev.locality) localityLabel = prev.locality
        const next = buildSnapshot({
          ...prev,
          locality: localityLabel,
          latitude: coords.latitude,
          longitude: coords.longitude,
          source: 'gps',
          status: 'ready',
          updating: false,
          error: null,
        })
        const saved = persist(next)
        return buildSnapshot({ ...next, recent: saved?.recent || next.recent })
      })
      return { ok: true, locality: localityLabel, latitude: coords.latitude, longitude: coords.longitude }
    } catch (err) {
      const denied = err?.code === 1
      setState((prev) => {
        const fallback = hasCoords(prev)
          ? {
            ...prev,
            source: prev.source === 'gps' ? 'cached' : prev.source,
            status: 'ready',
            updating: false,
            error: denied ? 'Location permission denied' : (err?.message || 'Location unavailable'),
          }
          : {
            ...prev,
            status: denied ? 'denied' : 'offline',
            updating: false,
            error: denied ? 'Location permission denied' : (err?.message || 'Location unavailable'),
          }
        return fallback
      })
      return { ok: false, denied, error: err }
    }
  }, [persist])

  const refreshLocation = useCallback(() => {
    // Explicit refresh clears the manual lock and re-takes GPS.
    manualLockRef.current = false
    return requestGps({ silent: true, force: true })
  }, [requestGps])

  const setManualLocation = useCallback(({ locality, latitude, longitude, placeId = null }) => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    manualLockRef.current = true
    const label = canonicalLocality({ locality, latitude: lat, longitude: lng }) || String(locality || 'Selected location').trim()
    applyLocation({
      locality: label,
      latitude: lat,
      longitude: lng,
      source: 'manual',
      status: 'ready',
      updating: false,
      error: null,
      placeId: placeId || null,
    })
  }, [applyLocation])

  const selectPlaceByName = useCallback((name) => {
    const hit = coordsForPlace(name)
    if (!hit) return false
    setManualLocation({
      locality: hit.locality || name,
      latitude: hit.latitude,
      longitude: hit.longitude,
    })
    return true
  }, [setManualLocation])

  const setRadiusKm = useCallback((value) => {
    const radiusKm = clampRadiusKm(value)
    applyLocation({ radiusKm }, { remember: true })
  }, [applyLocation])

  const expandRadius = useCallback(() => {
    const next = nextExpandRadiusKm(state.radiusKm)
    if (next == null) return null
    setRadiusKm(next)
    return next
  }, [setRadiusKm, state.radiusKm])

  // Hydrate from Supabase when auth is ready, then request GPS only when no
  // manual (or already-ready) location is locked in.
  useEffect(() => {
    if (!authReady || bootRef.current) return undefined
    bootRef.current = true
    let cancelled = false

    ;(async () => {
      if (userId) {
        const remote = await fetchRemoteLocationPrefs(userId)
        if (!cancelled && remote) {
          if (remote.source === 'manual' && hasCoords(remote)) {
            manualLockRef.current = true
          }
          setState((prev) => {
            // Never clobber a fresher in-session manual pick with remote GPS/cached.
            if (manualLockRef.current && prev.source === 'manual' && hasCoords(prev)) {
              return {
                ...prev,
                radiusKm: remote.radiusKm || prev.radiusKm,
                recent: remote.recent?.length ? remote.recent : prev.recent,
              }
            }
            const useRemoteCoords = hasCoords(remote)
            const next = buildSnapshot({
              locality: useRemoteCoords ? remote.locality : prev.locality,
              latitude: useRemoteCoords ? remote.latitude : prev.latitude,
              longitude: useRemoteCoords ? remote.longitude : prev.longitude,
              source: useRemoteCoords ? (remote.source || 'cached') : prev.source,
              radiusKm: remote.radiusKm || prev.radiusKm,
              recent: remote.recent?.length ? remote.recent : prev.recent,
              status: useRemoteCoords || hasCoords(prev) ? 'ready' : prev.status,
            })
            writeLocalLocationCache(next)
            return next
          })
        }
      }
      if (!cancelled && !manualLockRef.current) {
        await requestGps({ silent: false })
      }
    })()

    return () => { cancelled = true }
  }, [authReady, userId, requestGps])

  const value = useMemo(() => {
    const ready = hasCoords(state)
    return {
      locality: state.locality,
      latitude: state.latitude,
      longitude: state.longitude,
      source: state.source,
      radiusKm: state.radiusKm,
      recentLocations: state.recent,
      status: state.status,
      error: state.error,
      updating: state.updating,
      ready,
      origin: ready
        ? { latitude: state.latitude, longitude: state.longitude }
        : null,
      // Shared contract for every discovery module
      locationQuery: ready
        ? {
          latitude: state.latitude,
          longitude: state.longitude,
          locality: state.locality,
          radiusKm: state.radiusKm,
          source: state.source,
        }
        : null,
      requestGps,
      refreshLocation,
      setManualLocation,
      selectPlaceByName,
      setRadiusKm,
      expandRadius,
      nextExpandRadiusKm: nextExpandRadiusKm(state.radiusKm),
    }
  }, [
    state,
    requestGps,
    refreshLocation,
    setManualLocation,
    selectPlaceByName,
    setRadiusKm,
    expandRadius,
  ])

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}

export function useAppLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useAppLocation must be used within LocationProvider')
  return ctx
}

export function useOptionalAppLocation() {
  return useContext(LocationContext)
}
