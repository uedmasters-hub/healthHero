import { useUser } from './UserProvider'
import { computeProfileCompletion } from './profileCompletion'

/** Live profile completion derived from the signed-in user store. */
export function useProfileCompletion() {
  const {
    profile,
    health,
    addresses,
    emergencyContacts,
    insurancePolicies,
    paymentMethods,
  } = useUser()

  return computeProfileCompletion({
    profile,
    health,
    addresses,
    emergencyContacts,
    insurancePolicies,
    paymentMethods,
  })
}
