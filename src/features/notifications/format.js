export function formatUnreadCount(count) {
  const n = Number(count) || 0
  if (n <= 0) return ''
  if (n > 99) return '99+'
  return String(n)
}
