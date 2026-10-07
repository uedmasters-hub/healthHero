import { useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import PrescriptionLightbox, { usePrescriptionLightbox } from './PrescriptionLightbox'
import { defaultPrescription } from '../data/prescription'
import { useUser } from '../user'
import { usePushBack } from '../features/pushNav'
import { presentBookingCard, resolveSmartRelay, useBookingById, useRouteBookingId } from '../booking'
import { VISIT_OUTCOME_LABELS } from '../booking/visitOutcomes'
import { AppBar, Badge, Button, Callout, DetailRow, Icon, List, ListRow, SectionHead } from './ui'
import './PostVisitSummary.css'

const RESOURCE_ICONS = {
  medications: <Icon.Pill />,
  tests: <Icon.File />,
  payment: <Icon.Card />,
  prescription: <Icon.File />,
}

const defaultVisitData = {
  doctor: { name: 'Vivek Menon', specialty: 'Endocrinologist', initial: 'V', color: '#4e2a84', rating: 4.8 },
  date: 'Wednesday, 4 Feb 2026',
  type: 'In-Person Visit',
  time: '08:30 - 09:00 AM',
  address: '88 Anna Salai, Chennai',
  careSummary: [
    'Elevated blood sugar levels and mild hypertension detected',
    'Lifestyle changes recommended: exercise & dietary modifications',
    'Metformin 500mg and Telmisartan 40mg prescribed',
    'Follow-up in 2 weeks to reassess medication effectiveness',
  ],
  followUp: {
    date: '18 Feb 2026',
    description: 'Follow-up in 2 weeks to reassess medication effectiveness.',
  },
  resources: [
    { icon: 'medications', label: 'Medications', detail: '2 prescribed' },
    { icon: 'tests', label: 'Tests & Lab Orders', detail: '3 ordered' },
    { icon: 'payment', label: 'Payment Detail', detail: 'Rs. 500 paid' },
    { icon: 'prescription', label: 'Prescription', detail: '' },
  ],
  reports: [
    { id: 1, title: 'Blood Test Report', date: '20 Sep 2026', type: 'Lab Report', image: '/img/reports/Axial-non-contrast-computed-tomography-of-head-showing-grade-II-hemorrhagic.png' },
    { id: 2, title: 'MRI Scan', date: '15 Aug 2026', type: 'Imaging', image: '/img/reports/MRI-T2-sequence-showing-intramedullary-spinal-tumor-extending-from-cervico-medullary.png' },
    { id: 3, title: 'CT Abdomen', date: '10 Jul 2026', type: 'Imaging', image: '/img/reports/Axial-contrast-enhanced-computed-tomography-of-abdomen-and-pelvis-showing-a.png' },
  ],
  prescription: defaultPrescription,
}

function buildVisitFromBooking(booking, { records, prescriptions, profile }) {
  if (!booking) return null
  const presented = presentBookingCard(booking)
  const doctor = booking.doctor || {}
  const name = String(doctor.name || presented.title || '').replace(/^Dr\.?\s*/i, '')
  const initial = (name || profile?.initials || '?').charAt(0).toUpperCase()
  const meds = prescriptions || []
  const reports = records?.reports || []
  const labs = records?.labs || records?.labOrders || []
  const invoices = records?.invoices || []
  const notes = records?.notes || records?.consultationNotes || []
  const report = booking.meta?.patientReport
  const reconciliation = booking.meta?.visitReconciliation
  const providerOutcomes = booking.meta?.providerOutcomes || {}
  const primary = report?.primaryOutcome || (report?.outcomes || [])[0]
  const officialKeys = reconciliation?.official?.length
    ? reconciliation.official
    : (primary ? [primary] : [])
  const careSummary = []
  officialKeys.forEach((id) => {
    const label = VISIT_OUTCOME_LABELS[id]
    if (label) careSummary.push(label)
  })
  const reportedDetails = reconciliation ? {} : (report?.details || {})
  const providerMeds = Array.isArray(providerOutcomes.medications)
    ? providerOutcomes.medications.filter(Boolean).join(', ')
    : ''
  const providerTests = Array.isArray(providerOutcomes.labs)
    ? providerOutcomes.labs.filter(Boolean).join(', ')
    : ''
  if (reconciliation) {
    if (providerMeds) careSummary.push(providerMeds)
    if (providerTests) careSummary.push(providerTests)
    if (providerOutcomes.referralTo) careSummary.push(`Referred to ${providerOutcomes.referralTo}`)
    if (providerOutcomes.note) careSummary.push(providerOutcomes.note)
    if (reconciliation.unresolved?.[0]) {
      const yours = VISIT_OUTCOME_LABELS[reconciliation.unresolved[0]]
      if (yours) careSummary.push(`Your report: ${yours}`)
    }
  } else {
    if (reportedDetails.medications) careSummary.push(reportedDetails.medications)
    if (reportedDetails.tests) careSummary.push(reportedDetails.tests)
    if (reportedDetails.referral) careSummary.push(`Referred to ${reportedDetails.referral}`)
    if (reportedDetails.note) careSummary.push(reportedDetails.note)
  }
  if (notes.length && !careSummary.length) {
    notes.slice(0, 4).forEach((n) => {
      const text = n.summary || n.assessment || n.plan || n.title
      if (text) careSummary.push(text)
    })
  }
  if (!careSummary.length && booking.note) careSummary.push(booking.note)
  if (!careSummary.length) {
    careSummary.push('Your provider may still be updating notes, prescriptions, and lab requests.')
    careSummary.push('This hub stays available for 24 hours after you confirm the visit.')
  }

  const resources = [
    {
      icon: 'medications',
      label: 'Medications',
      detail: providerMeds || reportedDetails.medications
        || (meds.length ? `${meds.length} prescribed` : 'Pending updates'),
    },
    {
      icon: 'tests',
      label: 'Tests & Lab Orders',
      detail: providerTests || reportedDetails.tests
        || (labs.length ? `${labs.length} ordered` : reports.length ? `${reports.length} reports` : 'Pending updates'),
    },
    {
      icon: 'payment',
      label: 'Payment Detail',
      detail: booking.payment?.amount
        ? `${booking.payment.currency || 'NPR'} ${booking.payment.amount}`
        : invoices[0]?.total
          ? String(invoices[0].total)
          : 'View invoice',
    },
    {
      icon: 'prescription',
      label: 'Prescription',
      detail: providerMeds || reportedDetails.medications
        || (meds[0] ? 'Available' : (officialKeys.includes('prescription') ? 'Reported' : '')),
    },
  ]
  if (officialKeys.includes('referral')) {
    resources.splice(2, 0, {
      icon: 'tests',
      label: 'Referral',
      detail: providerOutcomes.referralTo || reportedDetails.referral || 'Reported',
    })
  }

  return {
    doctor: {
      name,
      specialty: doctor.specialty || presented.subtitle || '',
      initial,
      color: doctor.color || '#4e2a84',
      rating: doctor.rating ?? null,
    },
    date: presented.dateLabel || '',
    type: booking.visitType || 'In-Person Visit',
    time: presented.timeLabel || booking.time || '',
    address: doctor.clinic || doctor.address || profile?.address || '',
    careSummary,
    followUp: providerOutcomes.followUpDate || reportedDetails.followUp || officialKeys.includes('follow_up')
      ? {
        date: providerOutcomes.followUpDate || reportedDetails.followUp || 'Scheduled',
        description: reconciliation
          ? 'This follow-up comes from the clinic confirmation. Your original report stays on the visit.'
          : 'From your temporary report until the clinic confirms the visit.',
      }
      : {
        date: 'As advised',
        description: 'Follow-up guidance will appear here when your provider shares it.',
      },
    resources,
    reports,
    prescription: meds[0] || null,
    bookingId: booking.engineId || booking.id,
  }
}

export default function PostVisitSummary() {
  const goBack = usePushBack(-1)
  const location = useLocation()
  const { records, prescriptions, profile, isDemo } = useUser()
  const bookingId = useRouteBookingId(location.state)
  const booking = useBookingById(bookingId)
  const fromState = isDemo ? location.state?.visitData : null
  const careFocus = location.state?.careFocus || booking?.meta?.nextCarePath || null
  const relay = resolveSmartRelay(booking)

  const visitData = useMemo(() => {
    if (fromState && !bookingId) return fromState
    const fromBooking = buildVisitFromBooking(booking, { records, prescriptions, profile })
    if (fromBooking) return fromBooking
    if (fromState) return fromState
    if (isDemo) return defaultVisitData
    return {
      doctor: { name: '', specialty: '', initial: profile?.initials || '', color: '#4e2a84', rating: null },
      date: '',
      type: '',
      time: '',
      address: profile?.address || '',
      careSummary: ['Waiting for provider updates from this visit.'],
      followUp: { date: '', description: '' },
      resources: [
        { icon: 'medications', label: 'Medications', detail: 'Pending updates' },
        { icon: 'tests', label: 'Tests & Lab Orders', detail: 'Pending updates' },
        { icon: 'payment', label: 'Payment Detail', detail: '' },
        { icon: 'prescription', label: 'Prescription', detail: '' },
      ],
      reports: records?.reports || [],
      prescription: prescriptions?.[0] || null,
    }
  }, [fromState, bookingId, booking, records, prescriptions, profile, isDemo])

  const pageRef = useRef(null)
  const scrollPos = useRef(0)
  const { isPresented, isClosing, show, hide } = usePrescriptionLightbox()

  const { doctor, date, type, time, address, careSummary, followUp, resources, reports, prescription } = visitData
  const rx = prescription || (isDemo && !bookingId ? defaultPrescription : null)

  const openPrescription = () => {
    scrollPos.current = pageRef.current?.scrollTop ?? 0
    show()
  }

  const closePrescription = () => {
    hide(() => {
      requestAnimationFrame(() => {
        if (pageRef.current) pageRef.current.scrollTop = scrollPos.current
      })
    })
  }

  const handleResource = (item) => {
    if (item.icon === 'prescription' && rx) openPrescription()
  }

  return (
    <div className="ds-page postvisit-page" ref={pageRef}>
      <AppBar
        title="Post-visit summary"
        onBack={goBack}
        actions={(
          <Button variant="text" size="sm" trailingIcon={<Icon.Share />}>Share</Button>
        )}
      />

      <div className="ds-page__body postvisit-content">
        <Callout
          tone="success"
          icon={<Icon.Check />}
          title={relay?.label
            || (careFocus && careFocus !== 'post_visit_summary'
              ? `Next: ${String(careFocus).replace(/_/g, ' ')}`
              : 'Visit completed successfully')}
        >
          {relay?.message
            || (bookingId
              ? 'Your temporary care hub is available for 24 hours.'
              : 'Your care plan has been updated.')}
        </Callout>

        <div className="ds-card postvisit-doctor-card">
          <div className="postvisit-doctor-top">
            <span className="postvisit-avatar" aria-hidden="true">
              {doctor.initial}
              <span className="postvisit-avatar__badge"><Icon.Check /></span>
            </span>
            <span className="postvisit-doctor-info">
              <span className="ds-title">{doctor.name ? `Dr. ${doctor.name}` : 'Your provider'}</span>
              {doctor.specialty ? <span className="ds-caption">{doctor.specialty}</span> : null}
            </span>
            {doctor.rating != null ? (
              <span className="postvisit-doctor-rating tnum">
                <span className="postvisit-doctor-star" aria-hidden="true">★</span>
                {doctor.rating}
              </span>
            ) : null}
          </div>

          <DetailRow icon={<Icon.Calendar />} label="Date" value={date || '—'} />
          <DetailRow icon={<Icon.User />} label="Type" value={type || '—'} />
          <DetailRow icon={<Icon.Clock />} label="Time" value={time || '—'} />
          <DetailRow icon={<Icon.Pin />} label="Location" value={address || '—'} />

          <div className="postvisit-doctor-foot">
            <Badge tone="success"><Icon.Check />{relay?.label || 'Completed'}</Badge>
          </div>
        </div>

        <section>
          <SectionHead group as="h2" title="Care summary" />
          <div className="ds-card is-padded">
            <ul className="postvisit-summary-list">
              {(careSummary || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <Button variant="text" size="sm" className="postvisit-inline-action" trailingIcon={<Icon.ArrowRight />}>
              Read full doctor&apos;s notes
            </Button>
          </div>
        </section>

        <section>
          <SectionHead
            group
            as="h2"
            title="Follow-up recommended"
            action={followUp?.date ? <Badge tone="info">Next: {followUp.date}</Badge> : null}
          />
          <div className="ds-card is-padded ds-stack">
            {followUp?.description ? <p className="ds-body">{followUp.description}</p> : null}
            <Button size="lg" block>Book follow-up</Button>
            <Button variant="text" size="sm" block icon={<Icon.Calendar />}>Add to calendar</Button>
          </div>
        </section>

        <section>
          <SectionHead group as="h2" title="Care resources" />
          <List>
            {(resources || []).map((item, i) => (
              <ListRow
                key={i}
                icon={<span className="ds-icon-well" aria-hidden="true">{RESOURCE_ICONS[item.icon] || <Icon.File />}</span>}
                title={item.label}
                trailing={item.detail ? <span className="ds-caption">{item.detail}</span> : null}
                onClick={() => handleResource(item)}
              />
            ))}
          </List>
        </section>

        {reports && reports.length > 0 && (
          <section>
            <SectionHead group as="h2" title="Recent reports" />
            <List>
              {reports.map((report) => (
                <div key={report.id} className="ds-list-row">
                  {report.image ? (
                    <img src={report.image} alt={report.title} className="postvisit-report-image" />
                  ) : (
                    <span className="postvisit-report-image" aria-hidden="true" />
                  )}
                  <span className="ds-list-row__body">
                    <span className="ds-list-row__title">{report.title}</span>
                    <span className="ds-list-row__sub">{[report.type, report.date].filter(Boolean).join(' · ')}</span>
                  </span>
                </div>
              ))}
            </List>
          </section>
        )}

        <Button variant="secondary" size="lg" block icon={<Icon.Download />}>Download report</Button>

        <section>
          <SectionHead group as="h2" title="Need help after your visit?" />
          <List>
            <ListRow icon={<span className="ds-icon-well" aria-hidden="true"><Icon.Message /></span>} title="Message clinic" as="button" />
            <ListRow icon={<span className="ds-icon-well" aria-hidden="true"><Icon.Phone /></span>} title="Call care team" as="button" />
            <ListRow
              danger
              icon={<span className="ds-icon-well is-danger" aria-hidden="true"><Icon.Alert /></span>}
              title="Emergency guidance"
              as="button"
            />
          </List>
        </section>
      </div>

      {rx ? (
        <PrescriptionLightbox
          prescription={rx}
          isPresented={isPresented}
          isClosing={isClosing}
          onClose={closePrescription}
        />
      ) : null}
    </div>
  )
}
