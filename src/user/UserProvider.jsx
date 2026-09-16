import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { DEMO_USER_ID } from './constants'
import { emptyHealth } from './health'
import {
  membersForBooking,
  profileView,
  publicUser,
} from './models'
import {
  addFamilyMember,
  completeSelfProfile,
  currentUser,
  ensureDemoUser,
  getUserSnapshot,
  loginWithPassword,
  logout as logoutStore,
  markAllNotificationsRead,
  markNotificationRead,
  patchCurrentUser,
  registerAccount,
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
  const [ready, setReady] = useState(false)
  const snapshot = useSyncExternalStore(subscribe, getUserSnapshot, getUserSnapshot)

  useEffect(() => {
    let cancelled = false
    ensureDemoUser().finally(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback((identifier, password) => loginWithPassword(identifier, password), [])
  const register = useCallback((input) => registerAccount(input), [])
  const logout = useCallback(() => logoutStore(), [])
  const updateUser = useCallback((partial) => patchCurrentUser(partial), [])
  const addMember = useCallback((input) => addFamilyMember(input), [])
  const completeSelf = useCallback((input) => completeSelfProfile(input), [])
  const saveProfile = useCallback((input) => updatePersonalProfile(input), [])
  const saveHealthItem = useCallback((kind, input) => upsertHealthItem(kind, input), [])
  const deleteHealthItem = useCallback((kind, id) => removeHealthItem(kind, id), [])
  const saveEmergencyContact = useCallback((input) => upsertEmergencyContact(input), [])
  const deleteEmergencyContact = useCallback((id) => removeEmergencyContact(id), [])
  const saveInsurancePolicy = useCallback((input) => upsertInsurancePolicy(input), [])
  const deleteInsurancePolicy = useCallback((id) => removeInsurancePolicy(id), [])
  const saveAddress = useCallback((input) => upsertSavedAddress(input), [])
  const deleteAddress = useCallback((id) => removeSavedAddress(id), [])
  const markRead = useCallback((id) => markNotificationRead(id), [])
  const markAllRead = useCallback(() => markAllNotificationsRead(), [])

  const value = useMemo(() => {
    const user = snapshot.user
    return {
      ready,
      user: publicUser(user),
      rawUser: user,
      session: snapshot.session,
      profile: profileView(user),
      members: membersForBooking(user),
      records: user?.records || { consultations: [], reports: [], medications: [] },
      health: user?.health || emptyHealth(),
      emergencyContacts: user?.emergencyContacts || [],
      insurancePolicies: user?.insurancePolicies || [],
      notifications: user?.notifications || [],
      prescriptions: user?.prescriptions || [],
      addresses: user?.addresses || [],
      paymentHistory: user?.paymentHistory || [],
      pharmacyOrders: user?.pharmacyOrders || [],
      savedInsightIds: user?.savedInsightIds || [],
      isDemo: user?.id === DEMO_USER_ID,
      login,
      register,
      logout,
      updateUser,
      addMember,
      completeSelf,
      saveProfile,
      saveHealthItem,
      deleteHealthItem,
      saveEmergencyContact,
      deleteEmergencyContact,
      saveInsurancePolicy,
      deleteInsurancePolicy,
      saveAddress,
      deleteAddress,
      markRead,
      markAllRead,
    }
  }, [
    ready, snapshot, login, register, logout, updateUser, addMember, completeSelf, saveProfile,
    saveHealthItem, deleteHealthItem, saveEmergencyContact, deleteEmergencyContact,
    saveInsurancePolicy, deleteInsurancePolicy, saveAddress, deleteAddress, markRead, markAllRead,
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
