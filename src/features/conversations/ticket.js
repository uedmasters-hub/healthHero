/** Support ticket ID helpers (SUP-YYMM-######). */

const TICKET_RE = /^SUP-\d{4}-\d{6}$/i

export function isValidTicketId(value) {
  return TICKET_RE.test(String(value || '').trim())
}

export function formatTicketId(value) {
  const raw = String(value || '').trim().toUpperCase()
  return raw || '—'
}

export function ticketShortLabel(value) {
  const id = formatTicketId(value)
  if (id === '—') return id
  return id
}
