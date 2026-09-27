import { useEffect, useRef, useState } from 'react'
import {
  HEALTH_SECTIONS,
  LIST_SECTIONS,
  ageFromDob,
  ageToDob,
  displayHealthDate,
  isValidPhone,
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
import OtpBoxes from '../../features/auth/components/OtpBoxes'
import { Badge, Button, Chip, ChipRow, FormGroup, Icon, SheetHeader, Skeleton } from '../ui'
import { InfoCard, InfoRow } from './ProfileChrome'

const GENDERS = ['Male', 'Female', 'Other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const OTP_LENGTH = 6
const MOCK_OTP = '123456'

function sectionConfig(kind) {
  return HEALTH_SECTIONS.find((item) => item.kind === kind)
    || LIST_SECTIONS.find((item) => item.kind === kind)
}

function ChipChoice({ label, options, value, onChange }) {
  return (
    <FormGroup as="div" label={label}>
      <ChipRow className="is-wrap" label={label}>
        {options.map((option) => (
          <Chip key={option} soft selected={value === option} onClick={() => onChange(option)}>
            {option}
          </Chip>
        ))}
      </ChipRow>
    </FormGroup>
  )
}

function Field({ field, value, onChange }) {
  if (field.type === 'textarea') {
    return (
      <FormGroup label={field.label}>
        <textarea className="ds-field" rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />
      </FormGroup>
    )
  }
  if (field.type === 'chips') {
    return <ChipChoice label={field.label} options={field.options || []} value={value} onChange={onChange} />
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
    <FormGroup label={field.label}>
      <input
        className="ds-field"
        type={field.type === 'date' ? 'date' : undefined}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    </FormGroup>
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
      <SheetHeader titleId="health-editor-title" title={item ? `Edit ${section.singular}` : section.addLabel} onClose={close} />
      <div className="ds-form profile-sheet-body">
        {section.fields.map((field) => (
          <Field key={field.key} field={field} value={form[field.key]} onChange={(value) => update(field.key, value)} />
        ))}
      </div>
      <Button size="lg" block disabled={!canSave(section, form)} onClick={save}>
        Save
      </Button>
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
      <SheetHeader titleId="health-view-title" title={listItemTitle(kind, item) || item.title} onClose={close} />
      <InfoCard className="profile-sheet-body">
        {section.fields.map((field) => {
          const raw = item[field.key]
          const value = field.type === 'date' ? displayHealthDate(raw) : raw
          if (!value) return null
          return <InfoRow key={field.key} label={field.label} value={value} />
        })}
        {item.details && !section.fields.some((field) => field.key === 'details') ? (
          <InfoRow label="Notes" value={item.details} />
        ) : null}
      </InfoCard>
      <div className="ds-btn-row">
        <Button variant="danger-quiet" size="lg" onClick={remove}>Delete</Button>
        <Button size="lg" onClick={() => hide(() => onEdit?.(kind, item))}>Edit</Button>
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
      <SheetHeader
        titleId="otp-verify-title"
        title="Verify phone number"
        onClose={onBack}
        closeLabel="Go back"
        closeIcon={<Icon.Back />}
      />
      <div className="ds-form profile-sheet-body">
        {error ? <p className="ds-page__error" role="alert">{error}</p> : null}
        {sending ? (
          <div className="profile-otp-loading" aria-busy="true" aria-label="Sending code">
            <Skeleton shape="circle" width="3rem" height="3rem" />
            <Skeleton width="10rem" height="0.875rem" />
            <Skeleton width="7.5rem" height="0.75rem" />
          </div>
        ) : (
          <>
            <p className="ds-body">
              Enter the {OTP_LENGTH}-digit code sent to <strong className="tnum">{phone}</strong>
            </p>
            <FormGroup as="div" label="Verification code">
              <OtpBoxes
                id="profile-phone-otp"
                value={otp}
                length={OTP_LENGTH}
                invalid={Boolean(error)}
                onChange={handleOtpChange}
              />
            </FormGroup>
            <Button variant="text" size="sm" className="profile-inline-action" onClick={handleResend} disabled={sending}>
              {resent ? 'Code resent' : 'Resend code'}
            </Button>
          </>
        )}
      </div>
      <Button size="lg" block disabled={!otpReady} loading={verifying} onClick={handleVerify}>
        {verifying ? 'Verifying…' : 'Verify'}
      </Button>
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
      <SheetHeader titleId="profile-edit-title" title={title} onClose={close} />
      <div className="ds-form profile-sheet-body">
        {error ? <p className="ds-page__error" role="alert">{error}</p> : null}
        {showBasic ? (
          <>
            <FormGroup label="Name">
              <input className="ds-field" value={form.name} onChange={(e) => update('name', e.target.value)} />
            </FormGroup>
            <div className="ds-form-row">
              <FormGroup as="div" label="Date of birth">
                <BirthDateField value={form.dob} onChange={(dob) => update('dob', dob)} />
              </FormGroup>
              <FormGroup label="Age">
                <input className="ds-field" inputMode="numeric" value={form.age} onChange={(e) => update('age', e.target.value.replace(/\D/g, '').slice(0, 3))} />
              </FormGroup>
            </div>
            <ChipChoice label="Gender" options={GENDERS} value={form.gender} onChange={(item) => update('gender', item)} />
            <div className="ds-form-row is-even">
              <FormGroup label="Height">
                <input className="ds-field" value={form.height} onChange={(e) => update('height', e.target.value)} placeholder="e.g. 168 cm" />
              </FormGroup>
              <FormGroup label="Weight">
                <input className="ds-field" value={form.weight} onChange={(e) => update('weight', e.target.value)} placeholder="e.g. 65 kg" />
              </FormGroup>
            </div>
          </>
        ) : null}
        {showPassport ? (
          <ChipChoice label="Blood group" options={BLOOD_GROUPS} value={form.bloodGroup} onChange={(item) => update('bloodGroup', item)} />
        ) : null}
        {showContact ? (
          <>
            <FormGroup as="div" label="Email">
              <div className="ds-field is-disabled">
                <input className="ds-field__input" value={profile?.email || ''} readOnly tabIndex={-1} aria-label="Email" />
                {emailVerified ? <Badge tone="success">Verified</Badge> : null}
              </div>
            </FormGroup>
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
              <Button variant="outline" size="sm" className="profile-inline-action" onClick={handleVerify}>Verify number</Button>
            )}
            <p className="ds-rule-label">Emergency contact</p>
            <FormGroup label="Name">
              <input className="ds-field" value={form.emergencyName} onChange={(e) => update('emergencyName', e.target.value)} placeholder="Contact name" />
            </FormGroup>
            <FormGroup label="Relation">
              <input className="ds-field" value={form.emergencyRelation} onChange={(e) => update('emergencyRelation', e.target.value)} placeholder="e.g. Parent, Spouse" />
            </FormGroup>
            <PhoneInput
              label="Phone"
              value={form.emergencyPhone}
              country={ecPhoneCountry}
              onCountryChange={setEcPhoneCountry}
              onChange={(val) => update('emergencyPhone', val)}
              placeholder="98765 43210"
            />
            {scope === 'all' ? (
              <FormGroup label="Address">
                <textarea className="ds-field" rows={3} value={form.address} onChange={(e) => update('address', e.target.value)} />
              </FormGroup>
            ) : null}
          </>
        ) : null}
      </div>
      <Button size="lg" block disabled={!ready} onClick={save}>Save</Button>
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
