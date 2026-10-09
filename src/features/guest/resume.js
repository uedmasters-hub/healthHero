/** Route + router state captured at the moment identity is required. */
const RESUME_KEY = 'emedicalls.guest.resume'
const TTL_MS = 30 * 60 * 1000

export function saveGuestResume(location, reason, metadata = {}) {
  const path = `${location?.pathname || '/'}${location?.search || ''}`
  const payload = {
    path,
    state: location?.state || null,
    reason: reason || null,
    metadata,
    at: Date.now(),
  }
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(payload))
  } catch {
    /* private mode */
  }
  return payload
}

export function peekGuestResume() {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value?.path || !value.at || Date.now() - value.at > TTL_MS) return null
    return value
  } catch {
    return null
  }
}

export function clearGuestResume() {
  try {
    sessionStorage.removeItem(RESUME_KEY)
  } catch {
    /* ignore */
  }
}
