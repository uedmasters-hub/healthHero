/**
 * @file src/features/auth/components/PasswordStrength.jsx
 * Inline password strength meter for registration and reset.
 */
import { passwordStrength } from '../../../user'

export default function PasswordStrength({ value }) {
  const { label, percent } = passwordStrength(value)
  if (!value) return null
  return (
    <div className={`auth-strength is-${label}`} aria-live="polite">
      <div className="auth-strength-track ds-progress">
        <span className="auth-strength-fill ds-progress__bar" style={{ width: `${percent}%` }} />
      </div>
      <p className="auth-strength-label">{label} password</p>
    </div>
  )
}
