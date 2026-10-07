import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
import { useAuth } from '../features/auth/hooks/useAuth'
import {
  getOrCreateProviderConversation,
  isProviderChatEnabled,
  providerMetadataFromBooking,
  providerThreadPath,
  chatLaunchState,
} from '../features/conversations'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshAppointmentData } from '../features/sync/pageRefresh'
import {
  AppBar, Badge, Button, Callout, Disclosure, Icon, IconButton, InfoCell, InfoGrid, List, ListRow,
  SectionHead, SheetHeader, Steps, cx,
} from './ui'
import './PreVisitCheckIn.css'
import { UnavailablePage } from './system'

const faqItems = [
  { q: 'What should I bring?', a: 'Bring citizenship ID or a photo ID, your health insurance / insurance card, a list of current medications, and any recent lab reports.' },
  { q: 'Can I reschedule?', a: 'You can reschedule or cancel until 45 minutes before your appointment. After that, changes are locked so your doctor can prepare.' },
  { q: 'What if I\'m late?', a: 'Call the clinic if you are running late. A 15-minute grace window is typically available.' },
  { q: 'How to access lab reports?', a: 'Open Appointment Details → Medical Records → Lab Reports to view or download your files.' },
  { q: 'When to seek urgent care?', a: 'Seek immediate care for severe chest pain, difficulty breathing, uncontrolled bleeding, or sudden numbness or confusion.' },
]

export default function PreVisitCheckIn() {
  const navigate = useNavigate()
  const { currentBooking, setCurrentBooking } = useBooking()
  const now = useNow(15000)
  const shared = useSharedHero()
  const heroRef = useRef(null)
  const scrollRef = useRef(null)
  const [expandedFaq, setExpandedFaq] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [chatBusy, setChatBusy] = useState(false)
  const [chatError, setChatError] = useState('')
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const { user } = useAuth()
  const onRefresh = useCallback(() => refreshAppointmentData(), [])
  const ptr = usePullToRefresh(scrollRef, onRefresh, {
    enabled: Boolean(currentBooking) && !shared?.morphing,
  })
  const ready = useBookingReveal(
    `previsit:${currentBooking?.doctor?.id || 'none'}`,
    Boolean(currentBooking),
    { instant: Boolean(currentBooking), hasCache: Boolean(currentBooking) },
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
  const contentReady = Boolean(currentBooking) && ready

  useLayoutEffect(() => {
    if (shared?.phase === 'preparing' && currentBooking && String(shared.doctor?.id) === String(currentBooking.doctor?.id) && heroRef.current) {
      shared.registerDest(heroRef.current)
    }
  }, [shared?.phase, currentBooking, shared])

  if (!currentBooking) return <UnavailablePage title="This check-in is no longer available" />

  const { doctor, date, time, visitType, duration } = currentBooking
  const doctorName = doctor.name?.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`
  const appointmentStart = getAppointmentStart(date, time)
  const actions = getAppointmentActions(currentBooking, now, { surface: 'ready' })
  const { menuItems, primaryCta, canCancelCheckIn } = actions
  const canMessageProvider = isProviderChatEnabled(currentBooking)

  const dateStr = date.full.toLocaleDateString('en-NP', {
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
    link.download = 'emedicalls-appointment.ics'
    link.click()
    URL.revokeObjectURL(url)
  }

  const goHome = () => {
    shared?.reset?.()
    navigate('/', { replace: true })
  }

  const openProviderChat = async () => {
    if (chatBusy) return
    if (!isProviderChatEnabled(currentBooking)) return
    if (!user?.id) {
      setChatError('Sign in to message your care provider.')
      return
    }
    const bookingId = currentBooking.id || currentBooking.engineId
    if (!bookingId) {
      setChatError('This booking is missing an id. Try refreshing and check in again.')
      return
    }

    setChatBusy(true)
    setChatError('')
    try {
      const doctorName = currentBooking.doctor?.name || 'your doctor'
      const result = await getOrCreateProviderConversation({
        userId: user.id,
        bookingRef: bookingId,
        bookingStatus: currentBooking.status,
        bookingRecord: currentBooking,
        subject: `Chat with ${doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}`,
        metadata: providerMetadataFromBooking(currentBooking),
        providerUserId: currentBooking.doctor?.userId || currentBooking.doctor?.authUserId || null,
      })
      if (!result.ok) {
        setChatError(result.error || 'Could not open provider chat.')
        return
      }
      navigate(
        providerThreadPath(result.conversationId || result.conversation.id),
        { state: chatLaunchState('/pre-checkin', { from: 'ready-for-visit' }) },
      )
    } catch (err) {
      setChatError(err?.message || 'Could not open provider chat.')
    } finally {
      setChatBusy(false)
    }
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
    <div className={cx('previsit-page', sharedFlow && 'is-shared-hero', contentReady && 'is-content-ready')}>
      <AppBar
        className="previsit-header-bar"
        title="Ready for visit"
        lead={null}
        actions={(
          <IconButton className="previsit-menu-btn" label="More" onClick={() => openSheet({ type: 'menu' })}>
            <Icon.More />
          </IconButton>
        )}
      />

      <div className="previsit-body" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        <Callout tone="success" icon={<Icon.Check />} title="Successfully checked in" className="previsit-success-banner">
          The clinic team is preparing for your visit with {doctorName}. Review the details below, then head in.
        </Callout>

        <div className={cx('booking-hero', hideHero && 'is-morphing')} ref={heroRef}>
          <DoctorCard
            doctor={doctor}
            variant="profile"
            disableNavigate
            showChat={canMessageProvider}
            onChat={canMessageProvider ? openProviderChat : undefined}
            chatBusy={chatBusy}
          />
        </div>

        {chatError ? (
          <p className="ds-page__error" role="alert">{chatError}</p>
        ) : null}

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
          <div className="ds-stack is-loose">
          <section>
            <SectionHead group as="h3" title="Your appointment" />
            <div className="ds-card is-padded">
              <InfoGrid>
                <InfoCell icon={<Icon.Calendar />} label="Date" value={dateStr} />
                <InfoCell icon={<Icon.Clock />} label="Time" value={time} />
                <InfoCell icon={visitType === 'Video' ? <Icon.Video /> : <Icon.User />} label="Type" value={`${visitType || 'In-Person'} Visit`} />
                <InfoCell icon={<Icon.Pin />} label="Location" value={doctor.address} />
              </InfoGrid>
            </div>
          </section>

          <section>
            <SectionHead group as="h3" title="What to expect next" />
            <div className="ds-card is-padded">
              <Steps
                items={steps.map((step) => ({
                  key: step.id,
                  title: step.label,
                  body: step.detail,
                  state: step.status === 'completed' ? 'done' : step.status === 'current' ? 'active' : undefined,
                  marker: step.status === 'completed' ? <Icon.Check /> : step.id,
                }))}
              />
            </div>
          </section>

          <section>
            <SectionHead group as="h3" title="Clinic location" action={<Badge tone="neutral">3rd Floor</Badge>} />
            <List>
              <ListRow
                icon={<span className="ds-icon-well is-lg" aria-hidden="true"><Icon.Pin /></span>}
                title={doctor.address}
                subtitle="Suite 302 · 3rd Floor"
                trailing={<span className="ds-link">Directions</span>}
                onClick={openMaps}
              />
            </List>
          </section>

          <section>
            <SectionHead group as="h3" title="Important reminders" />
            <Callout tone="neutral" icon={<Icon.Info />}>
              <ul className="previsit-reminders">
                <li>Have citizenship ID or photo ID and your health insurance card ready at the desk.</li>
                <li>Wear accessible clothing in case lab work is needed.</li>
              </ul>
            </Callout>
          </section>

          <section>
            <SectionHead group as="h3" title="Frequently asked questions" />
            <List>
              {faqItems.map((item, i) => (
                <Disclosure
                  key={item.q}
                  id={`previsit-faq-${i}`}
                  title={item.q}
                  open={expandedFaq === i}
                  onToggle={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  <p>{item.a}</p>
                </Disclosure>
              ))}
            </List>
          </section>
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
          <SheetHeader titleId="previsit-sheet-title" title={sheetTitle} onClose={closeSheet} />

          {sheet.type === 'menu' && (
            <AppointmentMenuOptions
              className="previsit-sheet-options"
              items={menuItems}
              onAction={handleMenuAction}
            />
          )}

          {sheet.type === 'cancel' && (
            <div className="ds-stack previsit-sheet-body">
              <p className="ds-body">
                Cancel this appointment with Dr. {doctor.name}? The slot may be offered to another patient.
              </p>
              <Button variant="danger" size="lg" block onClick={confirmCancelAppointment}>
                Yes, cancel appointment
              </Button>
            </div>
          )}

          {sheet.type === 'calendar' && (
            <p className="ds-body previsit-sheet-body">
              A calendar file was downloaded. Open it to add this visit to your device calendar.
            </p>
          )}
        </AppBottomSheet>
      )}
    </div>
  )
}
