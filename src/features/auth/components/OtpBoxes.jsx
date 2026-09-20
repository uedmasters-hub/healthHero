/**
 * Six connected OTP digit boxes — auto-advance, backspace, paste, one-time-code autofill.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_LENGTH = 6

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

export default function OtpBoxes({
  value = '',
  length = DEFAULT_LENGTH,
  disabled = false,
  invalid = false,
  shaking = false,
  autoFocus = true,
  id = 'auth-otp',
  onChange,
  onComplete,
}) {
  const refs = useRef([])
  const completedRef = useRef('')
  const [focused, setFocused] = useState(-1)
  const digits = Array.from({ length }, (_, index) => value[index] || '')

  const focusAt = useCallback((index) => {
    const clamped = Math.max(0, Math.min(length - 1, index))
    refs.current[clamped]?.focus()
    refs.current[clamped]?.select?.()
  }, [length])

  useEffect(() => {
    if (!autoFocus || disabled) return undefined
    const idTimer = window.setTimeout(() => focusAt(0), 60)
    return () => window.clearTimeout(idTimer)
  }, [autoFocus, disabled, focusAt])

  // After an invalid attempt clears the code, return focus to the first box.
  useEffect(() => {
    if (!shaking || value.length > 0 || disabled) return undefined
    const idTimer = window.setTimeout(() => focusAt(0), 80)
    return () => window.clearTimeout(idTimer)
  }, [shaking, value.length, disabled, focusAt])

  useEffect(() => {
    if (value.length === length && value !== completedRef.current) {
      completedRef.current = value
      onComplete?.(value)
    }
    if (value.length < length) completedRef.current = ''
  }, [value, length, onComplete])

  const emit = useCallback((next) => {
    const clipped = onlyDigits(next).slice(0, length)
    onChange?.(clipped)
  }, [length, onChange])

  const handleChange = (index, raw) => {
    if (disabled) return
    const cleaned = onlyDigits(raw)

    if (cleaned.length > 1) {
      emit(cleaned)
      focusAt(Math.min(cleaned.length, length) - 1)
      return
    }

    const next = digits.slice()
    next[index] = cleaned.slice(-1)
    emit(next.join(''))
    if (cleaned) focusAt(index + 1)
  }

  const handleKeyDown = (index, event) => {
    if (disabled) return
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index]) {
        const next = digits.slice()
        next[index] = ''
        emit(next.join(''))
        return
      }
      if (index > 0) {
        const next = digits.slice()
        next[index - 1] = ''
        emit(next.join(''))
        focusAt(index - 1)
      }
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusAt(index - 1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  const handlePaste = (event) => {
    if (disabled) return
    const text = event.clipboardData?.getData('text') || ''
    const cleaned = onlyDigits(text)
    if (!cleaned) return
    event.preventDefault()
    emit(cleaned)
    focusAt(Math.min(cleaned.length, length) - 1)
  }

  return (
    <div
      className={`auth-otp-boxes ${invalid ? 'is-invalid' : ''} ${shaking ? 'is-shaking' : ''} ${disabled ? 'is-disabled' : ''}`}
      role="group"
      aria-label={`${length}-digit verification code`}
      onPaste={handlePaste}
    >
      {digits.map((digit, index) => (
        <input
          key={`${id}-${index}`}
          ref={(node) => { refs.current[index] = node }}
          id={index === 0 ? id : `${id}-${index}`}
          className={[
            'auth-otp-box',
            digit ? 'is-filled' : '',
            focused === index ? 'is-focus' : '',
          ].filter(Boolean).join(' ')}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={index === 0 ? length : 1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => {
            setFocused(index)
            event.target.select()
          }}
          onBlur={() => setFocused((current) => (current === index ? -1 : current))}
        />
      ))}
    </div>
  )
}

export function maskEmail(email) {
  const raw = String(email || '').trim()
  const at = raw.indexOf('@')
  if (at < 1) return raw
  const local = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  if (!domain) return raw
  if (local.length <= 2) return `${local[0] || ''}••••@${domain}`
  return `${local.slice(0, 2)}••••@${domain}`
}
