import { STORAGE_KEYS, USER_DB_VERSION } from './constants'

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function emptyDatabase() {
  return {
    version: USER_DB_VERSION,
    users: {},
    emailIndex: {},
    phoneIndex: {},
  }
}

export function loadDatabase() {
  if (typeof localStorage === 'undefined') return emptyDatabase()
  const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.DB))
  if (!parsed || typeof parsed.users !== 'object') return emptyDatabase()
  return {
    version: parsed.version || USER_DB_VERSION,
    users: parsed.users || {},
    emailIndex: parsed.emailIndex || {},
    phoneIndex: parsed.phoneIndex || {},
  }
}

export function saveDatabase(db) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify({
    ...db,
    version: USER_DB_VERSION,
    savedAt: new Date().toISOString(),
  }))
}

export function loadSession() {
  if (typeof localStorage === 'undefined') return null
  const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.SESSION))
  return parsed?.userId ? parsed : null
}

export function saveSession(session) {
  if (typeof localStorage === 'undefined') return
  if (!session) localStorage.removeItem(STORAGE_KEYS.SESSION)
  else localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session))
}
