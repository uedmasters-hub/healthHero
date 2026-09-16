import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { useBookingById } from '../booking'
import DoctorCard from './DoctorCard'
import { BookingReveal, DoctorHeroSkeleton, useBookingReveal } from './BookingReveal'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { useSharedHero } from './SharedHero'
import { flowState } from '../lib/careFlow'
import { getAppointmentStart, formatCountdown } from '../lib/bookingPolicy'
import { getAppointmentActions, MENU_ACTION, resolveAppointmentPath } from '../lib/appointmentJourney'
import {
  amountFromDoctor,
  formatMoney,
} from '../lib/paymentSession'
import useNow from '../hooks/useNow'
import AppointmentMenuOptions from './AppointmentMenuOptions'
import BookingInvoiceSheet from './BookingInvoiceSheet'
import MedicalRecordsPicker, { AttachedRecordsSummary } from './MedicalRecordsPicker'
import './ConfirmBooking.css'

export default function ConfirmBooking() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setCurrentStep, showSuccess, setShowSuccess } = useOutletContext()
  const {
    currentBooking,
    setPaymentSession,
    startPayment,
    cancelAppointment,
    focusBooking,
  } = useBooking()
  const shared = useSharedHero()
  const heroRef = useRef(null)
  const now = useNow(15000)

  const routeBookingId = location.state?.bookingId || null
  const isPaidView = Boolean(showSuccess || location.state?.showSuccess || location.state?.paid)
  const bookingById = useBookingById(routeBookingId)

  useEffect(() => {
    if (routeBookingId) focusBooking?.(routeBookingId)
  }, [routeBookingId, focusBooking])

  // Wizard draft fields live in route state until payment; after pay, store is SSOT.
  const draft = isPaidView ? {} : (location.state || {})
  const booking = bookingById || (isPaidView ? currentBooking : null)
  const doctor = isPaidView ? (booking?.doctor || draft.doctor) : (draft.doctor || booking?.doctor)
  const date = isPaidView ? (booking?.date || draft.date) : (draft.date || booking?.date)
  const time = isPaidView ? (booking?.time || draft.time) : (draft.time || booking?.time)
  const visitType = isPaidView ? (booking?.visitType || draft.visitType) : (draft.visitType || booking?.visitType)
  const duration = isPaidView ? (booking?.duration || draft.duration) : (draft.duration || booking?.duration)
  const origin = isPaidView ? (booking?.origin || draft.origin) : (draft.origin || booking?.origin)
  const returnTo = isPaidView ? (booking?.returnTo || draft.returnTo) : (draft.returnTo || booking?.returnTo)
  const patient = isPaidView ? (booking?.patient || draft.patient) : (draft.patient || booking?.patient)
  const payment = booking?.payment || draft.payment
  const paid = isPaidView || Boolean(booking?.payment?.status === 'paid')

  const actions = getAppointmentActions(booking || { doctor, date, time, visitType, duration, patient }, now, {
    surface: 'confirm',
  })
  const isQuickBook = actions.isQuickBook
  const consultAmount = amountFromDoctor(doctor)
  const paidPayment = payment || booking?.payment
  const [note, setNote] = useState(() => booking?.note || location.state?.note || '')
  const [smsReminder, setSmsReminder] = useState(true)
  const { isPresented: showMenu, isClosing: menuClosing, show: openMenu, hide: closeMenuSheet } = useAppSheet()
  const { isPresented: showInvoice, isClosing: invoiceClosing, show: openInvoice, hide: closeInvoice } = useAppSheet()
  const [menuView, setMenuView] = useState('menu')
  const invoiceBooking = booking || {
    doctor,
    date,
    time,
    visitType,
    duration,
    patient,
    payment: paidPayment,
  }
  const [selectedRecords, setSelectedRecords] = useState(
    () => location.state?.selectedRecords || []
  )
  const [phase, setPhase] = useState('form')
  const ready = useBookingReveal(`confirm:${doctor?.id || 'none'}`, Boolean(doctor && date && time && patient && !showSuccess))
  const attachedRecordIds = isPaidView
    ? (booking?.attachedRecordIds || booking?.selectedRecords || selectedRecords)
    : selectedRecords

  useEffect(() => {
    if ((location.state?.showSuccess || location.state?.paid) && !showSuccess) {
      setShowSuccess(true)
    }
  }, [location.state?.showSuccess, location.state?.paid, showSuccess, setShowSuccess])

  useEffect(() => {
    if (!showSuccess) {
      setPhase('form')
      return undefined
    }

    document.querySelector('.confirm-scroll, .confirm-success-body, .booking-content')?.scrollTo({ top: 0, behavior: 'auto' })

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('actions')
      return undefined
    }

    setPhase('processing')
    const timers = [
      window.setTimeout(() => setPhase('check'), 1000),
      window.setTimeout(() => setPhase('copy'), 1450),
      window.setTimeout(() => setPhase('details'), 2170),
      window.setTimeout(() => setPhase('actions'), 2480),
    ]
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [showSuccess])

  useEffect(() => {
    const scroller = document.querySelector('.confirm-success-body')
    if (!scroller) return undefined
    const lock = phase === 'processing' || phase === 'check' || phase === 'copy'
    scroller.style.overflow = lock ? 'hidden' : ''
    if (!lock && (phase === 'details' || phase === 'actions')) {
      scroller.scrollTop = 0
    }
    return () => {
      scroller.style.overflow = ''
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'check') return
    try {
      navigator.vibrate?.([10, 36, 16])
    } catch {
      /* ignore */
    }
  }, [phase])

  useEffect(() => {
    if (!doctor || !date || !time) {
      navigate('/booking')
      return
    }
    if (!patient) {
      navigate('/booking/patient', { replace: true, state: location.state })
    }
  }, [doctor, date, time, patient, navigate, location.state])

  if (!doctor || !date || !time || !patient) {
    return null
  }

  const dateStr = date.full.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const formatTimeRange = () => {
    const start = getAppointmentStart(date, time)
    const durMins = parseInt(duration, 10) || 30
    const end = new Date(start.getTime() + durMins * 60000)
    const fmt = (d) => {
      let hours = d.getHours()
      const mer = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12 || 12
      return `${hours}:${String(d.getMinutes()).padStart(2, '0')} ${mer}`
    }
    return `${fmt(start)} - ${fmt(end)}`
  }

  const handleConfirm = () => {
    if (showSuccess) return
    const draftBooking = {
      doctor,
      date,
      time,
      visitType,
      duration,
      note,
      bookingMode: isQuickBook ? 'quick' : 'standard',
      patient,
      selectedRecords,
      attachedRecordIds: selectedRecords,
      smsReminder,
      origin,
      returnTo,
      engineId: booking?.engineId || booking?.id,
      id: booking?.engineId || booking?.id,
    }
    const { session, booking: pending } = startPayment(draftBooking, {
      flow: 'booking',
      amount: consultAmount,
    })
    setPaymentSession(session)
    const bookingId = pending?.engineId || pending?.id || session?.bookingEngineId
    navigate('/process-payment', {
      state: {
        bookingId,
        flow: 'booking',
        amount: session.amount,
      },
    })
  }

  const handleDone = () => {
    setCurrentStep(0)
    shared?.reset?.()
    navigate('/', { replace: true })
  }

  const closeMenu = (after) => {
    closeMenuSheet(() => {
      setMenuView('menu')
      if (typeof after === 'function') after()
    })
  }

  const handleCheckIn = () => {
    shared?.reset?.()
    navigate(actions.primaryCta.path || resolveAppointmentPath(booking), { replace: true })
  }

  const handleDirections = () => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(doctor.address || '')}`, '_blank')
  }

  const handleContactClinic = () => {
    const phone = doctor.phone || ''
    if (phone) window.location.href = `tel:${phone.replace(/\s/g, '')}`
  }

  const addToCalendar = () => {
    const start = getAppointmentStart(date, time)
    const end = new Date(start.getTime() + (parseInt(duration, 10) || 30) * 60000)
    const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:Appointment with Dr. ${doctor.name}`,
      `LOCATION:${doctor.address || ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'healthhero-appointment.ics'
    link.click()
    URL.revokeObjectURL(url)
  }

  const shareVisit = async () => {
    const text = `Appointment with Dr. ${doctor.name} on ${dateStr} at ${time} (${visitType || 'In-Person'}). ${doctor.address}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'HealthHero appointment', text })
        return
      }
    } catch {
      return
    }
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }

  const confirmCancelAppointment = () => {
    cancelAppointment(booking?.engineId || booking?.id)
    closeMenu(() => {
      shared?.reset?.()
      navigate('/', { replace: true })
    })
  }

  const handleMenuAction = (item) => {
    switch (item.action) {
      case MENU_ACTION.RESCHEDULE:
        closeMenu()
        navigate('/reschedule')
        break
      case MENU_ACTION.CANCEL_APPOINTMENT:
        setMenuView('cancel')
        break
      case MENU_ACTION.CONTACT:
        closeMenu()
        handleContactClinic()
        break
      case MENU_ACTION.CALENDAR:
        closeMenu()
        addToCalendar()
        break
      case MENU_ACTION.SHARE:
        closeMenu()
        shareVisit()
        break
      case MENU_ACTION.INVOICE:
        closeMenu(() => openInvoice())
        break
      default:
        closeMenu()
    }
  }

  const runMenuAction = (action) => {
    if (action === 'invoice') {
      if (showMenu) closeMenu(() => openInvoice())
      else openInvoice()
    }
  }

  return (
    <div className={`confirm-page ${showSuccess ? 'is-success' : ''}`}>

      {!showSuccess && (
      <>
      <div className="confirm-scroll">
      <BookingReveal
        ready={ready}
        skeleton={(
          <>
            <div className="booking-hero">
              <DoctorHeroSkeleton />
            </div>
            <div className="booking-skel-label shimmer" />
            <div className="booking-skel-card shimmer" />
            <div className="booking-skel-label shimmer" />
            <div className="booking-skel-card is-tall shimmer" />
          </>
        )}
      >
      <div className="booking-hero">
        <DoctorCard doctor={doctor} variant="profile" disableNavigate />
      </div>

      <div className="confirm-section-label">
        Patient
        <button
          type="button"
          className="confirm-change-patient"
          onClick={() => navigate('/booking/patient', { state: flowState(location) })}
        >
          Change Patient
        </button>
      </div>
      <div className="confirm-summary-card confirm-patient-card ds-card">
        <div className="confirm-summary-row">
          <svg className="confirm-summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="confirm-summary-label">Name</span>
          <span className="confirm-summary-value">{patient.name}</span>
        </div>
        <div className="confirm-summary-row">
          <svg className="confirm-summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span className="confirm-summary-label">Age</span>
          <span className="confirm-summary-value">{patient.age != null ? `${patient.age} yrs` : '—'}</span>
        </div>
        <div className="confirm-summary-row">
          <svg className="confirm-summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="confirm-summary-label">Relationship</span>
          <span className="confirm-summary-value">{patient.relationship}</span>
        </div>
        {patient.phone ? (
          <div className="confirm-summary-row">
            <svg className="confirm-summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 16 16 0 0 0 .95 3.32 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 16 16 0 0 0 3.32.95A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="confirm-summary-label">Contact</span>
            <span className="confirm-summary-value">{patient.phone}</span>
          </div>
        ) : null}
      </div>

      <div className="confirm-section-label">Appointment Summary</div>
      <div className="confirm-summary-card ds-card">
        <div className="confirm-summary-row">
          <svg className="confirm-summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="confirm-summary-label">Date</span>
          <span className="confirm-summary-value">{dateStr}</span>
        </div>
        <div className="confirm-summary-row">
          <svg className="confirm-summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="confirm-summary-label">Time</span>
          <span className="confirm-summary-value">{formatTimeRange()}</span>
        </div>
        <div className="confirm-summary-row">
          <svg className="confirm-summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="confirm-summary-label">Type</span>
          <span className="confirm-summary-value">{visitType || 'In-Person'} Visit</span>
        </div>
        <div className="confirm-summary-row">
          <svg className="confirm-summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          <span className="confirm-summary-label">Duration</span>
          <span className="confirm-summary-value">{duration || '30 min'}</span>
        </div>
      </div>

      <div className="confirm-section-label">{isQuickBook ? 'Reason for visit' : 'Note for the Doctor'}</div>
      <textarea
        className="confirm-note-input"
        placeholder={isQuickBook ? 'Add a brief reason (optional)...' : 'Add symptoms or a note for the doctor (optional)...'}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={isQuickBook ? 2 : 4}
      />

      {!isQuickBook && (
      <div className="confirm-toggle-row" onClick={() => setSmsReminder(!smsReminder)}>
        <div className="confirm-toggle-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span>Send me an SMS reminder</span>
        </div>
        <div className={`confirm-toggle ${smsReminder ? 'active' : ''}`}>
          <div className="confirm-toggle-thumb" />
        </div>
      </div>
      )}

      <MedicalRecordsPicker selectedRecords={selectedRecords} onChange={setSelectedRecords} />
      </BookingReveal>
      </div>

      <div className="app-flow-footer">
        <button className="app-flow-cta" disabled={!ready} onClick={handleConfirm}>
          Pay & Confirm · {formatMoney(consultAmount)}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
      </>)}

      {showSuccess && (
        <div className={`confirm-success-page is-${phase}`}>
          <div className="confirm-success-header">
            <div className="confirm-success-header-spacer" aria-hidden="true" />
            <h1 className="confirm-success-header-title">Confirmation</h1>
            <button
              type="button"
              className="confirm-success-menu-btn ds-icon-btn is-md"
              aria-label="More"
              onClick={() => {
                setMenuView('menu')
                openMenu()
              }}
              disabled={phase !== 'actions'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>

          <div className="confirm-success-body">
          <div className="confirm-success-stage">
          <div className="confirm-success-hero">
            <div className={`confirm-success-icon ${phase === 'processing' ? 'is-processing' : 'is-success'}`}>
              {phase === 'processing' ? (
                <span className="confirm-process-spinner" aria-hidden="true" />
              ) : (
                <svg className={`confirm-check-svg ${phase !== 'processing' ? 'is-drawn' : ''}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            {phase === 'processing' ? (
              <p className="confirm-success-status is-visible">Confirming your booking…</p>
            ) : (
              <>
                <h2 className="confirm-success-title is-visible">Booking Confirmed!</h2>
                <p className="confirm-success-message is-visible">
                  {isQuickBook
                    ? 'Your visit is booked. Your doctor may not have time to review complete records before this consultation.'
                    : 'Your appointment has been successfully booked.'}
                </p>
              </>
            )}
          </div>
          </div>

          <div className={`confirm-success-details ${phase === 'details' || phase === 'actions' ? 'is-visible' : ''}`}>
          <div className="confirm-section-label">Appointment Summary</div>
          <div className="confirm-summary-card confirm-hero-card ds-card" ref={heroRef}>
            <div className="confirm-status-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatCountdown(getAppointmentStart(date, time))}
            </div>

            <DoctorCard doctor={doctor} context="identity" className="confirm-success-doctor" disableNavigate />

            <div className="confirm-success-row">
              <svg className="confirm-success-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="confirm-success-row-label">Date</span>
              <span className="confirm-success-row-value">{dateStr}</span>
            </div>
            <div className="confirm-success-row">
              <svg className="confirm-success-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="confirm-success-row-label">Time</span>
              <span className="confirm-success-row-value">{formatTimeRange()}</span>
            </div>
            <div className="confirm-success-row">
              <svg className="confirm-success-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="confirm-success-row-label">Type</span>
              <span className="confirm-success-row-value">{visitType || 'In-Person'} Visit</span>
            </div>

            <div className="confirm-payment-row">
              <span className="confirm-payment-badge">Paid</span>
              <span className="confirm-payment-method">{paidPayment?.method || 'Card'}</span>
              <span className="confirm-payment-amount">{formatMoney(paidPayment?.amount ?? consultAmount)}</span>
              <button type="button" className="confirm-payment-invoice" onClick={() => runMenuAction('invoice')}>
                View Invoice
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="confirm-success-row confirm-success-row-last">
              <svg className="confirm-success-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="confirm-success-row-address">{doctor.address}</span>
            </div>
          </div>
          </div>

          <div className={`confirm-success-actions ${phase === 'actions' ? 'is-visible' : ''}`}>
          {note && (
            <>
              <div className="confirm-section-label">Shared Symptoms</div>
              <div className="confirm-symptoms-card">
                <div className="confirm-symptoms-label">Symptoms You Shared</div>
                <p className="confirm-symptoms-text">{note}</p>
                <button className="confirm-symptoms-action">
                  View full symptoms
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </>
          )}

          <AttachedRecordsSummary selectedRecords={attachedRecordIds} />

          <div className="confirm-section-label">What's Next</div>
          <div className="confirm-next-card">
            <div className="confirm-next-row">
              <div className="confirm-next-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                  <line x1="9" y1="18" x2="13" y2="18" />
                </svg>
              </div>
              <div className="confirm-next-text">
                <div className="confirm-next-title">Review Appointment Details</div>
                <div className="confirm-next-desc">Confirm your visit information and prepare any questions</div>
              </div>
            </div>
            <div className="confirm-next-row">
              <div className="confirm-next-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="confirm-next-text">
                <div className="confirm-next-title">Complete Pre-Visit Check-In</div>
                <div className="confirm-next-desc">Save time at the clinic by filling out forms online</div>
              </div>
            </div>
            <div className="confirm-next-row confirm-next-row-last">
              <div className="confirm-next-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="confirm-next-text">
                <div className="confirm-next-title">Arrive 15 Minutes Early</div>
                <div className="confirm-next-desc">Bring Aadhaar or photo ID and your health insurance card for check-in</div>
              </div>
            </div>
          </div>

          <div className="confirm-section-label">Need help before your visit?</div>
          <div className="confirm-support-card">
            <p className="confirm-support-text">Our care team can help with any questions or appointment updates before your visit.</p>
            <button className="confirm-support-action" onClick={handleContactClinic}>
              Contact Clinic
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
          </div>
          </div>

          <div className={`confirm-bottom-bar ${phase === 'actions' ? 'is-visible' : 'is-pending'}`}>
            <button className="confirm-btn" onClick={handleCheckIn}>
              {actions.primaryCta.label}
            </button>
            <button className="confirm-bottom-link" onClick={handleDone}>Back to Home</button>
          </div>
        </div>
      )}

      <AppBottomSheet open={showMenu} closing={menuClosing} onClose={closeMenu} labelledBy="confirm-menu-title">
        <div className="ds-sheet-header">
          <h3 id="confirm-menu-title">{menuView === 'cancel' ? 'Cancel appointment' : 'Appointment'}</h3>
          <button type="button" className="ds-sheet-close" onClick={closeMenu} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {menuView === 'cancel' ? (
          <div className="confirm-menu-options">
            <p className="confirm-sheet-note">
              Cancel this appointment with Dr. {doctor.name}? The slot may be offered to another patient.
            </p>
            <button type="button" className="ds-sheet-option is-danger" onClick={confirmCancelAppointment}>
              Yes, cancel appointment
            </button>
            <button type="button" className="ds-sheet-option" onClick={() => setMenuView('menu')}>
              Keep appointment
            </button>
          </div>
        ) : (
          <AppointmentMenuOptions
            className="confirm-menu-options"
            items={actions.menuItems}
            onAction={handleMenuAction}
          />
        )}
      </AppBottomSheet>

      <BookingInvoiceSheet
        open={showInvoice}
        closing={invoiceClosing}
        onClose={closeInvoice}
        booking={invoiceBooking}
      />
    </div>
  )
}
