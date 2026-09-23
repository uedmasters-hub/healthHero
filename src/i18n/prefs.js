/** Persisted app language preference (PocketPills-style). */

export const LANG_CODES = ['en', 'ne']

export const LANG_META = {
  en: {
    label: 'English',
    native: 'English',
    short: 'EN',
    htmlLang: 'en',
    voice: 'en-US',
    hint: 'App and search in English.',
  },
  ne: {
    label: 'Nepali',
    native: 'नेपाली',
    short: 'NE',
    htmlLang: 'ne',
    voice: 'ne-NP',
    hint: 'एप र खोज नेपालीमा।',
  },
}

const LANG_KEY = 'em.prefs.language'

function readRaw(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null || raw === '') return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeRaw(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function normalizeLang(code) {
  return code === 'ne' ? 'ne' : 'en'
}

export function loadLanguage() {
  return normalizeLang(readRaw(LANG_KEY, 'en'))
}

export function saveLanguage(code) {
  const next = normalizeLang(code)
  writeRaw(LANG_KEY, next)
  try {
    document.documentElement.lang = LANG_META[next].htmlLang
  } catch {
    /* ignore */
  }
  return next
}

export function voiceLangFromSiteLang(siteLang) {
  return normalizeLang(siteLang) === 'ne' ? 'ne-NP' : 'en-US'
}
