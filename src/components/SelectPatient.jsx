import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { flowState } from '../lib/careFlow'
import { findDuplicateSelfBooking } from '../lib/duplicateBooking'
import { ageFromDob, groupedPatients, isPatientProfileComplete } from '../lib/patients'
import { indianMobile, useUser } from '../user'
import { useBooking } from './BookingContext'
import { BookingReveal, useBookingReveal } from './BookingReveal'
import DuplicateBookingModal from './DuplicateBookingModal'
import { BirthDateField } from './DatePicker'
import { resolveAppointmentPath } from '../lib/appointmentJourney'
import './SelectPatient.css'

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Other']
const GENDERS = ['Male', 'Female', 'Other']
const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+61', '+65']

const emptyForm = {
  name: '',
  dob: '',
  age: '',
  gender: 'Male',
  countryCode: '+91',
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
    countryCode: '+91',
    phone: indianMobile(patient.phone),
    address: patient.address || '',
    relationship: patient.relationship || 'Self',
    customRelationship: '',
  }
}

function PatientDetailsForm({ form, updateForm, showRelationship, formError }) {
  return (
    <>
      {formError ? <p className="patient-form-error" role="alert">{formError}</p> : null}
      <label className="patient-field">
        <span>Name</span>
        <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Full name" />
      </label>
      <div className="patient-field-row">
        <div className="patient-field">
          <span>Date of Birth</span>
          <BirthDateField value={form.dob} onChange={(dob) => updateForm('dob', dob)} />
        </div>
        <label className="patient-field">
          <span>Age</span>
          <input
            inputMode="numeric"
            value={form.age}
            onChange={(e) => updateForm('age', e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="Years"
          />
        </label>
      </div>
      <div className="patient-field">
        <span>Gender</span>
        <div className="patient-chip-row">
          {GENDERS.map((item) => (
            <button type="button" key={item} className={form.gender === item ? 'is-on' : ''} onClick={() => updateForm('gender', item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="patient-field">
        <span>Contact Number</span>
        <div className="patient-phone-row">
          <label className="patient-cc">
            <span className="sr-only">Country code</span>
            <select value={form.countryCode} onChange={(e) => updateForm('countryCode', e.target.value)}>
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </label>
          <input
            value={form.phone}
            onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit number"
            inputMode="numeric"
            maxLength={10}
          />
        </div>
      </div>
      <label className="patient-field">
        <span>Address</span>
        <textarea rows={3} value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Flat / house, street, city" />
      </label>
      {showRelationship ? (
        <>
          <div className="patient-field">
            <span>Relationship</span>
            <div className="patient-chip-row">
              {RELATIONSHIPS.map((item) => (
                <button type="button" key={item} className={form.relationship === item ? 'is-on' : ''} onClick={() => updateForm('relationship', item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          {form.relationship === 'Other' ? (
            <label className="patient-field">
              <span>Custom relationship</span>
              <input
                value={form.customRelationship}
                onChange={(e) => updateForm('customRelationship', e.target.value)}
                placeholder="e.g. Cousin, Guardian"
              />
            </label>
          ) : null}
        </>
      ) : null}
    </>
  )
}

export default function SelectPatient() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setCurrentStep, addingPatient, setAddingPatient } = useOutletContext()
  const { bookings } = useBooking()
  const { members: patients, addMember, completeSelf } = useUser()
  const doctor = location.state?.doctor
  const selfPatient = patients.find((item) => item.relationship === 'Self' || item.id === 'self')
  const selfIncomplete = Boolean(selfPatient && !isPatientProfileComplete(selfPatient))

  const [selectedId, setSelectedId] = useState(() => {
    if (location.state?.patient?.id) return location.state.patient.id
    if (location.state?.forSomeoneElse) {
      const other = patients.find((item) => item.relationship !== 'Self')
      return other?.id || ''
    }
    return 'self'
  })
  const [form, setForm] = useState(() => (selfIncomplete ? formFromPatient(selfPatient) : emptyForm))
  const [editingSelf, setEditingSelf] = useState(() => selfIncomplete && !location.state?.forSomeoneElse)
  const [formError, setFormError] = useState('')
  const [dupBooking, setDupBooking] = useState(null)
  const ready = useBookingReveal(`patient:${doctor?.id || 'none'}`, Boolean(doctor && location.state?.date && location.state?.time))

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
    setCurrentStep(3)
    navigate('/booking/confirm', {
      state: flowState(location, {
        patient,
        forSomeoneElse: patient?.relationship !== 'Self' ? true : location.state?.forSomeoneElse,
        fromConfirm: undefined,
        ...extra,
      }),
    })
  }

  const persistSelf = () => {
    const age = form.age || ageFromDob(form.dob)
    const result = completeSelf({
      name: form.name,
      dob: form.dob,
      age,
      gender: form.gender,
      phone: form.phone,
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
      phone: `${form.countryCode} ${form.phone}`,
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
      setForm(formFromPatient(selfPatient))
    }
  }

  const openSelfEditor = (event) => {
    event?.stopPropagation?.()
    setForm(formFromPatient(selfPatient))
    setFormError('')
    setSelectedId('self')
    setEditingSelf(true)
  }

  const selectPatientCard = (patient) => {
    setSelectedId(patient.id)
    if (patient.relationship === 'Self') {
      if (!isPatientProfileComplete(patient)) {
        setForm(formFromPatient(patient))
        setEditingSelf(true)
      }
      return
    }
    setEditingSelf(false)
  }

  const updateForm = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'dob') next.age = ageFromDob(value) || prev.age
      return next
    })
  }

  useEffect(() => {
    if (!doctor || !location.state?.date || !location.state?.time) {
      navigate('/booking/slot', { replace: true, state: location.state })
    }
  }, [doctor, location.state, navigate])

  if (!doctor || !location.state?.date || !location.state?.time) {
    return null
  }

  return (
    <div className="select-patient">
      {adding ? (
        <>
          <div className="select-patient-scroll">
            <p className="select-patient-lead">Add a patient once and reuse them for future appointments.</p>
            <PatientDetailsForm form={form} updateForm={updateForm} showRelationship formError={formError} />
          </div>
          <div className="app-flow-footer">
            <button type="button" className="app-flow-cta" disabled={!canSaveMember} onClick={handleSaveNew}>
              Save & Continue
            </button>
            <button type="button" className="patient-text-btn" onClick={closeAdd}>
              Back to saved patients
            </button>
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
            <p className="select-patient-lead">
              {selfIncomplete
                ? 'Complete your profile to continue. These details are saved once and reused for future bookings.'
                : 'Who is this appointment for?'}
            </p>
            {groups.map((group) => (
              <section key={group.id} className="patient-group">
                <h2>{group.label}</h2>
                {group.patients.map((patient) => {
                  const incomplete = !isPatientProfileComplete(patient)
                  const isSelf = patient.relationship === 'Self'
                  const meta = incomplete
                    ? 'Complete required details'
                    : `${patient.age != null ? `${patient.age} yrs` : 'Age —'} · ${patient.relationship}`
                  return (
                    <div key={patient.id}>
                      <div className={`patient-card ${selectedId === patient.id ? 'is-selected' : ''} ${incomplete ? 'is-incomplete' : ''}`}>
                        <button
                          type="button"
                          className="patient-card-main"
                          onClick={() => selectPatientCard(patient)}
                        >
                          <span className="patient-card-radio" />
                          <span className="patient-card-copy">
                            <strong>{patient.name || 'Your profile'}</strong>
                            <span>{meta}</span>
                          </span>
                        </button>
                        {isSelf ? (
                          <button type="button" className="patient-card-edit" onClick={openSelfEditor}>
                            {incomplete ? 'Complete' : 'Edit'}
                          </button>
                        ) : null}
                      </div>
                      {isSelf && showSelfEditor && selectedId === 'self' ? (
                        <div className="patient-complete-panel">
                          <p className="patient-complete-hint">Age, gender, and a valid mobile number are required before review.</p>
                          <PatientDetailsForm form={form} updateForm={updateForm} formError={formError} />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </section>
            ))}
            <button type="button" className="patient-add" onClick={openAdd}>
              <span className="patient-add-icon">+</span>
              Add New Patient
            </button>
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
