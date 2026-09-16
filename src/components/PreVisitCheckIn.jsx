import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from './BookingContext'
import DoctorCard from './DoctorCard'
import { BookingReveal, useBookingReveal } from './BookingReveal'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import StickyFooterCta from './StickyFooterCta'
import { useSharedHero } from './SharedHero'
import useNow from '../hooks/useNow'
import {
  getAppointmentStart,
} from '../lib/bookingPolicy'
import {
  APPOINTMENT_STATUS,
  MENU_ACTION,
  getAppointmentActions,
  withBookingStatus,
} from '../lib/appointmentJourney'
import AppointmentMenuOptions from './AppointmentMenuOptions'
import './PreVisitCheckIn.css'

const faqItems = [
  { q: 'What should I bring?', a: 'Bring Aadhaar or a photo ID, your health insurance / mediclaim card, a list of current medications, and any recent lab reports.' },
  { q: 'Can I reschedule?', a: 'You can reschedule or cancel until 45 minutes before your appointment. After that, changes are locked so your doctor can prepare.' },
  { q: 'What if I\'m late?', a: 'Call the clinic if you are running late. A 15-minute grace window is typically available.' },
  { q: 'How to access lab reports?', a: 'Open Appointment Details → Medical Records → Lab Reports to view or download your files.' },
  { q: 'When to seek urgent care?', a: 'Seek immediate care for severe chest pain, difficulty breathing, uncontrolled bleeding, or sudden numbness or confusion.' },
]

function InfoCell({ label, value, children }) {
  return (
    <div className="previsit-info-cell">
      <span className="previsit-info-icon">{children}</span>
      <div>
        <div className="previsit-info-label">{label}</div>
        <div className="previsit-info-value">{value}</div>
      </div>
    </div>
  )
}

export default function PreVisitCheckIn() {
  const navigate = useNavigate()
  const { currentBooking, setCurrentBooking } = useBooking()
  const now = useNow(15000)
  const shared = useSharedHero()
  const heroRef = useRef(null)
  const [expandedFaq, setExpandedFaq] = useState(null)
  const [sheet, setSheet] = useState(null)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const ready = useBookingReveal(
    `previsit:${currentBooking?.doctor?.id || 'none'}`,
    Boolean(currentBooking) && (!shared?.active || shared.phase === 'settled'),
  )

  useEffect(() => {
    if (!currentBooking) navigate('/', { replace: true })
  }, [currentBooking, navigate])

  useEffect(() => {
    if (!currentBooking) return
    if (currentBooking.status !== APPOINTMENT_STATUS.CHECKED_IN) {
      setCurrentBooking((prev) => withBookingStatus(prev, APPOINTMENT_STATUS.CHECKED_IN))
    }
  }, [currentBooking, setCurrentBooking])

  const sharedFlow = Boolean(
    currentBooking && shared?.active && String(shared.doctor?.id) === String(currentBooking.doctor?.id),
  )
  const hideHero = sharedFlow && shared.phase !== 'settled' && shared.phase !== 'hero-settled'
  const contentReady = (!sharedFlow || shared.phase === 'settled') && ready

  useLayoutEffect(() => {
    if (shared?.phase === 'preparing' && currentBooking && String(shared.doctor?.id) === String(currentBooking.doctor?.id) && heroRef.current) {
      shared.registerDest(heroRef.current)
    }
  }, [shared?.phase, currentBooking, shared])

  if (!currentBooking) return null

  const { doctor, date, time, visitType, duration } = currentBooking
  const doctorName = doctor.name?.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`
  const appointmentStart = getAppointmentStart(date, time)
  const actions = getAppointmentActions(currentBooking, now, { surface: 'ready' })
  const { menuItems, primaryCta, canCancelCheckIn } = actions

  const dateStr = date.full.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const getArrivalTime = () => {
    const [timePart, modifier] = time.split(' ')
    let [hours, minutes] = timePart.split(':').map(Number)
    const isPM = (modifier || '').toUpperCase() === 'PM'
    if (isPM && hours !== 12) hours += 12
    if (!isPM && hours === 12) hours = 0
    minutes -= 15
    if (minutes < 0) {
      minutes += 60
      hours -= 1
      if (hours < 0) hours = 23
    }
    let h = hours
    const m = String(minutes).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    if (h > 12) h -= 12
    if (h === 0) h = 12
    return `${h}:${m} ${ampm}`
  }

  const arrivalTime = getArrivalTime()
  const steps = [
    { id: 1, label: 'Pre-Visit Checked In', detail: 'Your check-in is complete. The clinical team is notified.', status: 'completed' },
    { id: 2, label: 'Arrive at the Clinic', detail: `Head to ${doctor.address}. Arrive by ${arrivalTime}.`, status: 'current' },
    { id: 3, label: 'Front Desk Welcome', detail: 'Confirm your presence with our reception team inside.', status: 'pending' },
    { id: 4, label: `Meet with ${doctorName}`, detail: 'Your consultation will start promptly.', status: 'pending' },
  ]

  const openMaps = () => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(doctor.address || '')}`, '_blank')
  }

  const openSheet = (next) => {
    setSheet(next)
    show()
  }

  const closeSheet = () => {
    hide(() => setSheet(null))
  }

  const callClinic = () => {
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

  const goHome = () => {
    shared?.reset?.()
    navigate('/', { replace: true })
  }

  const confirmCancelAppointment = () => {
    setCurrentBooking(null)
    closeSheet()
    navigate('/treat', { replace: true })
  }

  const handleMenuAction = (item) => {
    switch (item.action) {
      case MENU_ACTION.VIEW_APPOINTMENT:
        closeSheet()
        navigate('/appointment', { replace: true })
        break
      case MENU_ACTION.RESCHEDULE:
        closeSheet()
        navigate('/reschedule')
        break
      case MENU_ACTION.CONTACT:
        closeSheet()
        callClinic()
        break
      case MENU_ACTION.CALENDAR:
        addToCalendar()
        setSheet({ type: 'calendar' })
        break
      case MENU_ACTION.CANCEL_CHECKIN:
        closeSheet()
        if (canCancelCheckIn) navigate('/cancel-checkin')
        break
      case MENU_ACTION.CANCEL_APPOINTMENT:
        setSheet({ type: 'cancel' })
        break
      default:
        closeSheet()
    }
  }

  const sheetTitle = {
    menu: 'Appointment',
    contact: 'Contact clinic',
    calendar: 'Added to calendar',
    cancel: 'Cancel appointment',
  }[sheet?.type] || 'Appointment'

  return (
    <div className={`previsit-page ${sharedFlow ? 'is-shared-hero' : ''} ${!contentReady ? 'is-skeleton' : ''} ${contentReady ? 'is-content-ready' : ''}`}>
      <div className="previsit-header-bar">
        <div className="previsit-header-spacer" aria-hidden="true" />
        <h1 className="previsit-header-title">Ready for Visit</h1>
        <button type="button" className="previsit-menu-btn" aria-label="More" onClick={() => openSheet({ type: 'menu' })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      <div className="previsit-body">
        {contentReady ? (
          <div className="previsit-success-banner">
            <div className="previsit-success-check" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h2 className="previsit-success-title">Successfully checked in</h2>
              <p className="previsit-success-desc">
                The clinic team is preparing for your visit with {doctorName}. Review the details below, then head in.
              </p>
            </div>
          </div>
        ) : (
          <div className="previsit-skel-banner shimmer" aria-hidden="true" />
        )}

        <div className={`booking-hero ${hideHero ? 'is-morphing' : ''}`} ref={heroRef}>
          <DoctorCard doctor={doctor} variant="profile" disableNavigate />
        </div>

        <BookingReveal
          ready={contentReady}
          skeleton={(
            <>
              <div className="booking-skel-card is-tall shimmer" />
              <div className="booking-skel-label shimmer" />
              <div className="booking-skel-card is-tall shimmer" />
              <div className="booking-skel-card shimmer" />
            </>
          )}
        >
          <div className="previsit-card">
            <h3 className="previsit-card-title">Your appointment</h3>
            <div className="previsit-info-grid">
              <InfoCell label="Date" value={dateStr}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </InfoCell>
              <InfoCell label="Time" value={time}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </InfoCell>
              <InfoCell label="Type" value={`${visitType || 'In-Person'} Visit`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </InfoCell>
              <InfoCell label="Location" value={doctor.address}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </InfoCell>
            </div>
          </div>

          <div className="previsit-card">
            <h3 className="previsit-card-title">What to expect next</h3>
            <div className="previsit-timeline">
              {steps.map((step, i) => (
                <div key={step.id} className={`previsit-step ${step.status}`}>
                  <div className="previsit-step-left">
                    <div className="previsit-step-icon">
                      {step.status === 'completed' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="previsit-step-num">{step.id}</span>
                      )}
                    </div>
                    {i < steps.length - 1 && <div className="previsit-step-line" />}
                  </div>
                  <div className="previsit-step-content">
                    <div className="previsit-step-label">{step.label}</div>
                    <div className="previsit-step-detail">{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="previsit-card">
            <div className="previsit-card-header">
              <h3 className="previsit-card-title">Clinic location</h3>
              <span className="previsit-floor-badge">3rd Floor</span>
            </div>
            <div className="previsit-clinic-row">
              <div className="previsit-map-thumb" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="previsit-clinic-info">
                <div className="previsit-clinic-address">{doctor.address}</div>
                <div className="previsit-clinic-floor">Suite 302 · 3rd Floor</div>
                <button type="button" className="previsit-directions-link" onClick={openMaps}>
                  View Directions
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="previsit-card">
            <h3 className="previsit-card-title">Important reminders</h3>
            <div className="previsit-reminders">
              <div className="previsit-reminder-item">
                <div className="previsit-reminder-dot" />
                <span>Have Aadhaar or photo ID and your health insurance card ready at the desk.</span>
              </div>
              <div className="previsit-reminder-item">
                <div className="previsit-reminder-dot" />
                <span>Wear accessible clothing in case lab work is needed.</span>
              </div>
            </div>
          </div>

          <div className="previsit-section">
            <h3 className="previsit-section-title">Frequently asked questions</h3>
            <div className="previsit-faq-list">
              {faqItems.map((item, i) => (
                <div key={item.q} className="previsit-faq-item-wrap">
                  <button type="button" className="previsit-faq-item" onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                    <span className="previsit-faq-question">{item.q}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`previsit-faq-chevron ${expandedFaq === i ? 'expanded' : ''}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {expandedFaq === i ? <p className="previsit-faq-answer">{item.a}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </BookingReveal>
      </div>

      <StickyFooterCta
        primaryLabel={primaryCta.label}
        onPrimary={openMaps}
        primaryDisabled={!contentReady}
        onSecondary={goHome}
      />

      {isPresented && sheet && (
        <AppBottomSheet open closing={isClosing} onClose={closeSheet} labelledBy="previsit-sheet-title">
          <div className="ds-sheet-header">
            <h3 id="previsit-sheet-title">{sheetTitle}</h3>
            <button type="button" className="ds-sheet-close" onClick={closeSheet} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {sheet.type === 'menu' && (
            <AppointmentMenuOptions
              className="previsit-sheet-options"
              items={menuItems}
              onAction={handleMenuAction}
            />
          )}

          {sheet.type === 'cancel' && (
            <div className="previsit-sheet-body">
              <p className="previsit-sheet-note">
                Cancel this appointment with Dr. {doctor.name}? The slot may be offered to another patient.
              </p>
              <button type="button" className="ds-sheet-option is-danger" onClick={confirmCancelAppointment}>
                Yes, cancel appointment
              </button>
            </div>
          )}

          {sheet.type === 'calendar' && (
            <div className="previsit-sheet-body">
              <p className="previsit-sheet-note">
                A calendar file was downloaded. Open it to add this visit to your device calendar.
              </p>
            </div>
          )}
        </AppBottomSheet>
      )}
    </div>
  )
}
