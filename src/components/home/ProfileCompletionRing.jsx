import './ProfileCompletionRing.css'

const R = 15.5
const C = 2 * Math.PI * R

/**
 * Quiet circular progress around avatars (Apple-style status indicator).
 * percent 0–100; ring is fully closed only at 100.
 */
export default function ProfileCompletionRing({
  percent = 0,
  size,
  className = '',
  children,
}) {
  const value = Math.min(100, Math.max(0, Number(percent) || 0))
  const complete = value >= 100
  const dash = complete ? C : (value / 100) * C
  const style = size
    ? { '--pcr-size': typeof size === 'number' ? `${size}px` : size }
    : undefined

  return (
    <span
      className={`profile-completion-ring ${complete ? 'is-complete' : ''} ${className}`.trim()}
      style={style}
      data-percent={value}
    >
      <svg className="profile-completion-ring__svg" viewBox="0 0 36 36" aria-hidden="true">
        <circle className="profile-completion-ring__track" cx="18" cy="18" r={R} fill="none" />
        <circle
          className="profile-completion-ring__progress"
          cx="18"
          cy="18"
          r={R}
          fill="none"
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="profile-completion-ring__inner">{children}</span>
    </span>
  )
}
