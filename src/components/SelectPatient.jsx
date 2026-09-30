import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { flowState } from '../lib/careFlow'
import { isVideoEntry, resolveBookingEntry, saveVideoJourney } from '../features/videoConsult/lock'
import { findDuplicateSelfBooking } from '../lib/duplicateBooking'
import { ageFromDob, ageToDob, groupedPatients, isPatientProfileComplete } from '../lib/patients'
import { indianMobile, useUser } from '../user'
import { useBooking } from './BookingContext'
import { BookingReveal, useBookingReveal } from './BookingReveal'
import { useBookingFlow } from './BookingFlow'
import DuplicateBookingModal from './DuplicateBookingModal'
import { BirthDateField } from './DatePicker'
import { PhoneInput, toE164 } from './PhoneInput'
import { resolveAppointmentPath } from '../lib/appointmentJourney'
import { Button, Callout, Choice, ChoiceList, ChoiceChips, FormGroup, Icon, cx } from './ui'
import './SelectPatient.css'

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Other']
const GENDERS = ['Male', 'Female', 'Other']

const emptyForm = {
  name: '',
  dob: '',
  age: '',
  gender: 'Male',
  phone: '',
  address: '',
  relationship: 'Spouse',
  customRelationship: '',
}

function formFromPatient(patient) {
  if (!patient) return { ...emptyForm, gender: '', relationship: 'Self' }
  return {
    name: patient.name || '',
    dob: patient.dob || '',
    age: patient.age != null ? String(patient.age) : '',
    gender: patient.gender || '',
    phone: indianMobile(patient.phone),
    address: patient.address || '',
    relationship: patient.relationship || 'Self',
    customRelationship: '',
  }
}

function PatientDetailsForm({ form, updateForm, showRelationship, formError, phoneCountry, onCountryChange }) {
  return (
    <div className="ds-form">
      {formError ? <p className="ds-page__error" role="alert">{formError}</p> : null}
      <FormGroup label="Name">
        <input className="ds-field" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Full name" />
      </FormGroup>
      <div className="ds-form-row">
        <FormGroup as="div" label="Date of birth">
          <BirthDateField value={form.dob} onChange={(dob) => updateForm('dob', dob)} />
        </FormGroup>
        <FormGroup label="Age">
          <input
            className="ds-field"
            inputMode="numeric"
            value={form.age}
            onChange={(e) => updateForm('age', e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Years"
          />
        </FormGroup>
      </div>
      <ChoiceChips label="Gender" options={GENDERS} value={form.gender} onChange={(item) => updateForm('gender', item)} />
      <PhoneInput
        label="Contact number"
        value={form.phone}
        country={phoneCountry}
        onCountryChange={onCountryChange}
        onChange={(val) => updateForm('phone', val)}
        placeholder="98765 43210"
        required
      />
      <FormGroup label="Address">
        <textarea className="ds-field" rows={3} value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Flat / house, street, city" />
      </FormGroup>
      {showRelationship ? (
        <>
          <ChoiceChips label="Relationship" options={RELATIONSHIPS} value={form.relationship} onChange={(item) => updateForm('relationship', item)} />
          {form.relationship === 'Other' ? (
            <FormGroup label="Custom relationship">
              <input
                className="ds-field"
                value={form.customRelationship}
                onChange={(e) => updateForm('customRelationship', e.target.value)}
                placeholder="e.g. Cousin, Guardian"
              />
            </FormGroup>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export default function SelectPatient() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addingPatient, setAddingPatient } = useBookingFlow()
  const { bookings } = useBooking()
  const { members: patients, addMember, completeSelf, googleBirthday } = useUser()
  // Freeze entry so this layer stays correct while mounted as a push underlay.
  const [entry] = useState(() => resolveBookingEntry(location.state))
  const doctor = entry.doctor
  const selfPatient = patients.find((item) => item.relationship === 'Self' || item.id === 'self')
  const selfIncomplete = Boolean(selfPatient && !isPatientProfileComplete(selfPatient))

  // Prefill DOB from Google OAuth when the self profile has no dob yet
  const effectiveSelf = selfPatient && !selfPatient.dob && googleBirthday
    ? { ...selfPatient, dob: googleBirthday }
    : selfPatient

  const [selectedId, setSelectedId] = useState(() => {
    if (entry.patient?.id) return entry.patient.id
    if (entry.forSomeoneElse) {
      const other = patients.find((item) => item.relationship !== 'Self')
      return other?.id || ''
    }
    return 'self'
  })
  const [form, setForm] = useState(() => (selfIncomplete ? formFromPatient(effectiveSelf) : emptyForm))
  const [editingSelf, setEditingSelf] = useState(() => selfIncomplete && !entry.forSomeoneElse)
  const [formError, setFormError] = useState('')
  const [dupBooking, setDupBooking] = useState(null)
  const [phoneCountry, setPhoneCountry] = useState('+977')
  const ready = useBookingReveal(`patient:${doctor?.id || 'none'}`, Boolean(doctor && entry.date && entry.time))

  const groups = useMemo(() => groupedPatients(patients), [patients])
  const selected = patients.find((item) => item.id === selectedId)
  const selectedIncomplete = Boolean(selected && !isPatientProfileComplete(selected))
  const phoneOk = form.phone.replace(/\D/g, '').length === 10
  const relationshipValue = form.relationship === 'Other' ? form.customRelationship.trim() : form.relationship
  const profileFieldsOk = form.name.trim().length > 1 && (form.age || form.dob) && phoneOk && form.gender
  const canSaveMember = profileFieldsOk && relationshipValue
  const canSaveSelf = profileFieldsOk
  const showSelfEditor = selectedId === 'self' && (editingSelf || selfIncomplete)
  const continueReady = selected && (showSelfEditor ? canSaveSelf : !selectedIncomplete)

  const goToReview = (patient, extra = {}) => {
    const next = flowState(entry, {
      patient,
      forSomeoneElse: patient?.relationship !== 'Self' ? true : entry.forSomeoneElse,
      fromConfirm: undefined,
      ...extra,
    })
    if (isVideoEntry(next)) saveVideoJourney(next)
    navigate('/booking/confirm', { state: next })
  }

  const persistSelf = () => {
    const age = form.age || ageFromDob(form.dob)
    const result = completeSelf({
      name: form.name,
      dob: form.dob,
      age,
      gender: form.gender,
      phone: toE164(phoneCountry, form.phone),
      address: form.address,
    })
    if (!result?.ok) {
      setFormError(result?.error || 'Please complete the required details.')
      return null
    }
    setFormError('')
    setEditingSelf(false)
    return result.member
  }

  const proceedWithPatient = (patient) => {
    if (!patient) return
    if (patient.relationship === 'Self') {
      const duplicate = findDuplicateSelfBooking(doctor?.id, bookings)
      if (duplicate) {
        setDupBooking(duplicate)
        return
      }
    }
    goToReview(patient)
  }

  const handleContinue = () => {
    if (!selected) return
    if (selected.relationship === 'Self' && (showSelfEditor || selectedIncomplete)) {
      if (!canSaveSelf) return
      const member = persistSelf()
      if (!member) return
      proceedWithPatient(member)
      return
    }
    if (!isPatientProfileComplete(selected)) return
    proceedWithPatient(selected)
  }

  const handleSaveNew = () => {
    if (!canSaveMember) return
    const age = form.age || ageFromDob(form.dob)
    const created = addMember({
      ...form,
      age,
      phone: toE164(phoneCountry, form.phone),
      relationship: relationshipValue,
    })
    setSelectedId(created.id)
    closeAdd()
    setForm(emptyForm)
    goToReview(created)
  }

  const adding = Boolean(addingPatient)

  const openAdd = () => {
    setForm(emptyForm)
    setFormError('')
    setAddingPatient?.(true)
  }
  const closeAdd = () => {
    setAddingPatient?.(false)
    if (selectedId === 'self' && (selfIncomplete || editingSelf)) {
      setForm(formFromPatient(effectiveSelf))
    }
  }

  const openSelfEditor = (event) => {
    event?.stopPropagation?.()
    setForm(formFromPatient(effectiveSelf))
    setFormError('')
    setSelectedId('self')
    setEditingSelf(true)
  }

  const selectPatientCard = (patient) => {
    setSelectedId(patient.id)
    if (patient.relationship === 'Self') {
      if (!isPatientProfileComplete(patient)) {
        setForm(formFromPatient(effectiveSelf))
        setEditingSelf(true)
      }
      return
    }
    setEditingSelf(false)
  }

  const updateForm = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'dob') {
        next.age = ageFromDob(value) || prev.age
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
  }

  useEffect(() => {
    if (!doctor || !entry.date || !entry.time) {
      navigate('/booking/slot', { replace: true, state: entry })
    }
  }, [doctor, entry, navigate])

  if (!doctor || !entry.date || !entry.time) {
    return null
  }

  return (
    <div className="select-patient">
      {adding ? (
        <>
          <div className="select-patient-scroll">
            <p className="ds-page__lead select-patient-lead">Add a patient once and reuse them for future appointments.</p>
            <PatientDetailsForm form={form} updateForm={updateForm} showRelationship formError={formError} phoneCountry={phoneCountry} onCountryChange={setPhoneCountry} />
          </div>
          <div className="app-flow-footer">
            <button type="button" className="app-flow-cta" disabled={!canSaveMember} onClick={handleSaveNew}>
              Save & Continue
            </button>
            <Button variant="text" size="sm" block className="app-flow-secondary" onClick={closeAdd}>
              Back to saved patients
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="select-patient-scroll">
            <BookingReveal
              ready={ready}
              skeleton={(
                <>
                  <div className="booking-skel-line is-lead shimmer" />
                  <div className="booking-skel-label shimmer" />
                  <div className="booking-skel-card shimmer" />
                  <div className="booking-skel-card shimmer" />
                  <div className="booking-skel-card shimmer" />
                </>
              )}
            >
            <p className="ds-page__lead select-patient-lead">
              {selfIncomplete
                ? 'Complete your profile to continue. These details are saved once and reused for future bookings.'
                : 'Who is this appointment for?'}
            </p>
            {groups.map((group) => (
              <section key={group.id} className="patient-group">
                <h2 className="ds-section-title">{group.label}</h2>
                <ChoiceList label={group.label}>
                  {group.patients.map((patient) => {
                    const incomplete = !isPatientProfileComplete(patient)
                    const isSelf = patient.relationship === 'Self'
                    const selected = selectedId === patient.id
                    const meta = incomplete
                      ? 'Complete required details'
                      : `${patient.age != null ? `${patient.age} yrs` : 'Age —'} · ${patient.relationship}`
                    return (
                      <div key={patient.id} className={cx('patient-row', incomplete && 'is-incomplete')}>
                        <div className="patient-row__main">
                          <Choice
                            selected={selected}
                            title={patient.name || 'Your profile'}
                            subtitle={meta}
                            onClick={() => selectPatientCard(patient)}
                          />
                          {isSelf ? (
                            <Button variant="text" size="sm" className="patient-row__edit" onClick={openSelfEditor}>
                              {incomplete ? 'Complete' : 'Edit'}
                            </Button>
                          ) : null}
                        </div>
                        {isSelf && showSelfEditor && selectedId === 'self' ? (
                          <div className="patient-row__panel">
                            <Callout tone="info" className="patient-row__hint">
                              Age, gender, and a valid mobile number are required before review.
                            </Callout>
                            <PatientDetailsForm form={form} updateForm={updateForm} formError={formError} phoneCountry={phoneCountry} onCountryChange={setPhoneCountry} />
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </ChoiceList>
              </section>
            ))}
            <Button variant="outline" size="lg" block icon={<Icon.Plus />} onClick={openAdd}>
              Add new patient
            </Button>
            </BookingReveal>
          </div>
          <div className="app-flow-footer">
            <button type="button" className="app-flow-cta" disabled={!ready || !continueReady} onClick={handleContinue}>
              Continue
            </button>
          </div>
        </>
      )}

      <DuplicateBookingModal
        booking={dupBooking}
        onClose={() => setDupBooking(null)}
        onView={() => navigate(resolveAppointmentPath(dupBooking))}
        onBookSomeoneElse={() => {
          setDupBooking(null)
          const other = patients.find((item) => item.relationship !== 'Self')
          if (other) {
            setSelectedId(other.id)
            setEditingSelf(false)
          } else openAdd()
        }}
      />
    </div>
  )
}
