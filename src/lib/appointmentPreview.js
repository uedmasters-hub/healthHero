/**
 * Compact appointment fields for SharedHero morph + instant first paint.
 * Built from the in-memory booking — never waits on a network fetch.
 */
export function buildAppointmentPreview(booking) {
  if (!booking) return null

  const rawDate = booking.date?.full ?? booking.date
  const dateValue = rawDate instanceof Date
    ? rawDate
    : rawDate
      ? new Date(rawDate)
      : null
  const dateStr = dateValue && !Number.isNaN(dateValue.getTime())
    ? dateValue.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : ''

  const time = booking.time || booking.schedule?.time || ''
  const visitType = booking.visitType || booking.schedule?.visitType || 'In-Person'
  const doctor = booking.doctor || {}

  const cells = []
  if (booking.patient?.name) {
    cells.push({ label: 'Patient', value: booking.patient.name })
    if (booking.patient.relationship) {
      cells.push({ label: 'Relationship', value: booking.patient.relationship })
    }
  }
  if (dateStr) cells.push({ label: 'Date', value: dateStr })
  if (time) cells.push({ label: 'Time', value: time })
  cells.push({ label: 'Type', value: `${visitType} Visit` })
  if (doctor.address) cells.push({ label: 'Location', value: doctor.address })

  return {
    date: dateStr,
    time,
    visitType,
    location: doctor.address || '',
    patient: booking.patient?.name || '',
    cells: cells.slice(0, 4),
  }
}
