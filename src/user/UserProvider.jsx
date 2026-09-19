import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import { DEMO_USER_ID } from './constants'
import { emptyHealth } from './health'
import { useAuth } from '../features/auth/hooks/useAuth'
import {
  membersForBooking,
  profileView,
  publicUser,
} from './models'
import {
  addFamilyMember,
  checkPhoneDuplicate,
  completeSelfProfile,
  currentUser,
  getUserSnapshot,
  hydrateProfileFromSupabase,
  markPhoneVerified,
  patchCurrentUser,
  removeEmergencyContact,
  removeHealthItem,
  removeInsurancePolicy,
  removeSavedAddress,
  subscribeUserStore,
  updatePersonalProfile,
  upsertEmergencyContact,
  upsertHealthItem,
  upsertInsurancePolicy,
  upsertSavedAddress,
} from './store'

const UserContext = createContext(null)

function subscribe(callback) {
  return subscribeUserStore(callback)
}

export function UserProvider({ children }) {
  const auth = useAuth()
  const snapshot = useSyncExternalStore(subscribe, getUserSnapshot, getUserSnapshot)

  const updateUser = useCallback((partial) => patchCurrentUser(partial), [])
  const addMember = useCallback((input) => addFamilyMember(input), [])
  const completeSelf = useCallback((input) => completeSelfProfile(input), [])
  const saveProfile = useCallback((input) => updatePersonalProfile(input), [])
  const checkPhone = useCallback((phone) => checkPhoneDuplicate(phone), [])
  const verifyPhone = useCallback((phone) => markPhoneVerified(phone), [])
  const hydrateProfile = useCallback(() => hydrateProfileFromSupabase(), [])
  const saveHealthItem = useCallback((kind, input) => upsertHealthItem(kind, input), [])
  const deleteHealthItem = useCallback((kind, id) => removeHealthItem(kind, id), [])
  const saveEmergencyContact = useCallback((input) => upsertEmergencyContact(input), [])
  const deleteEmergencyContact = useCallback((id) => removeEmergencyContact(id), [])
  const saveInsurancePolicy = useCallback((input) => upsertInsurancePolicy(input), [])
  const deleteInsurancePolicy = useCallback((id) => removeInsurancePolicy(id), [])
  const saveAddress = useCallback((input) => upsertSavedAddress(input), [])
  const deleteAddress = useCallback((id) => removeSavedAddress(id), [])

  const value = useMemo(() => {
    const user = auth.isAuthenticated ? snapshot.user : null
    return {
      ready: auth.ready,
      user: publicUser(user),
      rawUser: user,
      session: snapshot.session,
      authSession: auth.session,
      profile: profileView(user),
      emailVerified: auth.emailVerified || false,
      googleBirthday: auth.googleBirthday || user?.googleBirthday || null,
      members: membersForBooking(user),
      records: user?.records || { consultations: [], reports: [], medications: [] },
      health: user?.health || emptyHealth(),
      emergencyContacts: user?.emergencyContacts || [],
      insurancePolicies: user?.insurancePolicies || [],
      prescriptions: user?.prescriptions || [],
      addresses: user?.addresses || [],
      paymentHistory: user?.paymentHistory || [],
      pharmacyOrders: user?.pharmacyOrders || [],
      savedInsightIds: user?.savedInsightIds || [],
      isDemo: user?.id === DEMO_USER_ID,
      login: auth.signInWithPassword,
      register: auth.signUp,
      logout: auth.signOut,
      updateUser,
      addMember,
      completeSelf,
      saveProfile,
      checkPhone,
      verifyPhone,
      hydrateProfile,
      saveHealthItem,
      deleteHealthItem,
      saveEmergencyContact,
      deleteEmergencyContact,
      saveInsurancePolicy,
      deleteInsurancePolicy,
      saveAddress,
      deleteAddress,
    }
  }, [
    auth.ready, auth.isAuthenticated, auth.session, auth.googleBirthday, auth.emailVerified,
    auth.signInWithPassword, auth.signUp, auth.signOut,
    snapshot, updateUser, addMember, completeSelf, saveProfile, checkPhone, verifyPhone, hydrateProfile,
    saveHealthItem, deleteHealthItem, saveEmergencyContact, deleteEmergencyContact,
    saveInsurancePolicy, deleteInsurancePolicy, saveAddress, deleteAddress,
  ])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}

export function getActiveUser() {
  return currentUser()
}
