/**
 * Registry rows were seeded with stock faces. Until real photos are uploaded,
 * providers show a neutral placeholder that matches their gender.
 */
const STOCK_AVATARS = new Set([
  '/img/doctors/doctor-m1.png',
  '/img/doctors/doctor-m2.png',
  '/img/doctors/doctor-m3.png',
  '/img/doctors/doctor-w1.png',
  '/img/doctors/doctor-w2.png',
  '/img/doctors/doctor-w3.png',
  '/img/doctors/new/doctor.png',
])

export const PLACEHOLDER_AVATARS = Object.freeze({
  male: '/img/doctors/placeholder-male.svg',
  female: '/img/doctors/placeholder-female.svg',
})

function pathOf(url) {
  const raw = String(url || '').trim()
  if (!/^https?:\/\//i.test(raw)) return raw
  try {
    return new URL(raw).pathname
  } catch {
    return raw
  }
}

export function isStockAvatar(url) {
  return STOCK_AVATARS.has(pathOf(url))
}

/** Seeded stock images were already gender-matched; use them as a hint when gender is missing. */
function genderKey(gender, stockUrl) {
  const value = String(gender || '').trim().toLowerCase()
  if (value === 'male' || value === 'm') return 'male'
  if (value === 'female' || value === 'f') return 'female'
  if (value) return null
  const path = pathOf(stockUrl)
  if (/\/doctor-m\d/.test(path)) return 'male'
  if (/\/doctor-w\d|\/new\/doctor\.png$/.test(path)) return 'female'
  return null
}

/** Real upload when present, else the gender placeholder, else '' (initials). */
export function providerAvatarUrl(avatarUrl, gender) {
  const url = String(avatarUrl || '').trim()
  if (url && !isStockAvatar(url)) return url
  const key = genderKey(gender, url)
  return key ? PLACEHOLDER_AVATARS[key] : ''
}
