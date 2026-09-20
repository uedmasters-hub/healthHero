/**
 * Email OTP login verification — same reusable OTP experience as signup verify.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isValidEmail, normalizeEmail } from '../../user'
import { useAuth } from '../../features/auth/hooks/useAuth'
import EmailOtpVerify from '../../features/auth/components/EmailOtpVerify'

export default function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmailOtp, sendEmailOtp } = useAuth()
  const email = normalizeEmail(location.state?.email || '')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!email || !isValidEmail(email)) {
      navigate('/login', { replace: true })
      return undefined
    }
    const id = window.setTimeout(() => setReady(true), 220)
    return () => window.clearTimeout(id)
  }, [email, navigate])

  const onVerify = useCallback(async (token) => {
    const result = await verifyEmailOtp(email, token, { type: 'email' })
    if (result.ok) {
      navigate('/', { replace: true })
    }
    return result
  }, [email, verifyEmailOtp, navigate])

  const onResend = useCallback(async () => sendEmailOtp(email), [email, sendEmailOtp])

  const onChangeEmail = useCallback(() => {
    navigate('/login', { replace: true, state: { email } })
  }, [navigate, email])

  return (
    <EmailOtpVerify
      email={email}
      title="Enter your code"
      supportingText="Enter the 6-digit code sent to your email"
      stage="otp"
      loading={!ready}
      onVerify={onVerify}
      onResend={onResend}
      onChangeEmail={onChangeEmail}
      confirmationUrl=""
      footer={(
        <>
          Wrong email? <Link to="/login" state={{ email }}>Go back</Link>
        </>
      )}
    />
  )
}
