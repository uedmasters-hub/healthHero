import './StatusChip.css'

const TONE_CLASS = {
  success: 'is-success',
  info: 'is-info',
  warning: 'is-warning',
  danger: 'is-danger',
}

/** Reusable status pill — orders, bookings, and care flows. */
export default function StatusChip({ label, tone = 'info', className = '' }) {
  return (
    <span className={`status-chip ${TONE_CLASS[tone] || TONE_CLASS.info} ${className}`.trim()}>
      {label}
    </span>
  )
}
