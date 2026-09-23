import { useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import PrescriptionLightbox, { usePrescriptionLightbox } from './PrescriptionLightbox'
import { defaultPrescription } from '../data/prescription'
import { useUser } from '../user'
import { usePushBack } from '../features/pushNav'
import { presentBookingCard, useBookingById, useRouteBookingId } from '../booking'
import './PostVisitSummary.css'

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
  const careSummary = []
  if (notes.length) {
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
      detail: meds.length ? `${meds.length} prescribed` : 'Pending updates',
    },
    {
      icon: 'tests',
      label: 'Tests & Lab Orders',
      detail: labs.length ? `${labs.length} ordered` : reports.length ? `${reports.length} reports` : 'Pending updates',
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
      detail: meds[0] ? 'Available' : '',
    },
  ]

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
    followUp: {
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
  const fromState = location.state?.visitData

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
    <div className="postvisit-page page-push-in" ref={pageRef}>
      <div className="postvisit-header">
        <button className="postvisit-back-btn" data-push-back type="button" onClick={goBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="postvisit-header-title">Post-Visit Summary</h1>
        <button className="postvisit-share-btn" type="button">
          Share
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>

      <div className="postvisit-content">
        <div className="postvisit-success-banner">
          <div className="postvisit-success-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="postvisit-success-text">
            <div className="postvisit-success-title">Visit completed successfully</div>
            <div className="postvisit-success-subtitle">
              {bookingId
                ? 'Your temporary care hub is available for 24 hours.'
                : 'Your care plan has been updated.'}
            </div>
          </div>
        </div>

        <div className="postvisit-doctor-card">
          <div className="postvisit-doctor-top">
            <div className="postvisit-doctor-left">
              <div className="postvisit-doctor-avatar-wrap">
                <div className="postvisit-doctor-avatar" style={{ background: `linear-gradient(135deg, ${doctor.color}, ${doctor.color}dd)` }}>
                  {doctor.initial}
                </div>
                <div className="postvisit-doctor-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <div className="postvisit-doctor-info">
                <div className="postvisit-doctor-name">
                  {doctor.name ? `Dr. ${doctor.name}` : 'Your provider'}
                </div>
                <div className="postvisit-doctor-specialty">{doctor.specialty}</div>
              </div>
            </div>
            {doctor.rating != null ? (
              <div className="postvisit-doctor-rating">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {doctor.rating}
              </div>
            ) : null}
          </div>

          <div className="postvisit-detail-row">
            <svg className="postvisit-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="postvisit-detail-label">Date</span>
            <span className="postvisit-detail-value">{date || '—'}</span>
          </div>
          <div className="postvisit-detail-row">
            <svg className="postvisit-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="postvisit-detail-label">Type</span>
            <span className="postvisit-detail-value">{type || '—'}</span>
          </div>
          <div className="postvisit-detail-row">
            <svg className="postvisit-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="postvisit-detail-label">Time</span>
            <span className="postvisit-detail-value">{time || '—'}</span>
          </div>
          <div className="postvisit-detail-row postvisit-detail-row-last">
            <svg className="postvisit-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="postvisit-detail-address">{address || '—'}</span>
          </div>

          <div className="postvisit-completed-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Completed
          </div>
        </div>

        <div className="postvisit-card">
          <h2 className="postvisit-card-title">Care Summary</h2>
          <ul className="postvisit-summary-list">
            {(careSummary || []).map((item, i) => (
              <li key={i} className="postvisit-summary-item">{item}</li>
            ))}
          </ul>
          <button type="button" className="postvisit-inline-action">
            Read Full Doctor&apos;s Notes
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        <div className="postvisit-card">
          <div className="postvisit-followup-header">
            <h2 className="postvisit-card-title">Follow-up Recommended</h2>
            {followUp?.date ? (
              <span className="postvisit-followup-badge">Next: {followUp.date}</span>
            ) : null}
          </div>
          <p className="postvisit-followup-desc">{followUp?.description}</p>
          <button type="button" className="postvisit-primary-btn">Book Follow-Up</button>
          <button type="button" className="postvisit-calendar-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Add to Calendar
          </button>
        </div>

        <div className="postvisit-card">
          <h2 className="postvisit-card-title">Care Resources</h2>
          <div className="postvisit-resources-list">
            {(resources || []).map((item, i) => (
              <button type="button" key={i} className="postvisit-resource-row" onClick={() => handleResource(item)}>
                <div className="postvisit-resource-icon">
                  {item.icon === 'medications' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                  )}
                  {item.icon === 'tests' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                  {item.icon === 'payment' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  )}
                  {item.icon === 'prescription' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <path d="M8 13h5M8 17h8" />
                    </svg>
                  )}
                </div>
                <div className="postvisit-resource-info">
                  <div className="postvisit-resource-label">{item.label}</div>
                </div>
                {item.detail && <span className="postvisit-resource-detail">{item.detail}</span>}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {reports && reports.length > 0 && (
          <div className="postvisit-card">
            <h2 className="postvisit-card-title">Recent Reports</h2>
            <div className="postvisit-reports-list">
              {reports.map((report) => (
                <div key={report.id} className="postvisit-report-item">
                  {report.image ? (
                    <img src={report.image} alt={report.title} className="postvisit-report-image" />
                  ) : (
                    <div className="postvisit-report-image" />
                  )}
                  <div className="postvisit-report-info">
                    <div className="postvisit-report-title">{report.title}</div>
                    <div className="postvisit-report-meta">
                      <span className="postvisit-report-type">{report.type}</span>
                      <span className="postvisit-report-date">{report.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="button" className="postvisit-download-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Report
        </button>

        <div className="postvisit-support-card">
          <h2 className="postvisit-card-title">Need Help After Your Visit?</h2>
          <div className="postvisit-support-list">
            <button type="button" className="postvisit-support-row">
              <div className="postvisit-support-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span className="postvisit-support-label">Message Clinic</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button type="button" className="postvisit-support-row">
              <div className="postvisit-support-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <span className="postvisit-support-label">Call Care Team</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button type="button" className="postvisit-support-row postvisit-support-row-last">
              <div className="postvisit-support-icon postvisit-support-icon-warning">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <span className="postvisit-support-label postvisit-support-label-warning">Emergency Guidance</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
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
