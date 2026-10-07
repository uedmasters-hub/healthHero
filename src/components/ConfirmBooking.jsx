import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { useBookingById } from '../booking'
import DoctorCard from './DoctorCard'
import { BookingReveal, DoctorHeroSkeleton, useBookingReveal } from './BookingReveal'
import { useBookingFlow } from './BookingFlow'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { useSharedHero } from './SharedHero'
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
import { usePushBack } from '../features/pushNav'
import { readVideoJourney, videoEntryState } from '../features/videoConsult/lock'
import {
  clearPharmacyResume,
  issueConsultPrescription,
  readPharmacyResume,
} from '../features/pharmacy/shopApi'
import { AppBar, Badge, Button, DetailRow, FormGroup, Icon, IconButton, List, SectionHead, SheetHeader, Steps, Switch } from './ui'
import './ConfirmBooking.css'
import { RedirectingPage } from './system'

export default function ConfirmBooking() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showSuccess, setShowSuccess } = useBookingFlow()
  const editPatient = usePushBack(-1)
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
  const savedJourney = !isPaidView && !location.state?.doctor ? readVideoJourney() : null
  const draft = isPaidView ? {} : { ...(savedJourney || {}), ...(location.state || {}) }
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
  const resumeHandled = useRef(false)
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
    if (!paid || !(location.state?.showSuccess || location.state?.paid) || resumeHandled.current) return undefined
    const resume = readPharmacyResume()
    if (!resume?.drugs?.length) return undefined
    resumeHandled.current = true
    let cancelled = false
    issueConsultPrescription({
      drugs: resume.drugs,
      bookingId: booking?.engineId || booking?.id,
      providerId: doctor?.providerUuid || doctor?.id,
      appointmentId: booking?.remoteAppointmentId,
    }).then((prescriptionId) => {
      clearPharmacyResume()
      if (!cancelled) {
        navigate('/pharmacy/checkout', { replace: true, state: { prescriptionId } })
      }
    }).catch(() => {
      resumeHandled.current = false
    })
    return () => { cancelled = true }
  }, [paid, booking, doctor, navigate])

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
      const saved = readVideoJourney()
      if (saved?.doctor) {
        navigate('/booking/slot', { replace: true, state: videoEntryState(saved) })
        return
      }
      navigate('/booking')
      return
    }
    if (!patient) {
      navigate('/booking/patient', { replace: true, state: location.state })
    }
  }, [doctor, date, time, patient, navigate, location.state])

  if (!doctor || !date || !time || !patient) {
    return <RedirectingPage title="Taking you back to complete your booking" />
  }

  const dateStr = date.full.toLocaleDateString('en-NP', {
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
    link.download = 'emedicalls-appointment.ics'
    link.click()
    URL.revokeObjectURL(url)
  }

  const shareVisit = async () => {
    const text = `Appointment with Dr. ${doctor.name} on ${dateStr} at ${time} (${visitType || 'In-Person'}). ${doctor.address}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'eMedicalls appointment', text })
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

      <section>
        <SectionHead
          group
          as="h3"
          title="Patient"
          action={<Button variant="text" size="sm" onClick={editPatient}>Change patient</Button>}
        />
        <List>
          <DetailRow icon={<Icon.User />} label="Name" value={patient.name} />
          <DetailRow icon={<Icon.Info />} label="Age" value={patient.age != null ? `${patient.age} yrs` : '—'} />
          <DetailRow icon={<Icon.Users />} label="Relationship" value={patient.relationship} />
          {patient.phone ? <DetailRow icon={<Icon.Phone />} label="Contact" value={patient.phone} /> : null}
        </List>
      </section>

      <section>
        <SectionHead group as="h3" title="Appointment summary" />
        <List>
          <DetailRow icon={<Icon.Calendar />} label="Date" value={dateStr} />
          <DetailRow icon={<Icon.Clock />} label="Time" value={formatTimeRange()} />
          <DetailRow icon={visitType === 'Video' ? <Icon.Video /> : <Icon.User />} label="Type" value={`${visitType || 'In-Person'} Visit`} />
          <DetailRow icon={<Icon.Clock />} label="Duration" value={duration || '30 min'} />
        </List>
      </section>

      <section>
        <FormGroup label={isQuickBook ? 'Reason for visit' : 'Note for the doctor'}>
          <textarea
            className="ds-field"
            placeholder={isQuickBook ? 'Add a brief reason (optional)…' : 'Add symptoms or a note for the doctor (optional)…'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={isQuickBook ? 2 : 4}
          />
        </FormGroup>
      </section>

      {!isQuickBook && (
        <List>
          <div className="ds-list-row">
            <span className="ds-icon-well" aria-hidden="true"><Icon.Bell /></span>
            <span className="ds-list-row__body">
              <span className="ds-list-row__title" id="confirm-sms-label">Send me an SMS reminder</span>
            </span>
            <Switch checked={smsReminder} onChange={setSmsReminder} aria-labelledby="confirm-sms-label" />
          </div>
        </List>
      )}

      <MedicalRecordsPicker selectedRecords={selectedRecords} onChange={setSelectedRecords} />
      </BookingReveal>
      </div>

      <div className="app-flow-footer">
        <button type="button" className="app-flow-cta" disabled={!ready} onClick={handleConfirm}>
          Pay & Confirm · {formatMoney(consultAmount)}
          <Icon.ArrowRight />
        </button>
      </div>
      </>)}

      {showSuccess && (
        <div className={`confirm-success-page is-${phase}`}>
          <AppBar
            className="confirm-success-header"
            title="Confirmation"
            lead={null}
            actions={(
              <IconButton
                label="More"
                onClick={() => {
                  setMenuView('menu')
                  openMenu()
                }}
                disabled={phase !== 'actions'}
              >
                <Icon.More />
              </IconButton>
            )}
          />

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
          <SectionHead group as="h3" title="Appointment summary" />
          <div className="ds-card confirm-hero-card" ref={heroRef}>
            <Badge tone="ready" className="confirm-status-chip">
              <Icon.Calendar />
              {formatCountdown(getAppointmentStart(date, time))}
            </Badge>

            <DoctorCard doctor={doctor} context="identity" className="confirm-success-doctor" disableNavigate />

            <DetailRow icon={<Icon.Calendar />} label="Date" value={dateStr} />
            <DetailRow icon={<Icon.Clock />} label="Time" value={formatTimeRange()} />
            <DetailRow icon={visitType === 'Video' ? <Icon.Video /> : <Icon.User />} label="Type" value={`${visitType || 'In-Person'} Visit`} />

            <div className="ds-list-row confirm-payment-row">
              <Badge tone="success">Paid</Badge>
              <span className="ds-list-row__body">
                <span className="ds-list-row__sub">{paidPayment?.method || 'Card'}</span>
              </span>
              <strong className="confirm-payment-amount tnum">{formatMoney(paidPayment?.amount ?? consultAmount)}</strong>
              <Button variant="text" size="sm" trailingIcon={<Icon.ChevronRight />} onClick={() => runMenuAction('invoice')}>
                Invoice
              </Button>
            </div>

            <DetailRow icon={<Icon.Pin />} value={doctor.address} />
          </div>
          </div>

          <div className={`confirm-success-actions ${phase === 'actions' ? 'is-visible' : ''}`}>
          {note && (
            <section>
              <SectionHead group as="h3" title="Shared symptoms" />
              <div className="ds-card is-padded confirm-symptoms-card">
                <p className="ds-caption">Symptoms you shared</p>
                <p className="ds-body confirm-symptoms-text">{note}</p>
              </div>
            </section>
          )}

          <AttachedRecordsSummary selectedRecords={attachedRecordIds} />

          <section>
            <SectionHead group as="h3" title="What's next" />
            <div className="ds-card is-padded">
              <Steps
                items={[
                  { key: 'review', title: 'Review appointment details', body: 'Confirm your visit information and prepare any questions' },
                  { key: 'checkin', title: 'Complete pre-visit check-in', body: 'Save time at the clinic by filling out forms online' },
                  { key: 'arrive', title: 'Arrive 15 minutes early', body: 'Bring citizenship ID or photo ID and your health insurance card for check-in' },
                ]}
              />
            </div>
          </section>

          <section>
            <SectionHead group as="h3" title="Need help before your visit?" />
            <div className="ds-card is-padded confirm-support-card">
              <p className="ds-body">Our care team can help with any questions or appointment updates before your visit.</p>
              <Button variant="secondary" size="sm" trailingIcon={<Icon.ArrowRight />} onClick={handleContactClinic}>
                Contact clinic
              </Button>
            </div>
          </section>
          </div>
          </div>

          <div className={`sticky-footer-cta confirm-bottom-bar ${phase === 'actions' ? 'is-visible' : 'is-pending'}`}>
            <button type="button" className="sticky-footer-cta__primary" onClick={handleCheckIn}>
              {actions.primaryCta.label}
            </button>
            <button type="button" className="sticky-footer-cta__secondary" onClick={handleDone}>Back to Home</button>
          </div>
        </div>
      )}

      <AppBottomSheet open={showMenu} closing={menuClosing} onClose={closeMenu} labelledBy="confirm-menu-title">
        <SheetHeader titleId="confirm-menu-title" title={menuView === 'cancel' ? 'Cancel appointment' : 'Appointment'} onClose={closeMenu} />
        {menuView === 'cancel' ? (
          <div className="confirm-menu-options">
            <p className="ds-body confirm-sheet-note">
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
