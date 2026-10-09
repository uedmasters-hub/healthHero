import { useAuth } from '../../features/auth/hooks/useAuth'
import PatientProfile from '../PatientProfile'
import GuestProfile from './GuestProfile'

/** Identified patients see their chart. Guests see the temporary profile. */
export default function ProfileRoute() {
  const { ready, isAuthenticated } = useAuth()
  if (!ready) return null
  if (!isAuthenticated) return <GuestProfile />
  return <PatientProfile />
}
