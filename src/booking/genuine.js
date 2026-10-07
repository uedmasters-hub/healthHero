/**
 * Restored bookings must carry real appointment data. A record rebuilt from
 * chat metadata alone (no provider, no date) is a placeholder and never shown.
 */
const PLACEHOLDER_PROVIDER = /^(dr\.?\s*)?(care provider|provider|doctor|test( doctor)?)$/i

function providerName(record) {
  return String(record?.doctor?.name || record?.providerName || '').trim()
}

function scheduledDate(record) {
  const date = record?.schedule?.date
  if (!date) return ''
  return typeof date === 'object' ? String(date.full || date.day || '') : String(date)
}

export function isGenuineRestoredBooking(record) {
  if (!record?.id) return false
  const name = providerName(record)
  if (!name || PLACEHOLDER_PROVIDER.test(name)) return false
  return Boolean(scheduledDate(record))
}

/** Only restored records are judged; bookings created in-app always pass. */
export function isPresentableBooking(record) {
  if (!record?.id) return false
  if (!record.meta?.restoredFrom) return true
  return isGenuineRestoredBooking(record)
}
