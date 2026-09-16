import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBooking } from './BookingContext'
import MedicalRecordsPicker from './MedicalRecordsPicker'
import { QUICK_BOOK_NOTICE } from '../lib/bookingPolicy'
import { formatMoney } from '../lib/paymentSession'
import './ConfirmReschedule.css'

export default function ConfirmReschedule() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentBooking, setPaymentSession, startPayment } = useBooking()
  const [selectedRecords, setSelectedRecords] = useState(
    () => currentBooking?.attachedRecordIds || currentBooking?.selectedRecords || []
  )
  const { oldDate, oldTime, newDate, newTime, newTimeRange, visitType, duration, rescheduleFee, consultationFee, insuranceCoverage, paymentMethod, bookingMode } = location.state || {}

  if (!currentBooking) { navigate('/'); return null }
  const { doctor } = currentBooking

  const isQuickBook = bookingMode === 'quick'
  const amountDue = consultationFee + rescheduleFee - insuranceCoverage

  const beginPayment = () => {
    const appointmentData = {
      oldDate,
      oldTime,
      newDate,
      newTime,
      newTimeRange,
      visitType,
      duration,
      doctor,
      rescheduleFee,
      consultationFee,
      insuranceCoverage,
      selectedRecords,
    }
    const draftBooking = {
      ...currentBooking,
      date: newDate,
      time: newTime,
      visitType,
      duration,
      selectedRecords,
      attachedRecordIds: selectedRecords,
    }
    const { session, booking } = startPayment(draftBooking, {
      flow: 'reschedule',
      amount: amountDue,
      appointmentData,
    })
    setPaymentSession(session)
    navigate('/process-payment', {
      state: {
        bookingId: booking?.engineId || booking?.id || currentBooking?.engineId || currentBooking?.id,
        flow: 'reschedule',
        amount: amountDue,
        appointmentData,
      },
    })
  }
  return (
    <div className="crsch-page">
      <div className="crsch-header-bar">
        <button className="crsch-back-btn" onClick={() => navigate(-1)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <h1 className="crsch-header-title">Confirm Reschedule</h1>
        <button className="crsch-menu-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
        </button>
      </div>

      <div className="crsch-body">
        <div className="crsch-success-banner">
          <div className="crsch-success-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 className="crsch-success-title">New Time Selected</h2>
          <p className="crsch-success-desc">
            {isQuickBook ? QUICK_BOOK_NOTICE : 'Please review the details below to finalize your slot.'}
          </p>
        </div>

        <div className="crsch-card">
          <h3 className="crsch-card-title">Schedule comparison</h3>
          <div className="crsch-compare-row">
            <span className="crsch-compare-label">Previous Time</span>
            <span className="crsch-compare-old">{oldDate}, {oldTime}</span>
          </div>
          <div className="crsch-compare-divider" />
          <div className="crsch-compare-row">
            <span className="crsch-compare-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>New Selected Time</span>
            <span className="crsch-compare-new">{newDate}, {newTime}</span>
          </div>
        </div>

        <div className="crsch-card">
          <h3 className="crsch-card-title">Payment summary</h3>
          <div className="crsch-billing-row">
            <span className="crsch-billing-label">Consultation Fee</span>
            <span className="crsch-billing-value">{formatMoney(consultationFee)}</span>
          </div>
          <div className="crsch-billing-row">
            <span className="crsch-billing-label">Reschedule Fee</span>
            <span className="crsch-billing-value">{formatMoney(rescheduleFee)}</span>
          </div>
          <div className="crsch-billing-row">
            <span className="crsch-billing-label">Mediclaim Discount</span>
            <span className="crsch-billing-value discount">-{formatMoney(insuranceCoverage)}</span>
          </div>
          <div className="crsch-billing-divider" />
          <div className="crsch-billing-row total">
            <span className="crsch-billing-label">Amount Due Today</span>
            <span className="crsch-billing-value total">{formatMoney(amountDue)}</span>
          </div>
          <div className="crsch-payment-meta">
            <div className="crsch-payment-method">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
              {paymentMethod}
            </div>
            <span className="crsch-payment-pending">Pending</span>
          </div>
        </div>

        <div className="crsch-card">
          <div className="crsch-card-header">
            <h3 className="crsch-card-title">Your appointment</h3>
            <span className="crsch-specialty-badge">{doctor.specialty}</span>
          </div>
          <div className="crsch-doctor-row">
            <div className="crsch-doctor-avatar" style={{ background: `linear-gradient(135deg, ${doctor.color}, ${doctor.color}dd)` }}>
              {doctor.initial}
            </div>
            <div className="crsch-doctor-info">
              <div className="crsch-doctor-name">Dr. {doctor.name}</div>
              <div className="crsch-doctor-specialty">{doctor.specialty}</div>
            </div>
            <div className="crsch-doctor-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--rating)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              {doctor.rating}
            </div>
          </div>
          <div className="crsch-info-grid">
            <div className="crsch-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <div><div className="crsch-info-label">DATE</div><div className="crsch-info-value">{newDate}</div></div>
            </div>
            <div className="crsch-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <div><div className="crsch-info-label">TIME</div><div className="crsch-info-value">{newTimeRange}</div></div>
            </div>
            <div className="crsch-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <div><div className="crsch-info-label">TYPE</div><div className="crsch-info-value">{visitType} Visit</div></div>
            </div>
            <div className="crsch-info-cell">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              <div><div className="crsch-info-label">LOCATION</div><div className="crsch-info-value">{doctor.address}</div></div>
            </div>
          </div>
          <div className="crsch-action-row">
            <div className="crsch-action-item">
              <div className="crsch-action-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg></div>
              <span className="crsch-action-label">Get Directions</span>
            </div>
            <div className="crsch-action-item">
              <div className="crsch-action-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
              <span className="crsch-action-label">Add to Calendar</span>
            </div>
            <div className="crsch-action-item">
              <div className="crsch-action-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg></div>
              <span className="crsch-action-label">Contact Clinic</span>
            </div>
          </div>
        </div>

        <div className="crsch-records">
          <MedicalRecordsPicker selectedRecords={selectedRecords} onChange={setSelectedRecords} />
        </div>
      </div>

      <div className="crsch-bottom-bar">
        <button className="crsch-pay-btn" onClick={beginPayment}>
          Pay & Confirm Reschedule – {formatMoney(amountDue)}
        </button>
        <button className="crsch-change-link">Change Payment Method</button>
        <p className="crsch-footer-note">Your appointment will be updated, calendar reminders refreshed, and a payment receipt will be available in your invoice history.</p>
      </div>
    </div>
  )
}
