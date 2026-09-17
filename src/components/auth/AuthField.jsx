import { useState } from 'react'
import './Auth.css'

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  hint,
  autoComplete,
  inputMode,
  disabled,
  name,
  placeholder,
  maxLength,
  labelAction,
}) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && visible ? 'text' : type

  return (
    <div className={`auth-field ${isPassword ? 'has-toggle' : ''} ${error ? 'is-invalid' : ''} ${value ? 'has-value' : ''}`}>
      <span className="auth-field-head">
        <label className="auth-field-label" htmlFor={id}>{label}</label>
        {labelAction}
      </span>
      <span className="auth-field-control">
        <input
          id={id}
          name={name || id}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        {isPassword ? (
          <button
            type="button"
            className="auth-field-toggle"
            onClick={() => setVisible((open) => !open)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            tabIndex={disabled ? -1 : 0}
          >
            <EyeIcon open={visible} />
          </button>
        ) : null}
      </span>
      {error ? (
        <span className="auth-field-error" id={`${id}-error`}>{error}</span>
      ) : hint ? (
        <span className="auth-field-hint" id={`${id}-hint`}>{hint}</span>
      ) : null}
    </div>
  )
}
