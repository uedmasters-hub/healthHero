/**
 * @file src/features/auth/pages/ResetPasswordPage.jsx
 * Completes the recovery session started from the forgot-password email.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AUTH_ERROR, validatePasswordFields } from '../../../user'
import AuthField from '../../../components/auth/AuthField'
import { AuthLayout, AuthSubmit, AuthTrust } from '../../../components/auth/AuthScreen'
import useProgressiveAuth from '../../../components/auth/useProgressiveAuth'
import PasswordStrength from '../components/PasswordStrength'
import { useAuth } from '../hooks/useAuth'

const RESET_ORDER = ['password', 'confirm']
const RESET_IDS = { password: 'reset-password', confirm: 'reset-confirm' }

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { isRecovery, session, updatePassword } = useAuth()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)

  const fieldErrors = validatePasswordFields({ password, confirm })
  const { begin, errorFor } = useProgressiveAuth(RESET_ORDER, RESET_IDS, fieldErrors)

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 280)
    return () => window.clearTimeout(id)
  }, [])

  const canReset = Boolean(isRecovery || session?.user)

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    if (begin()) return
    if (!canReset) {
      setFormError(AUTH_ERROR.EXPIRED)
      return
    }
    setBusy(true)
    try {
      const result = await updatePassword(password)
      if (!result.ok) {
        setFormError(result.error || AUTH_ERROR.GENERIC)
        return
      }
      setDone(true)
      window.setTimeout(() => navigate('/', { replace: true }), 900)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      loading={!ready}
      stage={done ? 'reset-done' : 'reset'}
      title={done ? 'Password updated' : 'Set a new password'}
      subtitle={done
        ? 'You are signed in. Taking you to eMedicalls…'
        : canReset
          ? 'Choose a strong password for your account.'
          : 'This reset link is invalid or has expired.'}
      extra={<AuthTrust />}
      footer={<Link to="/forgot" className="auth-text-btn">Request a new link</Link>}
    >
      {done || !canReset ? null : (
        <form className="auth-form" onSubmit={onSubmit} noValidate>
          {formError ? <p className="auth-banner" role="alert">{formError}</p> : null}
          <AuthField
            id="reset-password"
            label="New password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errorFor('password')}
            autoComplete="new-password"
            disabled={busy}
            placeholder="Create a password"
          />
          <PasswordStrength value={password} />
          <AuthField
            id="reset-confirm"
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            error={errorFor('confirm')}
            autoComplete="new-password"
            disabled={busy}
            placeholder="Re-enter password"
          />
          <AuthSubmit busy={busy} disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </AuthSubmit>
        </form>
      )}
    </AuthLayout>
  )
}
