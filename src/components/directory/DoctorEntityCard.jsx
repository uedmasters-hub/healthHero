import { useNavigate, useLocation } from 'react-router-dom'
import { flowState } from '../../lib/careFlow'
import { formatMoney } from '../../lib/paymentSession'
import { presentBookingCard } from '../../booking'
import { pickDoctorCredentials } from '../../features/providers'
import { formatPlaceParts } from '../../features/geography/formatPlace'
import useDuplicateBookingGuard from '../../hooks/useDuplicateBookingGuard'
import EntityCard from './EntityCard'

function displayName(name) {
  if (!name) return 'Doctor'
  return name.startsWith('Dr.') ? name : `Dr. ${name}`
}

function InPersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3.5v3.2M16 3.5v3.2M3.5 10h17" />
    </svg>
  )
}

export default function DoctorEntityCard({
  doctor,
  origin = 'find-doctor',
  returnTo,
  onBeforeNavigate,
  onBookNow,
  recentlyViewed = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { guard, modal } = useDuplicateBookingGuard()
  const preferredVisitType = location.state?.preferredVisitType

  const presented = presentBookingCard({ doctor, serviceType: 'doctor_consultation' })
  const merged = presented?.doctor || doctor || {}
  const name = displayName(merged?.name || doctor?.name)
  const specialty = merged?.specialty || doctor?.specialty || 'Specialist'
  const creds = pickDoctorCredentials({ ...doctor, ...merged })
  const address = formatPlaceParts(merged?.address || doctor?.address || '')
  const visitTypes = merged?.visitTypes || doctor?.visitTypes || []
  const fee = merged?.fee ?? doctor?.fee
  const photo = presented?.photo || merged?.photo || doctor?.photo

  const doctorForNav = {
    ...doctor,
    ...merged,
    photo,
    name,
    specialty,
    degree: creds.degree,
    nmcNumber: creds.nmcNumber,
    address,
  }

  const chips = [
    doctor?.distance
      ? { id: 'distance', label: doctor.distance }
      : null,
    ...visitTypes.map((type) => ({
      id: type,
      label: type === 'Video' ? 'Video Consultation' : type,
      icon: type === 'In-Person' ? <InPersonIcon /> : <VideoIcon />,
    })),
  ].filter(Boolean)

  const openProfile = () => {
    if (!doctorForNav?.id) return
    onBeforeNavigate?.()
    navigate(`/doctor/${doctorForNav.id}`, {
      state: flowState(location, { origin, preferredVisitType, returnTo }),
    })
  }

  const handleBook = () => {
    onBeforeNavigate?.()
    if (onBookNow) {
      onBookNow(doctorForNav)
      return
    }
    guard(doctorForNav, ({ forSomeoneElse }) => {
      navigate('/booking/slot', {
        state: flowState(location, {
          doctor: doctorForNav,
          origin,
          returnTo: returnTo || `/doctor/${doctorForNav.id}`,
          preferredVisitType,
          forSomeoneElse,
        }),
      })
    })
  }

  return (
    <>
      <EntityCard
        name={name}
        subtitle={specialty}
        meta={creds.line || null}
        location={address || null}
        chips={chips}
        avatarSrc={photo}
        avatarName={name}
        doctor={doctorForNav}
        badge={recentlyViewed ? 'Viewed' : (doctorForNav?.isVerified ? 'Verified' : null)}
        priceLabel={fee != null ? `${formatMoney(fee)}*` : null}
        priceSuffix={fee != null ? 'Consultation fee' : null}
        actionLabel="Book Now"
        actionIcon={<CalendarIcon />}
        onAction={handleBook}
        onClick={openProfile}
      />
      {modal}
    </>
  )
}
