import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBooking } from './BookingContext'
import MedicalRecordsPicker from './MedicalRecordsPicker'
import { QUICK_BOOK_NOTICE } from '../lib/bookingPolicy'
import { formatMoney } from '../lib/paymentSession'
import DoctorCard from './DoctorCard'
import { AppBar, Badge, Card, Icon, IconButton, InfoCell, InfoGrid, QuickAction, ResultHero } from './ui'
import './ConfirmReschedule.css'
import { UnavailablePage } from './system'

export default function ConfirmReschedule() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentBooking, setPaymentSession, startPayment } = useBooking()
  const [selectedRecords, setSelectedRecords] = useState(
    () => currentBooking?.attachedRecordIds || currentBooking?.selectedRecords || []
  )
  const { oldDate, oldTime, newDate, newTime, newTimeRange, visitType, duration, rescheduleFee, consultationFee, insuranceCoverage, paymentMethod, bookingMode } = location.state || {}

  if (!currentBooking) return <UnavailablePage title="This reschedule has expired" />
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
    <div className="ds-page crsch-page">
      <AppBar
        title="Confirm Reschedule"
        onBack={() => navigate(-1)}
        actions={(
          <IconButton label="More options" className="is-muted">
            <Icon.More />
          </IconButton>
        )}
      />

      <div className="ds-page__body has-fixed-footer crsch-body">
        <ResultHero
          title="New Time Selected"
          message={isQuickBook ? QUICK_BOOK_NOTICE : 'Please review the details below to finalize your slot.'}
        />

        <Card padded="lg">
          <h3 className="ds-card__title">Schedule comparison</h3>
          <div className="ds-stack is-tight">
            <div className="ds-kv">
              <span className="ds-kv__key">Previous Time</span>
              <span className="ds-kv__value is-struck">{oldDate}, {oldTime}</span>
            </div>
            <div className="ds-kv">
              <span className="ds-kv__key">New Selected Time</span>
              <span className="ds-kv__value">{newDate}, {newTime}</span>
            </div>
          </div>
        </Card>

        <Card padded="lg">
          <h3 className="ds-card__title">Payment summary</h3>
          <div className="ds-stack is-tight">
            <div className="ds-kv">
              <span className="ds-kv__key">Consultation Fee</span>
              <span className="ds-kv__value">{formatMoney(consultationFee)}</span>
            </div>
            <div className="ds-kv">
              <span className="ds-kv__key">Reschedule Fee</span>
              <span className="ds-kv__value">{formatMoney(rescheduleFee)}</span>
            </div>
            <div className="ds-kv">
              <span className="ds-kv__key">Mediclaim Discount</span>
              <span className="ds-kv__value is-positive">-{formatMoney(insuranceCoverage)}</span>
            </div>
            <div className="ds-kv is-total">
              <span className="ds-kv__key">Amount Due Today</span>
              <span className="ds-kv__value">{formatMoney(amountDue)}</span>
            </div>
          </div>
          <div className="ds-card__section crsch-payment-meta">
            <span className="crsch-payment-method">
              <Icon.Card />
              {paymentMethod}
            </span>
            <Badge tone="warning">Pending</Badge>
          </div>
        </Card>

        <Card padded="lg">
          <div className="ds-card__head">
            <h3 className="ds-card__title">Your appointment</h3>
            <Badge tone="info">{doctor.specialty}</Badge>
          </div>
          <DoctorCard doctor={doctor} context="identity" disableNavigate />
          <InfoGrid className="ds-card__section">
            <InfoCell icon={<Icon.Calendar />} label="Date" value={newDate} />
            <InfoCell icon={<Icon.Clock />} label="Time" value={newTimeRange} />
            <InfoCell icon={<Icon.User />} label="Type" value={`${visitType} Visit`} />
            <InfoCell icon={<Icon.Pin />} label="Location" value={doctor.address} />
          </InfoGrid>
          <div className="ds-card__section ds-action-row">
            <QuickAction icon={<Icon.Directions />} label="Get Directions" />
            <QuickAction icon={<Icon.Calendar />} label="Add to Calendar" />
            <QuickAction icon={<Icon.Phone />} label="Contact Clinic" />
          </div>
        </Card>

        <div className="crsch-records">
          <MedicalRecordsPicker selectedRecords={selectedRecords} onChange={setSelectedRecords} />
        </div>
      </div>

      <div className="crsch-bottom-bar sticky-footer-cta">
        <button type="button" className="sticky-footer-cta__primary" onClick={beginPayment}>
          Pay & Confirm Reschedule – {formatMoney(amountDue)}
        </button>
        <button type="button" className="sticky-footer-cta__secondary">Change Payment Method</button>
        <p className="ds-page__note">Your appointment will be updated, calendar reminders refreshed, and a payment receipt will be available in your invoice history.</p>
      </div>
    </div>
  )
}
