import { useEffect, useState } from 'react'
import {
  HEALTH_SECTIONS,
  LIST_SECTIONS,
  ageFromDob,
  displayHealthDate,
  healthItemMeta,
  indianMobile,
  listItemMeta,
  listItemTitle,
  useUser,
} from '../../user'
import AppBottomSheet from '../AppBottomSheet'
import { BirthDateField } from '../DatePicker'
import { useAppSheet } from '../PageTransition'

const GENDERS = ['Male', 'Female', 'Other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

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
      <label className="health-field">
        <span>{field.label}</span>
        <input
          inputMode="numeric"
          maxLength={10}
          value={indianMobile(value)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit number"
        />
      </label>
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
    if (field.type === 'phone') return indianMobile(form[field.key]).length === 10
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

export function ProfileEditSheet({ onClose, scope = 'all' }) {
  const { profile, rawUser, saveProfile } = useUser()
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const [form, setForm] = useState(() => ({
    name: profile?.name || '',
    dob: rawUser?.profile?.dob || '',
    age: profile?.age != null ? String(profile.age) : '',
    gender: profile?.gender || '',
    bloodGroup: profile?.bloodGroup || '',
    height: profile?.height || '',
    weight: profile?.weight || '',
    phone: indianMobile(profile?.phone),
    address: profile?.address || '',
  }))
  const [error, setError] = useState('')

  useEffect(() => {
    show()
  }, [show])

  const close = () => hide(() => onClose?.())
  const update = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'dob') next.age = ageFromDob(value) ? String(ageFromDob(value)) : prev.age
      return next
    })
  }

  const save = () => {
    const result = saveProfile({
      ...form,
      age: form.age,
    })
    if (!result?.ok) {
      setError(result?.error || 'Please complete the required details.')
      return
    }
    close()
  }

  const showBasic = scope === 'all' || scope === 'basic'
  const showContact = scope === 'all' || scope === 'contact'
  const showPassport = scope === 'all' || scope === 'passport'
  const title = scope === 'basic' ? 'Edit basic details' : scope === 'contact' ? 'Edit contact' : scope === 'passport' ? 'Update health passport' : 'Edit profile'

  const ready = showPassport && !showBasic && !showContact
    ? true
    : showContact && !showBasic
      ? indianMobile(form.phone).length === 10
      : form.name.trim().length > 1 && form.gender && (form.age || form.dob) && (!showContact || indianMobile(form.phone).length === 10)

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
            <label className="health-field">
              <span>Mobile number</span>
              <input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </label>
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

