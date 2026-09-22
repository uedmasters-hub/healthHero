import { useEffect, useRef, useState } from 'react'
import {
  HEALTH_SECTIONS,
  LIST_SECTIONS,
  ageFromDob,
  ageToDob,
  displayHealthDate,
  healthItemMeta,
  isValidPhone,
  listItemMeta,
  listItemTitle,
  normalizeHeight,
  normalizeWeight,
  numericValue,
  phoneInput,
  useUser,
} from '../../user'
import AppBottomSheet from '../AppBottomSheet'
import { BirthDateField } from '../DatePicker'
import { PhoneInput, toE164 } from '../PhoneInput'
import { useAppSheet } from '../PageTransition'

const GENDERS = ['Male', 'Female', 'Other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const OTP_LENGTH = 6
const MOCK_OTP = '123456'

function sectionConfig(kind) {
  return HEALTH_SECTIONS.find((item) => item.kind === kind)
    || LIST_SECTIONS.find((item) => item.kind === kind)
}

function itemsFor(kind, userState) {
  if (HEALTH_SECTIONS.some((item) => item.kind === kind)) return userState.health?.[kind] || []
  if (kind === 'emergencyContacts') return userState.emergencyContacts || []
  if (kind === 'insurancePolicies') return userState.insurancePolicies || []
  if (kind === 'addresses') return userState.addresses || []
  return []
}

function Field({ field, value, onChange }) {
  if (field.type === 'textarea') {
    return (
      <label className="health-field">
        <span>{field.label}</span>
        <textarea rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
      </label>
    )
  }
  if (field.type === 'chips') {
    return (
      <div className="health-field">
        <span>{field.label}</span>
        <div className="health-chip-row">
          {(field.options || []).map((option) => (
            <button type="button" key={option} className={value === option ? 'is-on' : ''} onClick={() => onChange(option)}>
              {option}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (field.type === 'date') {
    return (
      <label className="health-field">
        <span>{field.label}</span>
        <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      </label>
    )
  }
  if (field.type === 'phone') {
    return (
      <PhoneInput
        label={field.label}
        value={value}
        onChange={onChange}
        placeholder="98765 43210"
        required={field.required}
      />
    )
  }
  return (
    <label className="health-field">
      <span>{field.label}</span>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
    </label>
  )
}

function formFromItem(section, item) {
  const form = {}
  section.fields.forEach((field) => {
    form[field.key] = item?.[field.key] || ''
  })
  return form
}

function canSave(section, form) {
  return section.fields.every((field) => {
    if (!field.required) return true
    if (field.type === 'phone') return isValidPhone(form[field.key])
    return String(form[field.key] || '').trim().length > 0
  })
}

export function HealthSection({ kind, onAdd, onOpen }) {
  const userState = useUser()
  const section = sectionConfig(kind)
  const items = itemsFor(kind, userState)
  if (!section) return null

  return (
    <section className="user-profile-section">
      <div className="health-section-head">
        <h3 className="user-profile-section-title">{section.title}</h3>
        <button type="button" className="health-add-btn" onClick={() => onAdd(kind)}>
          {section.addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="health-empty">
          <p>{section.empty}</p>
          <button type="button" className="health-empty-cta" onClick={() => onAdd(kind)}>Add {section.singular}</button>
        </div>
      ) : (
        <div className="health-card-list">
          {items.map((item) => (
            <button type="button" key={item.id} className="health-item-card" onClick={() => onOpen(kind, item)}>
              <span className="health-item-copy">
                <strong>{listItemTitle(kind, item) || item.title}</strong>
                <span>{listItemMeta(kind, item) || healthItemMeta(item) || 'Tap to view'}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export function RecordEditorSheet({ kind, item, onClose }) {
  const {
    saveHealthItem,
    saveEmergencyContact,
    saveInsurancePolicy,
    saveAddress,
  } = useUser()
  const section = sectionConfig(kind)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const [form, setForm] = useState(() => formFromItem(section, item))

  useEffect(() => {
    show()
  }, [show])

  useEffect(() => {
    setForm(formFromItem(section, item))
  }, [section, item])

  if (!section) return null

  const close = () => hide(() => onClose?.())
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const save = () => {
    if (!canSave(section, form)) return
    const payload = { ...form, id: item?.id }
    if (HEALTH_SECTIONS.some((entry) => entry.kind === kind)) saveHealthItem(kind, payload)
    else if (kind === 'emergencyContacts') saveEmergencyContact(payload)
    else if (kind === 'insurancePolicies') saveInsurancePolicy(payload)
    else if (kind === 'addresses') saveAddress({ ...payload, isDefault: item?.isDefault })
    close()
  }

  return (
    <AppBottomSheet open={isPresented} closing={isClosing} onClose={close} keyboardAware labelledBy="health-editor-title">
      <div className="health-sheet-head">
        <h2 id="health-editor-title">{item ? `Edit ${section.singular}` : section.addLabel}</h2>
        <button type="button" className="health-sheet-close" onClick={close} aria-label="Close">×</button>
      </div>
      <div className="health-sheet-body">
        {section.fields.map((field) => (
          <Field key={field.key} field={field} value={form[field.key]} onChange={(value) => update(field.key, value)} />
        ))}
      </div>
      <button type="button" className="health-sheet-save" disabled={!canSave(section, form)} onClick={save}>
        Save
      </button>
    </AppBottomSheet>
  )
}

export function RecordViewSheet({ kind, item, onEdit, onClose }) {
  const {
    deleteHealthItem,
    deleteEmergencyContact,
    deleteInsurancePolicy,
    deleteAddress,
  } = useUser()
  const section = sectionConfig(kind)
  const { isPresented, isClosing, show, hide } = useAppSheet()

  useEffect(() => {
    show()
  }, [show])

  if (!section || !item) return null

  const close = () => hide(() => onClose?.())
  const remove = () => {
    if (HEALTH_SECTIONS.some((entry) => entry.kind === kind)) deleteHealthItem(kind, item.id)
    else if (kind === 'emergencyContacts') deleteEmergencyContact(item.id)
    else if (kind === 'insurancePolicies') deleteInsurancePolicy(item.id)
    else if (kind === 'addresses') deleteAddress(item.id)
    close()
  }

  return (
    <AppBottomSheet open={isPresented} closing={isClosing} onClose={close} labelledBy="health-view-title">
      <div className="health-sheet-head">
        <h2 id="health-view-title">{listItemTitle(kind, item) || item.title}</h2>
        <button type="button" className="health-sheet-close" onClick={close} aria-label="Close">×</button>
      </div>
      <div className="health-sheet-body">
        {section.fields.map((field) => {
          const raw = item[field.key]
          const value = field.type === 'date' ? displayHealthDate(raw) : raw
          if (!value) return null
          return (
            <div key={field.key} className="health-view-row">
              <span>{field.label}</span>
              <strong>{value}</strong>
            </div>
          )
        })}
        {item.details && !section.fields.some((field) => field.key === 'details') ? (
          <div className="health-view-row">
            <span>Notes</span>
            <strong>{item.details}</strong>
          </div>
        ) : null}
      </div>
      <div className="health-sheet-actions">
        <button type="button" className="health-sheet-save" onClick={() => hide(() => onEdit?.(kind, item))}>Edit</button>
        <button type="button" className="health-sheet-delete" onClick={remove}>Delete</button>
      </div>
    </AppBottomSheet>
  )
}

// ── OTP verification sub-flow ──────────────────────────────────────────────

function OtpFlow({ phone, onSuccess, onBack }) {
  const { checkPhone, verifyPhone } = useUser()
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)
  const otpRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Step 1: Check duplicate + send OTP (mock)
  useEffect(() => {
    let timer
    const run = async () => {
      // Check if phone belongs to another account
      const check = checkPhone(phone)
      if (!check.ok) {
        if (mountedRef.current) {
          setError(check.error)
          setSending(false)
        }
        return
      }
      // Simulate OTP sending delay
      timer = setTimeout(() => {
        if (mountedRef.current) setSending(false)
      }, 1200)
    }
    run()
    return () => clearTimeout(timer)
  }, [phone, checkPhone])

  // Auto-focus OTP input when not sending
  useEffect(() => {
    if (!sending && otpRef.current) {
      otpRef.current.focus()
    }
  }, [sending])

  const handleOtpChange = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH)
    setOtp(digits)
    setError('')
  }

  const handleVerify = () => {
    if (otp.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code.`)
      return
    }
    setVerifying(true)
    setError('')
    // Mock verification: accept the demo OTP or any 6 digits in dev
    setTimeout(() => {
      if (!mountedRef.current) return
      const valid = otp === MOCK_OTP || otp.length === OTP_LENGTH
      if (valid) {
        verifyPhone(phone)
        onSuccess()
      } else {
        setError('Invalid code. Please try again.')
        setVerifying(false)
      }
    }, 800)
  }

  const handleResend = () => {
    setSending(true)
    setError('')
    setOtp('')
    setResent(false)
    setTimeout(() => {
      if (mountedRef.current) {
        setSending(false)
        setResent(true)
      }
    }, 1200)
  }

  const otpReady = otp.length === OTP_LENGTH && !sending && !verifying

  return (
    <>
      <div className="health-sheet-head">
        <h2>Verify phone number</h2>
        <button type="button" className="health-sheet-close" onClick={onBack} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
      <div className="health-sheet-body">
        {error ? <p className="health-form-error" role="alert">{error}</p> : null}
        {sending ? (
          <div className="otp-loading">
            <div className="otp-loading-icon shimmer" />
            <div className="otp-loading-text shimmer" />
            <div className="otp-loading-text-sm shimmer" />
          </div>
        ) : (
          <>
            <p className="otp-instructions">
              Enter the {OTP_LENGTH}-digit code sent to <strong>{phone}</strong>
            </p>
            <label className="health-field">
              <span>Verification code</span>
              <input
                ref={otpRef}
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                placeholder={`${OTP_LENGTH}-digit code`}
                className="otp-input"
              />
            </label>
            <button
              type="button"
              className="otp-resend-btn"
              onClick={handleResend}
              disabled={sending}
            >
              {resent ? 'Code resent' : 'Resend OTP'}
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        className="health-sheet-save"
        disabled={!otpReady}
        onClick={handleVerify}
      >
        {verifying ? 'Verifying...' : 'Verify'}
      </button>
    </>
  )
}

// ── Profile edit sheet ─────────────────────────────────────────────────────

export function ProfileEditSheet({ onClose, scope = 'all' }) {
  const { profile, rawUser, saveProfile, emailVerified, emergencyContacts, saveEmergencyContact } = useUser()
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const primaryEmergency = emergencyContacts[0] || {}
  const [form, setForm] = useState(() => ({
    name: profile?.name || '',
    dob: rawUser?.profile?.dob || '',
    age: profile?.age != null ? String(profile.age) : '',
    gender: profile?.gender || '',
    bloodGroup: profile?.bloodGroup || '',
    height: numericValue(profile?.height),
    weight: numericValue(profile?.weight),
    phone: phoneInput(profile?.phoneRaw || profile?.phone || ''),
    address: profile?.address || '',
    emergencyName: primaryEmergency.name || profile?.emergencyContact?.name || '',
    emergencyRelation: primaryEmergency.relation || profile?.emergencyContact?.relation || '',
    emergencyPhone: phoneInput(primaryEmergency.phone || profile?.emergencyContact?.phone || ''),
  }))
  const [phoneCountry, setPhoneCountry] = useState('+977')
  const [ecPhoneCountry, setEcPhoneCountry] = useState('+977')
  const [error, setError] = useState('')
  const [otpView, setOtpView] = useState(false)

  useEffect(() => {
    show()
  }, [show])

  const close = () => hide(() => onClose?.())
  const update = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'dob') {
        next.age = ageFromDob(value) ? String(ageFromDob(value)) : prev.age
      } else if (key === 'age') {
        const digits = String(value).replace(/\D/g, '').slice(0, 3)
        next.age = digits
        if (digits) {
          const derived = ageToDob(digits, prev.dob)
          if (derived) next.dob = derived
        } else if (!prev.dob) {
          next.dob = ''
        }
      }
      return next
    })
    if (key === 'phone' || key === 'emergencyPhone') setError('')
  }

  const saveEcIfFilled = () => {
    const ecName = form.emergencyName.trim()
    const ecRelation = form.emergencyRelation.trim()
    const ecPhone = form.emergencyPhone.trim()
    if (ecName || ecRelation || ecPhone) {
      saveEmergencyContact({
        id: primaryEmergency.id || undefined,
        name: ecName || 'Emergency contact',
        relation: ecRelation || 'Family',
        phone: ecPhone ? toE164(ecPhoneCountry, ecPhone) : primaryEmergency.phone || '',
      })
    }
  }

  const save = async () => {
    const result = await saveProfile({
      ...form,
      phone: toE164(phoneCountry, form.phone),
      height: normalizeHeight(form.height),
      weight: normalizeWeight(form.weight),
      age: form.age,
    })
    if (!result?.ok) {
      setError(result?.error || 'Please complete the required details.')
      return
    }
    saveEcIfFilled()
    close()
  }

  const handleVerify = () => {
    if (!isValidPhone(form.phone)) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }
    setError('')
    setOtpView(true)
  }

  const handleOtpSuccess = async () => {
    setOtpView(false)
    const result = await saveProfile({
      ...form,
      phone: toE164(phoneCountry, form.phone),
      height: normalizeHeight(form.height),
      weight: normalizeWeight(form.weight),
      age: form.age,
    })
    if (!result?.ok) {
      setError(result?.error || 'Please complete the required details.')
      return
    }
    saveEcIfFilled()
    close()
  }

  const showBasic = scope === 'all' || scope === 'basic'
  const showContact = scope === 'all' || scope === 'contact'
  const showPassport = scope === 'all' || scope === 'passport'
  const title = scope === 'basic' ? 'Edit basic details' : scope === 'contact' ? 'Edit contact' : scope === 'passport' ? 'Update health passport' : 'Edit profile'

  const phoneValid = isValidPhone(form.phone)
  const ready = showPassport && !showBasic && !showContact
    ? true
    : showContact && !showBasic
      ? phoneValid
      : form.name.trim().length > 1 && form.gender && (form.age || form.dob) && (!showContact || phoneValid)

  if (otpView) {
    return (
      <AppBottomSheet open={isPresented} closing={isClosing} onClose={close} keyboardAware labelledBy="otp-verify-title">
        <OtpFlow
          phone={toE164(phoneCountry, form.phone)}
          onSuccess={handleOtpSuccess}
          onBack={() => { setOtpView(false); setError('') }}
        />
      </AppBottomSheet>
    )
  }

  return (
    <AppBottomSheet open={isPresented} closing={isClosing} onClose={close} keyboardAware labelledBy="profile-edit-title">
      <div className="health-sheet-head">
        <h2 id="profile-edit-title">{title}</h2>
        <button type="button" className="health-sheet-close" onClick={close} aria-label="Close">×</button>
      </div>
      <div className="health-sheet-body">
        {error ? <p className="health-form-error" role="alert">{error}</p> : null}
        {showBasic ? (
          <>
            <label className="health-field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} />
            </label>
            <div className="health-field-row">
              <div className="health-field">
                <span>Date of birth</span>
                <BirthDateField value={form.dob} onChange={(dob) => update('dob', dob)} />
              </div>
              <label className="health-field">
                <span>Age</span>
                <input inputMode="numeric" value={form.age} onChange={(e) => update('age', e.target.value.replace(/\D/g, '').slice(0, 3))} />
              </label>
            </div>
            <div className="health-field">
              <span>Gender</span>
              <div className="health-chip-row">
                {GENDERS.map((item) => (
                  <button type="button" key={item} className={form.gender === item ? 'is-on' : ''} onClick={() => update('gender', item)}>{item}</button>
                ))}
              </div>
            </div>
            <div className="health-field-row">
              <label className="health-field">
                <span>Height</span>
                <input value={form.height} onChange={(e) => update('height', e.target.value)} placeholder="e.g. 168 cm" />
              </label>
              <label className="health-field">
                <span>Weight</span>
                <input value={form.weight} onChange={(e) => update('weight', e.target.value)} placeholder="e.g. 65 kg" />
              </label>
            </div>
          </>
        ) : null}
        {showPassport ? (
          <div className="health-field">
            <span>Blood group</span>
            <div className="health-chip-row">
              {BLOOD_GROUPS.map((item) => (
                <button type="button" key={item} className={form.bloodGroup === item ? 'is-on' : ''} onClick={() => update('bloodGroup', item)}>{item}</button>
              ))}
            </div>
          </div>
        ) : null}
        {showContact ? (
          <>
            <label className="health-field contact-email-field">
              <span>Email</span>
              <div className="contact-email-row">
                <input value={profile?.email || ''} readOnly tabIndex={-1} />
                {emailVerified ? <span className="phone-verified-badge">Verified</span> : null}
              </div>
            </label>
            <PhoneInput
              label="Mobile number"
              value={form.phone}
              country={phoneCountry}
              onCountryChange={setPhoneCountry}
              onChange={(val) => update('phone', val)}
              placeholder="98765 43210"
              verified={profile?.phoneVerified}
            />
            {!profile?.phoneVerified && phoneValid && (
              <button type="button" className="phone-verify-btn" onClick={handleVerify}>Verify</button>
            )}
            <div className="contact-section-divider"><span>Emergency contact</span></div>
            <label className="health-field">
              <span>Name</span>
              <input value={form.emergencyName} onChange={(e) => update('emergencyName', e.target.value)} placeholder="Contact name" />
            </label>
            <label className="health-field">
              <span>Relation</span>
              <input value={form.emergencyRelation} onChange={(e) => update('emergencyRelation', e.target.value)} placeholder="e.g. Parent, Spouse" />
            </label>
            <PhoneInput
              label="Phone"
              value={form.emergencyPhone}
              country={ecPhoneCountry}
              onCountryChange={setEcPhoneCountry}
              onChange={(val) => update('emergencyPhone', val)}
              placeholder="98765 43210"
            />
            {scope === 'all' ? (
              <label className="health-field">
                <span>Address</span>
                <textarea rows={3} value={form.address} onChange={(e) => update('address', e.target.value)} />
              </label>
            ) : null}
          </>
        ) : null}
      </div>
      <button type="button" className="health-sheet-save" disabled={!ready} onClick={save}>Save</button>
    </AppBottomSheet>
  )
}

export function ProfileSheets({ sheet, setSheet }) {
  if (!sheet) return null
  if (sheet.mode === 'profile') {
    return <ProfileEditSheet scope={sheet.scope || 'all'} onClose={() => setSheet(null)} />
  }
  if (sheet.mode === 'form') {
    return <RecordEditorSheet kind={sheet.kind} item={sheet.item} onClose={() => setSheet(null)} />
  }
  if (sheet.mode === 'view') {
    return (
      <RecordViewSheet
        kind={sheet.kind}
        item={sheet.item}
        onClose={() => setSheet(null)}
        onEdit={(kind, item) => setSheet({ mode: 'form', kind, item })}
      />
    )
  }
  return null
}
