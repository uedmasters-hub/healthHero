export function formatUnreadCount(count) {
  const n = Number(count) || 0
  if (n <= 0) return ''
  if (n > 99) return '99+'
  return String(n)
}

/** Badge diameter: 18 single-digit, 20 two-digit, 22 for 99+. */
export function badgeSizeTone(count) {
  const n = Number(count) || 0
  if (n > 99) return 'is-lg'
  if (n >= 10) return 'is-md'
  return 'is-sm'
}
