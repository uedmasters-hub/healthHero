/**
 * Resolve a production-safe provider photo URL.
 * Sources: doctor.photo / avatar / image / photo_url, then catalog by id.
 * Always returns a root-absolute `/img/...` path when possible (never a
 * host-relative or localhost absolute URL that breaks after deploy).
 */
import { getDoctorPhoto } from '../features/providers'

const PROVIDER_PHOTO_KEYS = ['photo', 'avatar', 'image', 'photo_url', 'photoUrl', 'avatar_url']

/** Strip origin / fix relative paths so `/img/...` survives Vite + Vercel. */
export function normalizePublicAssetUrl(value) {
  if (value == null) return ''
  const raw = String(value).trim()
  if (!raw) return ''

  // data: / blob: — keep only if browser can render; treat as intentional
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw

  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw)
      // Local/dev absolute URLs pointing at our static catalog → pathname only
      if (url.pathname.startsWith('/img/')) return url.pathname + url.search
      return raw
    }
  } catch {
    /* fall through */
  }

  if (raw.startsWith('/img/')) return raw
  if (raw.startsWith('img/')) return `/${raw}`
  // Accidental "./img/..." or "../img/..."
  const stripped = raw.replace(/^\.\//, '').replace(/^(\.\.\/)+/, '')
  if (stripped.startsWith('img/')) return `/${stripped}`

  return raw
}

function readPhotoField(source = {}) {
  for (const key of PROVIDER_PHOTO_KEYS) {
    const normalized = normalizePublicAssetUrl(source[key])
    if (normalized) return normalized
  }
  return ''
}

/**
 * @param {object|null|undefined} doctorOrBooking - doctor snapshot, booking, or legacy booking
 * @returns {string|null} usable img src, or null when no catalog/photo exists
 */
export function resolveProviderPhoto(doctorOrBooking) {
  if (!doctorOrBooking) return null

  const doctor = doctorOrBooking.doctor && typeof doctorOrBooking.doctor === 'object'
    ? doctorOrBooking.doctor
    : doctorOrBooking

  const fromFields = readPhotoField(doctor) || readPhotoField(doctorOrBooking)
  if (fromFields) return fromFields

  const id = doctor.id ?? doctorOrBooking.doctorId ?? doctorOrBooking.doctor_id
  if (id != null && id !== '') {
    return normalizePublicAssetUrl(getDoctorPhoto(id)) || null
  }

  return null
}
