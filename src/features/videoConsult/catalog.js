import { isFutureSlotInstant, localIsoDate, slotsForDate, visitSlotAvailability } from '../../lib/slotAvailability'
import { addDays, makeDateValue, startOfDay } from '../../components/calendar/dates'

export function supportsVideo(doctor) {
  const types = doctor?.visitTypes || doctor?.visit_modes || []
  if (!Array.isArray(types) || !types.length) return false
  return types.some((type) => /video/i.test(String(type)))
}

export function futureVideoSlots(slots = [], now = new Date()) {
  return slots.filter((slot) => (
    /video/i.test(slot?.visitType || '')
    && isFutureSlotInstant(slot.date, slot.time, now)
  ))
}

export function templateVideoSlots(doctor, now = new Date()) {
  if (!supportsVideo(doctor)) return []
  const slots = []
  for (let offset = 0; offset < 14; offset += 1) {
    const day = addDays(startOfDay(now), offset)
    const dateValue = makeDateValue(day)
    const { slots: times } = slotsForDate({ date: day })
    const open = visitSlotAvailability({
      doctorId: doctor.id,
      date: dateValue,
      visitType: 'Video Consultation',
      slots: times,
    })
    open.forEach((time) => {
      if (!isFutureSlotInstant(localIsoDate(day), time, now)) return
      slots.push({
        date: localIsoDate(day),
        time,
        visitType: 'Video Consultation',
      })
    })
  }
  return slots
}

/**
 * A fetched schedule is authoritative, including an empty one.
 * Template times are only for offline preview when no schedule was fetched.
 */
export function slotsForVideoDoctor(doctor, liveSlots = null, now = new Date()) {
  if (!supportsVideo(doctor)) return []
  if (Array.isArray(liveSlots)) return futureVideoSlots(liveSlots, now)
  return templateVideoSlots(doctor, now)
}

export function videoDoctorsWithSlots(doctors = [], slotsByDoctor = null, now = new Date()) {
  const fetched = slotsByDoctor instanceof Map
  return doctors
    .map((doctor) => {
      const key = String(doctor.providerUuid || doctor.id || '')
      const idKey = String(doctor.id || '')
      let live = null
      if (fetched) {
        if (slotsByDoctor.has(key)) live = slotsByDoctor.get(key)
        else if (slotsByDoctor.has(idKey)) live = slotsByDoctor.get(idKey)
        else live = []
      }
      const slots = slotsForVideoDoctor(doctor, live, now)
      return { doctor, slots }
    })
    .filter((row) => row.slots.length > 0)
}
