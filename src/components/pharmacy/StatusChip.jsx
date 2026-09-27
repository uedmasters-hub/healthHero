import { Badge } from '../ui'

const TONES = new Set(['success', 'info', 'warning', 'danger', 'processing', 'neutral', 'muted'])

/** Reusable status pill — orders, bookings, and care flows (`.ds-badge`). */
export default function StatusChip({ label, tone = 'info', className = '' }) {
  return (
    <Badge tone={TONES.has(tone) ? tone : 'info'} className={className}>
      {label}
    </Badge>
  )
}
