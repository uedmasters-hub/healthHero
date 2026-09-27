import { useLocation, useNavigate } from 'react-router-dom'
import { withBookingEntry } from '../lib/careFlow'
import { beginReadiness, isVideoEntry } from '../features/videoConsult/lock'
import { useBookingFlow } from './BookingFlow'
import { usePushBack } from '../features/pushNav'
import DoctorList from './DoctorList'

export default function SelectProvider() {
  const navigate = useNavigate()
  const location = useLocation()
  const preferredVisitType = location.state?.preferredVisitType
  const booking = useBookingFlow()
  const goBack = usePushBack(-1)

  const stepper = booking ? (
    <div className="stepper" style={{ paddingTop: 0 }}>
      {[0, 1, 2, 3].map((idx) => (
        <div
          key={idx}
          className={`stepper-step ${idx === (booking.currentStep || 0) ? 'active' : ''} ${idx < (booking.currentStep || 0) ? 'completed' : ''}`}
        />
      ))}
    </div>
  ) : null

  return (
    <DoctorList
      origin="find-doctor"
      returnTo="/booking"
      dataset="booking:providers"
      title="Find Doctor"
      onBack={goBack}
      showBack
      headerExtra={stepper}
      onBookNow={(doctor, extras) => {
        const next = withBookingEntry(location, {
          doctor,
          origin: 'find-doctor',
          returnTo: '/booking',
          preferredVisitType,
          forSomeoneElse: extras?.forSomeoneElse,
        })
        if (isVideoEntry(next)) {
          beginReadiness(navigate, next)
          return
        }
        navigate('/booking/slot', { state: next })
      }}
    />
  )
}
