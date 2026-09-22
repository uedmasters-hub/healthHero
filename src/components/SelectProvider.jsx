import { useLocation, useNavigate } from 'react-router-dom'
import { withBookingEntry } from '../lib/careFlow'
import DoctorList from './DoctorList'

export default function SelectProvider() {
  const navigate = useNavigate()
  const location = useLocation()
  const preferredVisitType = location.state?.preferredVisitType

  return (
    <DoctorList
      origin="find-doctor"
      returnTo="/booking"
      dataset="booking:providers"
      onBookNow={(doctor, extras) => {
        navigate('/booking/slot', {
          state: withBookingEntry(location, {
            doctor,
            origin: 'find-doctor',
            returnTo: '/booking',
            preferredVisitType,
            forSomeoneElse: extras?.forSomeoneElse,
          }),
        })
      }}
    />
  )
}
