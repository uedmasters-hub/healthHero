/**
 * Shared booking → UI presentation.
 * Merges sparse engine/API snapshots with the local doctor catalog so Home,
 * Treat, Ready for Visit, and Provider Chat render the same card fields in
 * production as they do locally (name, photo, rating, specialty, schedule).
 */
import { getDoctorById, getDoctorPhoto, getProviderCatalog } from '../features/providers'
import { resolveProviderPhoto, normalizePublicAssetUrl } from '../lib/providerPhoto'
import { getServiceMeta, resolveServiceType } from './serviceTypes'

function stripDr(name) {
  return String(name || '').replace(/^Dr\.?\s*/i, '').trim()
}

function normalizeName(name) {
  return stripDr(name).toLowerCase().replace(/\s+/g, ' ')
}

/** Find catalog doctor by id or fuzzy name (covers recovered chat metadata). */
export function resolveCatalogDoctor(doctorOrBooking = {}) {
  const doctor = doctorOrBooking?.doctor && typeof doctorOrBooking.doctor === 'object'
    ? doctorOrBooking.doctor
    : doctorOrBooking

  const id = doctor?.id ?? doctorOrBooking?.doctorId ?? doctorOrBooking?.doctor_id
  if (id != null && id !== '') {
    const byId = getDoctorById(id)
    if (byId) return byId
  }

  const nameHint = doctor?.name
    || doctorOrBooking?.providerName
    || doctorOrBooking?.provider_name
    || ''
  const needle = normalizeName(nameHint)
  if (!needle) return null

  return getProviderCatalog().find((d) => {
    const short = normalizeName(d.shortName || d.name)
    const full = normalizeName(d.name)
    return short === needle || full === needle || short.includes(needle) || needle.includes(short)
  }) || null
}

function formatDateLabel(date) {
  if (!date) return ''
  const dateValue = date?.full instanceof Date ? date.full : new Date(date?.full || date)
  if (Number.isNaN(dateValue.getTime())) return ''
  return dateValue.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatTimeRange(time, duration) {
  if (!time) return ''
  const raw = String(time).trim()
  const [timePart, modifier] = raw.split(/\s+/)
  let [hours, minutes] = timePart.split(':').map(Number)
  if (!Number.isFinite(hours)) return raw
  const isPM = (modifier || '').toUpperCase() === 'PM'
  const isAM = (modifier || '').toUpperCase() === 'AM'
  if (isPM && hours !== 12) hours += 12
  if (isAM && hours === 12) hours = 0
  // 24h "15:00" from remote appointments
  if (!modifier && hours > 12) {
    /* already 24h */
  }
  const durMins = parseInt(duration, 10) || 30
  const startMins = hours * 60 + (Number.isFinite(minutes) ? minutes : 0)
  const endMinsTotal = startMins + durMins
  const endHours = Math.floor(endMinsTotal / 60) % 24
  const endMins = endMinsTotal % 60

  const clock = (h24, m) => {
    const mer = h24 >= 12 ? 'PM' : 'AM'
    let h = h24 % 12
    if (h === 0) h = 12
    return `${h}:${String(m).padStart(2, '0')} ${mer}`
  }

  return `${clock(hours, Number.isFinite(minutes) ? minutes : 0)} - ${clock(endHours, endMins)}`
}

/**
 * Canonical view-model for provider booking cards.
 * @param {object|null} booking - legacy booking from useHomeCarousel / useBookingById
 */
export function presentBookingCard(booking) {
  if (!booking) return null

  const snapshot = booking.doctor && typeof booking.doctor === 'object' ? booking.doctor : {}
  const catalog = resolveCatalogDoctor(booking)
  const catalogPhoto = catalog ? normalizePublicAssetUrl(getDoctorPhoto(catalog.id)) : ''
  const photo = resolveProviderPhoto({ ...catalog, ...snapshot, doctor: { ...catalog, ...snapshot } })
    || catalogPhoto
    || null

  const doctor = {
    id: snapshot.id ?? catalog?.id ?? null,
    name: snapshot.name || catalog?.name || booking.providerName || '',
    specialty: snapshot.specialty || catalog?.specialty || '',
    experience: snapshot.experience || catalog?.experience || '',
    rating: snapshot.rating ?? catalog?.rating ?? null,
    address: snapshot.address || catalog?.address || '',
    phone: snapshot.phone || catalog?.phone || '',
    photo: photo || '',
    fee: snapshot.fee ?? catalog?.fee ?? null,
    color: snapshot.color || catalog?.color || '',
    initial: snapshot.initial || catalog?.initial || '',
  }

  const serviceType = resolveServiceType(booking)
  const serviceMeta = getServiceMeta(serviceType)
  const title = booking.providerName || stripDr(doctor.name) || 'Provider'
  const subtitle = booking.providerSubtitle
    || [serviceMeta.label, doctor.specialty || doctor.experience].filter(Boolean).join(' · ')

  const dateLabel = formatDateLabel(booking.date)
  const timeLabel = formatTimeRange(booking.time, booking.duration)
  const isDoctorService = serviceType === 'doctor_consultation' || serviceType === 'virtual_consultation'
  const showRating = isDoctorService && doctor.rating != null

  const presented = {
    booking,
    doctor,
    catalog,
    serviceType,
    serviceMeta,
    title,
    subtitle,
    photo,
    showRating,
    rating: doctor.rating,
    dateLabel,
    timeLabel,
    // Debug-friendly snapshot of what the card will render
    debug: {
      bookingId: booking.engineId || booking.id,
      doctorId: doctor.id,
      photo,
      rating: doctor.rating,
      specialty: doctor.specialty,
      dateLabel,
      timeLabel,
      hasCatalog: Boolean(catalog),
    },
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[presentBookingCard]', presented.debug)
  }

  return presented
}
