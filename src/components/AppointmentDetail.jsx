import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { useBookingById, useRouteBookingId } from '../booking'
import DoctorCard from './DoctorCard'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { useSharedHero } from './SharedHero'
import { BookingReveal, DoctorHeroSkeleton, useBookingReveal } from './BookingReveal'
import { ATTACH_GROUPS, displayHealthDate, healthItemMeta, itemsForAttachGroup, useUser } from '../user'
import { VISIT_TYPES } from './DatePicker'
import useNow from '../hooks/useNow'
import {
  formatCountdown,
  getAppointmentStart,
  PREP_LOCK_MESSAGE,
} from '../lib/bookingPolicy'
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_STAGE,
  MENU_ACTION,
  getAppointmentActions,
  withBookingStatus,
} from '../lib/appointmentJourney'
import StickyFooterCta from './StickyFooterCta'
import AppointmentMenuOptions from './AppointmentMenuOptions'
import { formatMoney } from '../lib/paymentSession'
import './AppointmentDetail.css'

const checklistItems = [
  'Bring Aadhaar or photo ID and your health insurance card',
  'Complete medical history form',
  'List current medications',
  'Wear comfortable clothing',
]

const faqItems = [
  { q: 'What should I bring?', a: 'Bring Aadhaar or a photo ID, your health insurance / mediclaim card, a list of current medications, and any recent lab reports.' },
  { q: 'Can I reschedule?', a: 'You can reschedule or cancel until 45 minutes before your appointment. After that, changes are locked so your doctor can prepare.' },
  { q: 'What if I\'m late?', a: 'Call the clinic if you are running late. A 15-minute grace window is typically available.' },
  { q: 'How to access lab reports?', a: 'Open Medical Records → Lab Reports on this page to view or download your files.' },
  { q: 'When to seek urgent care?', a: 'Seek immediate care for severe chest pain, difficulty breathing, uncontrolled bleeding, or sudden numbness or confusion.' },
]

const recommendedArticles = [
  { type: 'featured', title: 'Managing Your Blood Sugar', subtitle: 'Endocrinology guidelines & lifestyle tips' },
  { type: 'card', title: 'Understanding Thyroid Health', subtitle: '5 min read', image: '/img/reports/MRI-showing-posterior-fossa-tumor-extending-to-the-spinal-cord-in-both-T2-coronal-view.png' },
  { type: 'card', title: 'Nutrition Tips for Energy', subtitle: '4 min read', image: '/img/reports/Computed-tomography-angiogram-of-abdomen-revealing-multiple-wedge-shaped-infarcts-in-left.png' },
]

const defaultPayment = {
  consultationFee: 1200,
  insuranceCoverage: 200,
  copay: 1000,
  totalPaid: 1000,
  method: 'UPI · ananya@okhdfcbank',
  invoiceId: 'INV-2026-0916',
}

const recordIcons = {
  reports: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  prescriptions: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  ),
  medications: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  history: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

function padTime(hours, minutes, modifier) {
  const h = String(hours).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')
  return `${h}:${m} ${modifier}`
}

export default function AppointmentDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentBooking, setCurrentBooking, cancelAppointment, checkIn, focusBooking } = useBooking()
  const { health } = useUser()
  const bookingId = useRouteBookingId(location.state)
  const bookingFromStore = useBookingById(bookingId)
  const booking = bookingFromStore || currentBooking

  useEffect(() => {
    if (bookingId) focusBooking?.(bookingId)
  }, [bookingId, focusBooking])

  const now = useNow(15000)
  const shared = useSharedHero()
  const heroRef = useRef(null)
  const [checkedItems, setCheckedItems] = useState([])
  const [expandedFaq, setExpandedFaq] = useState(null)
  const [notes, setNotes] = useState(booking?.note || '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [showUrgentCare, setShowUrgentCare] = useState(false)
  const [sheet, setSheet] = useState(null)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const revealReady = useBookingReveal(
    `appointment:${booking?.doctor?.id || bookingId || 'none'}`,
    Boolean(booking) && (!shared?.active || shared.phase === 'settled'),
  )

  useEffect(() => {
    if (!booking) {
      navigate('/', { replace: true })
      return
    }
    const stageActions = getAppointmentActions(booking, now, { surface: 'details' })
    if (stageActions.stage === APPOINTMENT_STAGE.NEEDS_PREP) {
      navigate('/prepare-visit', { replace: true })
    }
  }, [booking, navigate, now])

  const sharedFlow = Boolean(
    booking && shared?.active && String(shared.doctor?.id) === String(booking.doctor?.id),
  )
  const hideHero = sharedFlow && shared.phase !== 'settled' && shared.phase !== 'hero-settled'
  const contentReady = (!sharedFlow || shared.phase === 'settled') && revealReady
  const showSkeletons = !contentReady

  useLayoutEffect(() => {
    if (shared?.phase === 'preparing' && booking && String(shared.doctor?.id) === String(booking.doctor?.id) && heroRef.current) {
      shared.registerDest(heroRef.current)
    }
  }, [shared?.phase, booking, shared])

  if (!booking) return null

  const { doctor, date, time, visitType, duration, rescheduleHistory } = booking
  const appointmentStart = getAppointmentStart(date, time)
  const actions = getAppointmentActions(booking, now, { surface: 'details' })
  const {
    isLocked,
    canCancelAppointment,
    canEditBooking,
    menuItems,
    primaryCta,
    lockMessage,
  } = actions
  const wasRescheduled = (rescheduleHistory && rescheduleHistory.length > 0)
    || (booking.meta?.rescheduleHistory && booking.meta.rescheduleHistory.length > 0)
  const history = rescheduleHistory || booking.meta?.rescheduleHistory || []
  const lastReschedule = wasRescheduled ? history[history.length - 1] : null

  const paid = booking.payment || {}
  const paidAmount = Number(paid.amount ?? paid.consultationFee ?? doctor?.fee ?? defaultPayment.totalPaid)
  const payment = {
    consultationFee: Number(paid.consultationFee ?? paidAmount),
    insuranceCoverage: Number(paid.discount ?? 0) > 0 ? Number(paid.discount) : defaultPayment.insuranceCoverage,
    copay: paidAmount,
    totalPaid: paidAmount,
    method: paid.method || defaultPayment.method,
    invoiceId: paid.bookingId || paid.paymentId || paid.orderId || defaultPayment.invoiceId,
    ...(wasRescheduled
      ? {
        rescheduleFee: Number(lastReschedule?.amount ?? 150),
        totalPaid: paidAmount + Number(lastReschedule?.amount ?? 0),
        invoiceId: paid.bookingId || `INV-RESCH-${history.length}`,
      }
      : {}),
  }

  const dateStr = date.full.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const formatTimeRange = () => {
    const [timePart, modifier] = time.split(' ')
    let [hours, minutes] = timePart.split(':')
    hours = parseInt(hours, 10)
    const startMod = (modifier || 'AM').toUpperCase()
    const durMins = parseInt(duration, 10) || 30
    let endHours = hours
    let endMins = parseInt(minutes, 10) + durMins
    if (endMins >= 60) {
      endHours += 1
      endMins -= 60
    }
    const endModifier = endHours >= 12 ? 'PM' : startMod
    let displayEnd = endHours
    if (displayEnd > 12) displayEnd -= 12
    if (displayEnd === 0) displayEnd = 12
    return `${padTime(hours, minutes, startMod)} – ${padTime(displayEnd, endMins, endModifier)}`
  }

  const openSheet = (next) => {
    setSheet(next)
    show()
  }

  const closeSheet = () => {
    hide(() => setSheet(null))
  }

  const openLockedSheet = () => openSheet({ type: 'locked' })

  const requestReschedule = () => {
    if (!canEditBooking) {
      openLockedSheet()
      return
    }
    navigate('/reschedule')
  }

  const requestCancel = () => {
    if (!canCancelAppointment) {
      openLockedSheet()
      return
    }
    openSheet({ type: 'cancel' })
  }

  const confirmCancel = () => {
    cancelAppointment(booking?.engineId || booking?.id || bookingId)
    hide(() => {
      setSheet(null)
      shared?.reset?.()
      navigate('/', { replace: true })
    })
  }

  const runPrimaryCta = () => {
    if (primaryCta.action === 'check_in') {
      checkIn(booking?.engineId || booking?.id || bookingId)
    }
    if (primaryCta.path) {
      navigate(primaryCta.path, { replace: true })
    }
  }

  const saveNotes = () => {
    if (isLocked || !notes.trim()) return
    setNotesSaved(true)
    setCurrentBooking((prev) => (prev ? { ...prev, note: notes } : prev))
    openSheet({ type: 'notes' })
  }

  const changeVisitType = (next) => {
    if (isLocked) return
    setCurrentBooking((prev) => (prev ? { ...prev, visitType: next } : { ...booking, visitType: next }))
    closeSheet()
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
    openSheet({ type: 'shared' })
  }

  const addToCalendar = () => {
    const start = new Date(date.full)
    const [timePart, modifier] = time.split(' ')
    let [hours, minutes] = timePart.split(':').map(Number)
    const isPM = (modifier || '').toUpperCase() === 'PM'
    if (isPM && hours !== 12) hours += 12
    if (!isPM && hours === 12) hours = 0
    start.setHours(hours, minutes, 0, 0)
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
    openSheet({ type: 'calendar' })
  }

  const handleMenuAction = (item) => {
    switch (item.action) {
      case MENU_ACTION.RESCHEDULE:
        closeSheet()
        requestReschedule()
        break
      case MENU_ACTION.CANCEL_APPOINTMENT:
        requestCancel()
        break
      case MENU_ACTION.CANCEL_CHECKIN:
        closeSheet()
        navigate('/cancel-checkin')
        break
      case MENU_ACTION.CONTACT:
        setSheet({ type: 'contact' })
        break
      case MENU_ACTION.CALENDAR:
        closeSheet()
        addToCalendar()
        break
      case MENU_ACTION.SHARE:
        shareVisit()
        break
      case MENU_ACTION.INVOICE:
        setSheet({ type: 'invoice' })
        break
      default:
        closeSheet()
    }
  }

  const sheetTitle = {
    records: ATTACH_GROUPS.find((tab) => tab.key === sheet?.key)?.label || 'Medical Records',
    contact: 'Contact clinic',
    help: 'Need help?',
    invoice: 'Invoice',
    receipt: 'Download receipt',
    history: 'Payment history',
    article: sheet?.article?.title || 'Article',
    menu: 'Appointment',
    shared: 'Appointment shared',
    calendar: 'Added to calendar',
    notes: 'Notes saved',
    locked: 'Changes unavailable',
    cancel: 'Cancel appointment',
    visitType: 'Consultation type',
  }[sheet?.type] || ''

  return (
    <div className={`appointment-page ${sharedFlow ? 'is-shared-hero' : ''} ${showSkeletons ? 'is-skeleton' : ''} ${contentReady ? 'is-content-ready' : ''}`}>
      <div className="appointment-header-bar">
        <div className="appointment-header-spacer" aria-hidden="true" />
        <h1 className="appointment-header-title">Appointment Details</h1>
        <button type="button" className="appointment-menu-btn" aria-label="More" onClick={() => openSheet({ type: 'menu' })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      <div className="appointment-body">
        <div className={`appointment-countdown ${isLocked ? 'is-soon' : ''} ${showSkeletons ? 'is-pending' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {formatCountdown(appointmentStart, now)}
        </div>

        {isLocked && !showSkeletons && (
          <div className="appointment-lock-banner">
            <span className="appointment-mode-chip">Editing locked</span>
            <p>{PREP_LOCK_MESSAGE}</p>
          </div>
        )}

        {wasRescheduled && !showSkeletons && (
          <div className="appointment-reschedule-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <div className="appointment-reschedule-banner-text">
              <span className="appointment-reschedule-banner-title">Rescheduled Appointment</span>
              <span className="appointment-reschedule-banner-desc">
                Changed from {lastReschedule.oldDate}, {lastReschedule.oldTime}
              </span>
            </div>
          </div>
        )}

        <div className={`appointment-summary-card ds-card ${hideHero ? 'is-morphing' : ''}`} ref={heroRef}>
        <DoctorCard doctor={doctor} context="identity" className="appointment-doctor-row" origin="appointment" />

        <div className="appointment-info-grid">
          {booking.patient ? (
            <>
              <div className="appointment-info-cell">
                <span className="appointment-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <div>
                  <div className="appointment-info-label">Patient</div>
                  <div className="appointment-info-value">{booking.patient.name}</div>
                </div>
              </div>
              <div className="appointment-info-cell">
                <span className="appointment-info-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <div>
                  <div className="appointment-info-label">Relationship</div>
                  <div className="appointment-info-value">{booking.patient.relationship}</div>
                </div>
              </div>
            </>
          ) : null}
          <div className="appointment-info-cell">
            <span className="appointment-info-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div>
              <div className="appointment-info-label">Date</div>
              <div className="appointment-info-value">{dateStr}</div>
            </div>
          </div>
          <div className="appointment-info-cell">
            <span className="appointment-info-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div>
              <div className="appointment-info-label">Time</div>
              <div className="appointment-info-value">{formatTimeRange()}</div>
            </div>
          </div>
          <div className="appointment-info-cell">
            <span className="appointment-info-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div>
              <div className="appointment-info-label">Type</div>
              {isLocked ? (
                <div className="appointment-info-value">{visitType || 'In-Person'} Visit</div>
              ) : (
                <button type="button" className="appointment-info-edit" onClick={() => openSheet({ type: 'visitType' })}>
                  {visitType || 'In-Person'} Visit
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="appointment-info-cell">
            <span className="appointment-info-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <div>
              <div className="appointment-info-label">Location</div>
              <div className="appointment-info-value">{doctor.address}</div>
            </div>
          </div>
        </div>

        <div className="appointment-action-row">
          <button
            type="button"
            className="appointment-action-item"
            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(doctor.address || '')}`, '_blank')}
          >
            <span className="appointment-action-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </span>
            <span className="appointment-action-label">Get Directions</span>
          </button>
          <button type="button" className="appointment-action-item" onClick={addToCalendar}>
            <span className="appointment-action-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span className="appointment-action-label">Add to Calendar</span>
          </button>
          <button type="button" className="appointment-action-item" onClick={() => openSheet({ type: 'contact' })}>
            <span className="appointment-action-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </span>
            <span className="appointment-action-label">Contact Clinic</span>
          </button>
        </div>
        </div>

        <BookingReveal
          ready={contentReady}
          skeleton={(
            <>
              <div className="booking-skel-label shimmer" />
              <div className="booking-skel-card is-tall shimmer" />
              <div className="booking-skel-card shimmer" />
              <div className="booking-skel-label shimmer" />
              <div className="booking-skel-card is-tall shimmer" />
              <div className="booking-skel-card shimmer" />
              <div className="booking-skel-label shimmer" />
              <div className="booking-skel-card is-tall shimmer" />
            </>
          )}
        >
        <div className="appointment-section">
          <h3 className="appointment-section-title">Before your visit</h3>
          <div className="appointment-checklist">
            {checklistItems.map((item, i) => (
              <button type="button" key={item} className="appointment-check-item" onClick={() => setCheckedItems((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}>
                <span className={`appointment-checkbox ${checkedItems.includes(i) ? 'checked' : ''}`}>
                  {checkedItems.includes(i) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="appointment-check-text">{item}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="appointment-info-banner">
          <span className="appointment-info-banner-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <p className="appointment-info-banner-text">Arrive 15 minutes early. Bring recent lab results.</p>
        </div>

        <button type="button" className="appointment-urgent-care" onClick={() => setShowUrgentCare((open) => !open)}>
          <span className="appointment-urgent-care-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            When to seek urgent care
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`appointment-urgent-care-chevron ${showUrgentCare ? 'expanded' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showUrgentCare && (
          <div className="appointment-urgent-care-content">
            Seek immediate care if you experience severe chest pain, difficulty breathing, uncontrolled bleeding, or signs of stroke such as sudden numbness or confusion.
          </div>
        )}

        <div className="appointment-section">
          <h3 className="appointment-section-title">Medical records {isLocked ? <span className="appointment-view-only">View only</span> : null}</h3>
          <div className="appointment-records-card">
            {ATTACH_GROUPS.map((tab) => {
              const groupItems = itemsForAttachGroup(health, tab.key)
              const attachedCount = (booking.attachedRecordIds || []).filter((id) => groupItems.some((item) => item.id === id)).length
              return (
                <button type="button" key={tab.key} className="appointment-record-row" onClick={() => openSheet({ type: 'records', key: tab.key })}>
                  <span className="appointment-record-icon">{recordIcons[tab.key]}</span>
                  <span className="appointment-record-label">{tab.label}</span>
                  {attachedCount ? <span className="appointment-record-count">{attachedCount}</span> : null}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="appointment-record-chevron">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )
            })}
          </div>
        </div>

        <div className="appointment-section">
          <div className="appointment-payment-card">
            <div className="appointment-payment-header">
              <h3 className="appointment-section-title is-inline">Payment & invoice</h3>
              <span className="appointment-payment-badge paid">Paid</span>
            </div>

            <div className="appointment-billing-row">
              <span className="appointment-billing-label">Consultation Fee</span>
              <span className="appointment-billing-value">{formatMoney(payment.consultationFee)}</span>
            </div>
            {wasRescheduled && (
              <div className="appointment-billing-row">
                <span className="appointment-billing-label">Reschedule Fee</span>
                <span className="appointment-billing-value">{formatMoney(payment.rescheduleFee)}</span>
              </div>
            )}
            <div className="appointment-billing-row">
              <span className="appointment-billing-label">Mediclaim Discount</span>
              <span className="appointment-billing-value discount">-{formatMoney(payment.insuranceCoverage)}</span>
            </div>
            <div className="appointment-billing-row">
              <span className="appointment-billing-label">Amount Payable</span>
              <span className="appointment-billing-value">{formatMoney(payment.copay)}</span>
            </div>
            <div className="appointment-billing-divider" />
            <div className="appointment-billing-row total">
              <span className="appointment-billing-label">Total Paid</span>
              <span className="appointment-billing-value total">{formatMoney(payment.totalPaid)}</span>
            </div>

            <div className="appointment-payment-meta">
              <div className="appointment-payment-method">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                {payment.method}
              </div>
              <div className="appointment-payment-invoice">Invoice #{payment.invoiceId}</div>
            </div>

            <div className="appointment-payment-actions">
              <button type="button" className="appointment-payment-action" onClick={() => openSheet({ type: 'invoice' })}>
                <span className="appointment-payment-action-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  View Invoice
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button type="button" className="appointment-payment-action" onClick={() => openSheet({ type: 'receipt' })}>
                <span className="appointment-payment-action-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Receipt (PDF)
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button type="button" className="appointment-payment-action last" onClick={() => openSheet({ type: 'history' })}>
                <span className="appointment-payment-action-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Payment History
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="appointment-section">
          <h3 className="appointment-section-title">Notes for your doctor</h3>
          <textarea
            className="appointment-notes-input"
            placeholder={isLocked ? 'Notes can no longer be updated' : 'Add notes for your doctor...'}
            value={notes}
            onChange={(e) => { if (isLocked) return; setNotes(e.target.value); setNotesSaved(false) }}
            rows={3}
            readOnly={isLocked}
          />
          <button
            type="button"
            className="appointment-save-notes-btn"
            disabled={isLocked || !notes.trim() || notesSaved}
            onClick={saveNotes}
          >
            {isLocked ? 'Notes locked' : notesSaved ? 'Notes saved' : 'Save Notes'}
          </button>
        </div>

        <div className="appointment-section">
          <h3 className="appointment-section-title">Recommended for you</h3>
          <div className="appointment-recommended">
            {recommendedArticles.filter((article) => article.type === 'featured').map((article) => (
              <button type="button" key={article.title} className="appointment-article featured" onClick={() => openSheet({ type: 'article', article })}>
                <span className="appointment-article-featured-left">
                  <span className="appointment-article-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21s-6.5-4.35-9.33-8.5C.5 9.5 2.2 5 6.5 5c2.1 0 3.4 1.1 4.5 2.5C12.1 6.1 13.4 5 15.5 5c4.3 0 6 4.5 3.83 7.5C18.5 16.65 12 21 12 21z" />
                    </svg>
                  </span>
                  <span>
                    <span className="appointment-article-title">{article.title}</span>
                    <span className="appointment-article-subtitle">{article.subtitle}</span>
                  </span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
            <div className="appointment-article-grid">
              {recommendedArticles.filter((article) => article.type === 'card').map((article) => (
                <button type="button" key={article.title} className="appointment-article card" onClick={() => openSheet({ type: 'article', article })}>
                  <span className="appointment-article-thumb">
                    <img src={article.image} alt="" className="appointment-article-thumb-img" />
                  </span>
                  <span className="appointment-article-body">
                    <span className="appointment-article-title">{article.title}</span>
                    <span className="appointment-article-subtitle">{article.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="appointment-section">
          <h3 className="appointment-section-title">Frequently asked questions</h3>
          <div className="appointment-faq-list">
            {faqItems.map((item, i) => (
              <div key={item.q} className="appointment-faq-item-wrap">
                <button type="button" className="appointment-faq-item" onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                  <span className="appointment-faq-question">{item.q}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`appointment-faq-chevron ${expandedFaq === i ? 'expanded' : ''}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {expandedFaq === i && <p className="appointment-faq-answer">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="appointment-support-bar">
          <div className="appointment-support-text">
            <span className="appointment-support-msg">We're here for you every step of the way.</span>
            <span className="appointment-support-sub">Our clinic support team is available 24/7.</span>
          </div>
          <button type="button" className="appointment-help-btn" onClick={() => openSheet({ type: 'help' })}>Need Help?</button>
        </div>
        </BookingReveal>
      </div>

      <StickyFooterCta
        primaryLabel={primaryCta.label}
        onPrimary={runPrimaryCta}
        onSecondary={() => {
          shared?.reset?.()
          navigate('/', { replace: true })
        }}
        pending={showSkeletons}
      />

      {isPresented && sheet && (
        <AppBottomSheet open closing={isClosing} onClose={closeSheet} labelledBy="appointment-sheet-title">
          <div className="ds-sheet-header">
            <h3 id="appointment-sheet-title">{sheetTitle}</h3>
            <button type="button" className="ds-sheet-close" onClick={closeSheet} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

              {sheet.type === 'records' && (
                <div className="appointment-sheet-list">
                  {itemsForAttachGroup(health, sheet.key).length === 0 ? (
                    <p className="appointment-sheet-note">Nothing saved here yet. Add it in My Profile to attach it to visits.</p>
                  ) : itemsForAttachGroup(health, sheet.key).map((record) => (
                    <div className="appointment-sheet-row" key={record.id}>
                      {record.image && <img src={record.image} alt="" className="appointment-sheet-thumb" />}
                      <div>
                        <div className="appointment-sheet-row-title">
                          {record.title}
                          {(booking.attachedRecordIds || []).includes(record.id) ? ' · Attached' : ''}
                        </div>
                        <div className="appointment-sheet-row-meta">{healthItemMeta(record) || [displayHealthDate(record.date), record.doctor].filter(Boolean).join(' · ')}</div>
                        <p className="appointment-sheet-note">{record.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(sheet.type === 'contact' || sheet.type === 'help') && (
                <div className="appointment-sheet-body">
                  <p className="appointment-sheet-note">
                    Reach the clinic care team about this visit with Dr. {doctor.name}. They typically reply within a few hours.
                  </p>
                  {doctor.phone && (
                    <a className="appointment-sheet-cta" href={`tel:${doctor.phone.replace(/\s/g, '')}`}>Call clinic</a>
                  )}
                </div>
              )}

              {sheet.type === 'invoice' && (
                <div className="appointment-sheet-body">
                  <p className="appointment-sheet-note">Invoice #{payment.invoiceId} · {payment.method}</p>
                  <div className="appointment-billing-row total">
                    <span className="appointment-billing-label">Total Paid</span>
                    <span className="appointment-billing-value total">{formatMoney(payment.totalPaid)}</span>
                  </div>
                </div>
              )}

              {sheet.type === 'receipt' && (
                <div className="appointment-sheet-body">
                  <p className="appointment-sheet-note">Your receipt PDF is ready to download for invoice #{payment.invoiceId}.</p>
                </div>
              )}

              {sheet.type === 'history' && (
                <div className="appointment-sheet-list">
                  <div className="appointment-sheet-row">
                    <div>
                      <div className="appointment-sheet-row-title">Consultation paid</div>
                      <div className="appointment-sheet-row-meta">{dateStr} · {payment.method}</div>
                    </div>
                    <span className="appointment-billing-value total">{formatMoney(payment.totalPaid)}</span>
                  </div>
                </div>
              )}

              {sheet.type === 'article' && (
                <div className="appointment-sheet-body">
                  <p className="appointment-sheet-note">{sheet.article.subtitle}. This reading is tailored to your upcoming visit with Dr. {doctor.name}.</p>
                </div>
              )}

              {sheet.type === 'menu' && (
                <AppointmentMenuOptions
                  className="appointment-sheet-options"
                  items={menuItems}
                  onAction={handleMenuAction}
                />
              )}

              {sheet.type === 'locked' && (
                <div className="appointment-sheet-body">
                  <p className="appointment-sheet-note">{lockMessage || PREP_LOCK_MESSAGE}</p>
                </div>
              )}

              {sheet.type === 'visitType' && (
                <div className="appointment-sheet-options">
                  {VISIT_TYPES.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`ds-sheet-option ${visitType === item.id ? 'is-active' : ''}`}
                      onClick={() => changeVisitType(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {sheet.type === 'cancel' && (
                <div className="appointment-sheet-body">
                  <p className="appointment-sheet-note">
                    Cancel this appointment with Dr. {doctor.name}? The slot may be offered to another patient.
                  </p>
                  <button type="button" className="appointment-sheet-cta is-danger" onClick={confirmCancel}>Yes, cancel appointment</button>
                </div>
              )}

              {(sheet.type === 'shared' || sheet.type === 'calendar' || sheet.type === 'notes') && (
                <div className="appointment-sheet-body">
                  <p className="appointment-sheet-note">
                    {sheet.type === 'shared' && 'Appointment details were copied so you can share them with family or your care team.'}
                    {sheet.type === 'calendar' && 'A calendar file was downloaded. Open it to add this visit to your device calendar.'}
                    {sheet.type === 'notes' && 'Your notes will be shared with the clinic before your visit.'}
                  </p>
                </div>
              )}
        </AppBottomSheet>
      )}
    </div>
  )
}
