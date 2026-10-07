import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBooking } from './BookingContext'
import { PAYMENT_STATUS, useBookingById, useRouteBookingId } from '../booking'
import DoctorCard from './DoctorCard'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { useSharedHero } from './SharedHero'
import { BookingReveal, useBookingReveal } from './BookingReveal'
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
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshAppointmentData } from '../features/sync/pageRefresh'
import { resolveSmartRelay } from '../booking/smartRelay'
import {
  AppBar, Badge, Button, Callout, CheckboxMark, Disclosure, EmptyState, FormGroup, Icon, IconButton,
  InfoCell, InfoGrid, List, ListRow, QuickAction, SectionHead, SheetHeader, cx,
} from './ui'
import './AppointmentDetail.css'
import { UnavailablePage } from './system'

const checklistItems = [
  'Bring citizenship ID or photo ID and your health insurance card',
  'Complete medical history form',
  'List current medications',
  'Wear comfortable clothing',
]

const faqItems = [
  { q: 'What should I bring?', a: 'Bring citizenship ID or a photo ID, your health insurance / insurance card, a list of current medications, and any recent lab reports.' },
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

const recordIcons = {
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  prescriptions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  ),
  medications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
  const relay = resolveSmartRelay(booking)

  useEffect(() => {
    if (bookingId) focusBooking?.(bookingId)
  }, [bookingId, focusBooking])

  const now = useNow(15000)
  const shared = useSharedHero()
  const heroRef = useRef(null)
  const scrollRef = useRef(null)
  const onRefresh = useCallback(() => refreshAppointmentData(), [])
  const ptr = usePullToRefresh(scrollRef, onRefresh, {
    enabled: Boolean(booking) && !shared?.morphing,
  })
  const [checkedItems, setCheckedItems] = useState([])
  const [expandedFaq, setExpandedFaq] = useState(null)
  const [notes, setNotes] = useState(booking?.note || '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [showUrgentCare, setShowUrgentCare] = useState(false)
  const [sheet, setSheet] = useState(null)
  const { isPresented, isClosing, show, hide } = useAppSheet()
  // Booking is already in memory — never blank the page with skeletons.
  const revealReady = useBookingReveal(
    `appointment:${booking?.doctor?.id || bookingId || 'none'}`,
    Boolean(booking),
    { instant: Boolean(booking), hasCache: Boolean(booking) },
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
  const contentReady = Boolean(booking) && revealReady

  useLayoutEffect(() => {
    if (shared?.phase === 'preparing' && booking && String(shared.doctor?.id) === String(booking.doctor?.id) && heroRef.current) {
      shared.registerDest(heroRef.current)
    }
  }, [shared?.phase, booking, shared])

  if (!booking) return <UnavailablePage title="This appointment is no longer available" />

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
  const paidAmount = Number(paid.amount || paid.consultationFee || 0)
  const rescheduleFee = wasRescheduled ? Number(lastReschedule?.amount || 0) : 0
  const discount = Number(paid.discount) || 0
  const payment = {
    isPaid: paid.status === PAYMENT_STATUS.PAID || Boolean(paid.paidAt || paid.paymentId),
    isPending: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING].includes(paid.status),
    consultationFee: Number(paid.consultationFee || paidAmount + discount),
    discount,
    rescheduleFee,
    copay: paidAmount,
    totalPaid: paidAmount + rescheduleFee,
    method: paid.method || '',
    invoiceId: paid.bookingId || paid.paymentId || paid.orderId || '',
  }
  const hasPayment = paidAmount > 0 && (payment.isPaid || payment.isPending)
  const paymentMeta = [payment.method, payment.invoiceId && `Invoice #${payment.invoiceId}`].filter(Boolean).join(' · ')

  const dateStr = date.full.toLocaleDateString('en-NP', {
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
    link.download = 'emedicalls-appointment.ics'
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
    <div
      className={cx('ds-page', 'appointment-page', sharedFlow && 'is-shared-hero', contentReady && 'is-content-ready')}
      ref={scrollRef}
    >
      <AppBar
        className="appointment-header-bar"
        title="Appointment details"
        lead={null}
        actions={(
          <IconButton className="appointment-menu-btn" label="More" onClick={() => openSheet({ type: 'menu' })}>
            <Icon.More />
          </IconButton>
        )}
      />
      <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />

      <div className="ds-page__body has-fixed-footer appointment-body">
        <Badge tone={isLocked ? 'warning' : 'ready'} className="appointment-countdown">
          <Icon.Clock />
          {formatCountdown(appointmentStart, now)}
        </Badge>

        {relay ? (
          <Callout className={cx('relay-panel', `is-${relay.accent}`)} title={relay.label} role="status">
            {relay.message}
          </Callout>
        ) : null}

        {isLocked && (
          <Callout tone="warning" icon={<Icon.Alert />} title="Editing locked">{PREP_LOCK_MESSAGE}</Callout>
        )}

        {wasRescheduled && (
          <Callout tone="info" icon={<Icon.Refresh />} title="Rescheduled appointment">
            Changed from {lastReschedule.oldDate}, {lastReschedule.oldTime}
          </Callout>
        )}

        <div className={cx('ds-card', 'is-padded', 'appointment-summary-card', hideHero && 'is-morphing')} ref={heroRef}>
          <DoctorCard doctor={doctor} context="identity" className="appointment-doctor-row" origin="appointment" />

          <InfoGrid className="appointment-info-grid">
            {booking.patient ? (
              <>
                <InfoCell icon={<Icon.User />} label="Patient" value={booking.patient.name} />
                <InfoCell icon={<Icon.Users />} label="Relationship" value={booking.patient.relationship} />
              </>
            ) : null}
            <InfoCell icon={<Icon.Calendar />} label="Date" value={dateStr} />
            <InfoCell icon={<Icon.Clock />} label="Time" value={formatTimeRange()} />
            <InfoCell icon={visitType === 'Video' ? <Icon.Video /> : <Icon.User />} label="Type">
              {isLocked ? (
                `${visitType || 'In-Person'} Visit`
              ) : (
                <button type="button" className="ds-link appointment-info-edit" onClick={() => openSheet({ type: 'visitType' })}>
                  {visitType || 'In-Person'} Visit
                  <Icon.ChevronDown />
                </button>
              )}
            </InfoCell>
            <InfoCell className="is-wide" icon={<Icon.Pin />} label="Location" value={doctor.address} />
          </InfoGrid>

          <div className="ds-action-row appointment-action-row">
            <QuickAction
              icon={<Icon.Directions />}
              label="Directions"
              onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(doctor.address || '')}`, '_blank')}
            />
            <QuickAction icon={<Icon.Calendar />} label="Add to calendar" onClick={addToCalendar} />
            <QuickAction icon={<Icon.Phone />} label="Contact clinic" onClick={() => openSheet({ type: 'contact' })} />
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
        <div className="ds-stack is-loose appointment-sections">
        <section>
          <SectionHead group as="h3" title="Before your visit" />
          <List>
            {checklistItems.map((item, i) => {
              const checked = checkedItems.includes(i)
              return (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  key={item}
                  className="ds-list-row appointment-check-item"
                  onClick={() => setCheckedItems((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))}
                >
                  <CheckboxMark />
                  <span className="ds-list-row__body"><span className="ds-list-row__title">{item}</span></span>
                </button>
              )
            })}
          </List>
        </section>

        <Callout tone="info" icon={<Icon.Clock />}>Arrive 15 minutes early. Bring recent lab results.</Callout>

        <List>
          <Disclosure
            id="appointment-urgent"
            className="appointment-urgent-care"
            icon={<span className="ds-icon-well is-warning" aria-hidden="true"><Icon.Alert /></span>}
            title="When to seek urgent care"
            open={showUrgentCare}
            onToggle={() => setShowUrgentCare((open) => !open)}
          >
            <p>Seek immediate care if you experience severe chest pain, difficulty breathing, uncontrolled bleeding, or signs of stroke such as sudden numbness or confusion.</p>
          </Disclosure>
        </List>

        <section>
          <SectionHead group as="h3" title="Medical records" action={isLocked ? <Badge tone="neutral">View only</Badge> : null} />
          <List>
            {ATTACH_GROUPS.map((tab) => {
              const groupItems = itemsForAttachGroup(health, tab.key)
              const attachedCount = (booking.attachedRecordIds || []).filter((id) => groupItems.some((item) => item.id === id)).length
              return (
                <ListRow
                  key={tab.key}
                  icon={<span className="ds-icon-well" aria-hidden="true">{recordIcons[tab.key]}</span>}
                  title={tab.label}
                  trailing={attachedCount ? <Badge tone="solid">{attachedCount}</Badge> : null}
                  onClick={() => openSheet({ type: 'records', key: tab.key })}
                />
              )
            })}
          </List>
        </section>

        <section>
          <SectionHead
            group
            as="h3"
            title="Payment & invoice"
            action={hasPayment ? (payment.isPaid ? <Badge tone="success">Paid</Badge> : <Badge tone="warning">Pending</Badge>) : null}
          />
          {!hasPayment ? (
            <EmptyState compact card role="status" title="No payment on file" message="Your payment details and invoice appear here once payment is confirmed." />
          ) : (
          <div className="ds-card appointment-payment-card">
            <div className="ds-stack is-tight appointment-billing">
              <div className="ds-kv">
                <span className="ds-kv__key">Consultation fee</span>
                <span className="ds-kv__value tnum">{formatMoney(payment.consultationFee)}</span>
              </div>
              {payment.rescheduleFee > 0 && (
                <div className="ds-kv">
                  <span className="ds-kv__key">Reschedule fee</span>
                  <span className="ds-kv__value tnum">{formatMoney(payment.rescheduleFee)}</span>
                </div>
              )}
              {payment.discount > 0 && (
                <div className="ds-kv">
                  <span className="ds-kv__key">Discount</span>
                  <span className="ds-kv__value is-positive tnum">-{formatMoney(payment.discount)}</span>
                </div>
              )}
              <div className="ds-kv">
                <span className="ds-kv__key">Amount payable</span>
                <span className="ds-kv__value tnum">{formatMoney(payment.copay)}</span>
              </div>
              <div className="ds-kv is-total">
                <span className="ds-kv__key">{payment.isPaid ? 'Total paid' : 'Total due'}</span>
                <span className="ds-kv__value tnum">{formatMoney(payment.totalPaid)}</span>
              </div>
              {paymentMeta ? (
                <p className="ds-caption appointment-payment-meta">
                  <Icon.Card />
                  {paymentMeta}
                </p>
              ) : null}
            </div>
            {payment.isPaid && payment.invoiceId ? (
              <>
                <ListRow icon={<span className="ds-icon-well" aria-hidden="true"><Icon.File /></span>} title="View invoice" onClick={() => openSheet({ type: 'invoice' })} />
                <ListRow icon={<span className="ds-icon-well" aria-hidden="true"><Icon.Download /></span>} title="Download receipt (PDF)" onClick={() => openSheet({ type: 'receipt' })} />
              </>
            ) : null}
            {payment.isPaid ? (
              <ListRow icon={<span className="ds-icon-well" aria-hidden="true"><Icon.Clock /></span>} title="Payment history" onClick={() => openSheet({ type: 'history' })} />
            ) : null}
          </div>
          )}
        </section>

        <section>
          <FormGroup label="Notes for your doctor">
            <textarea
              className="ds-field"
              placeholder={isLocked ? 'Notes can no longer be updated' : 'Add notes for your doctor…'}
              value={notes}
              onChange={(e) => { if (isLocked) return; setNotes(e.target.value); setNotesSaved(false) }}
              rows={3}
              readOnly={isLocked}
            />
          </FormGroup>
          <Button
            variant="secondary"
            size="sm"
            className="appointment-save-notes-btn"
            disabled={isLocked || !notes.trim() || notesSaved}
            onClick={saveNotes}
          >
            {isLocked ? 'Notes locked' : notesSaved ? 'Notes saved' : 'Save notes'}
          </Button>
        </section>

        <section>
          <SectionHead group as="h3" title="Health reading" />
          <div className="ds-stack is-tight">
            {recommendedArticles.filter((article) => article.type === 'featured').map((article) => (
              <List key={article.title}>
                <ListRow
                  icon={<span className="ds-icon-well" aria-hidden="true"><Icon.Heart /></span>}
                  title={article.title}
                  subtitle={article.subtitle}
                  onClick={() => openSheet({ type: 'article', article })}
                />
              </List>
            ))}
            <div className="appointment-article-grid">
              {recommendedArticles.filter((article) => article.type === 'card').map((article) => (
                <button
                  type="button"
                  key={article.title}
                  className="ds-card is-interactive appointment-article"
                  onClick={() => openSheet({ type: 'article', article })}
                >
                  <img src={article.image} alt="" className="appointment-article__img" />
                  <span className="appointment-article__body">
                    <span className="ds-card__title">{article.title}</span>
                    <span className="ds-card__meta">{article.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionHead group as="h3" title="Frequently asked questions" />
          <List>
            {faqItems.map((item, i) => (
              <Disclosure
                key={item.q}
                id={`appointment-faq-${i}`}
                title={item.q}
                open={expandedFaq === i}
                onToggle={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <p>{item.a}</p>
              </Disclosure>
            ))}
          </List>
        </section>

        <div className="ds-card is-padded appointment-support-bar">
          <span className="appointment-support-text">
            <span className="ds-title">We&apos;re here for you every step of the way.</span>
            <span className="ds-caption">Our clinic support team is available 24/7.</span>
          </span>
          <Button variant="secondary" size="sm" onClick={() => openSheet({ type: 'help' })}>Need help?</Button>
        </div>
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
        pending={false}
      />

      {isPresented && sheet && (
        <AppBottomSheet open closing={isClosing} onClose={closeSheet} labelledBy="appointment-sheet-title">
          <SheetHeader titleId="appointment-sheet-title" title={sheetTitle} onClose={closeSheet} />

          {sheet.type === 'records' && (
            itemsForAttachGroup(health, sheet.key).length === 0 ? (
              <EmptyState compact card title="Nothing saved here yet" message="Add it in My Profile to attach it to visits." />
            ) : (
              <List className="appointment-sheet-list">
                {itemsForAttachGroup(health, sheet.key).map((record) => (
                  <div className="ds-list-row" key={record.id}>
                    {record.image ? <img src={record.image} alt="" className="appointment-sheet-thumb" /> : null}
                    <span className="ds-list-row__body">
                      <span className="ds-list-row__title">{record.title}</span>
                      <span className="ds-list-row__sub">{healthItemMeta(record) || [displayHealthDate(record.date), record.doctor].filter(Boolean).join(' · ')}</span>
                      {record.details ? <span className="ds-list-row__sub">{record.details}</span> : null}
                    </span>
                    {(booking.attachedRecordIds || []).includes(record.id) ? <Badge tone="success">Attached</Badge> : null}
                  </div>
                ))}
              </List>
            )
          )}

          {(sheet.type === 'contact' || sheet.type === 'help') && (
            <div className="ds-stack appointment-sheet-body">
              <p className="ds-body">
                Reach the clinic care team about this visit with Dr. {doctor.name}. They typically reply within a few hours.
              </p>
              {doctor.phone && (
                <Button as="a" size="lg" block icon={<Icon.Phone />} href={`tel:${doctor.phone.replace(/\s/g, '')}`}>Call clinic</Button>
              )}
            </div>
          )}

          {sheet.type === 'invoice' && (
            <div className="ds-stack appointment-sheet-body">
              <p className="ds-body">{paymentMeta}</p>
              <div className="ds-kv is-total">
                <span className="ds-kv__key">Total paid</span>
                <span className="ds-kv__value tnum">{formatMoney(payment.totalPaid)}</span>
              </div>
            </div>
          )}

          {sheet.type === 'receipt' && (
            <p className="ds-body appointment-sheet-body">Your receipt PDF is ready to download for invoice #{payment.invoiceId}.</p>
          )}

          {sheet.type === 'history' && (
            <List className="appointment-sheet-list">
              <ListRow
                title="Consultation paid"
                subtitle={[dateStr, payment.method].filter(Boolean).join(' · ')}
                trailing={<strong className="tnum appointment-sheet-amount">{formatMoney(payment.totalPaid)}</strong>}
              />
            </List>
          )}

          {sheet.type === 'article' && (
            <p className="ds-body appointment-sheet-body">{sheet.article.subtitle}.</p>
          )}

          {sheet.type === 'menu' && (
            <AppointmentMenuOptions
              className="appointment-sheet-options"
              items={menuItems}
              onAction={handleMenuAction}
            />
          )}

          {sheet.type === 'locked' && (
            <p className="ds-body appointment-sheet-body">{lockMessage || PREP_LOCK_MESSAGE}</p>
          )}

          {sheet.type === 'visitType' && (
            <div className="appointment-sheet-options">
              {VISIT_TYPES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={cx('ds-sheet-option', visitType === item.id && 'is-active')}
                  onClick={() => changeVisitType(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {sheet.type === 'cancel' && (
            <div className="ds-stack appointment-sheet-body">
              <p className="ds-body">
                Cancel this appointment with Dr. {doctor.name}? The slot may be offered to another patient.
              </p>
              <Button variant="danger" size="lg" block onClick={confirmCancel}>Yes, cancel appointment</Button>
            </div>
          )}

          {(sheet.type === 'shared' || sheet.type === 'calendar' || sheet.type === 'notes') && (
            <p className="ds-body appointment-sheet-body">
              {sheet.type === 'shared' && 'Appointment details were copied so you can share them with family or your care team.'}
              {sheet.type === 'calendar' && 'A calendar file was downloaded. Open it to add this visit to your device calendar.'}
              {sheet.type === 'notes' && 'Your notes will be shared with the clinic before your visit.'}
            </p>
          )}
        </AppBottomSheet>
      )}
    </div>
  )
}
