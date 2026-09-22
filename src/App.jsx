import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import { BookingProvider } from './components/BookingContext'
import { NotificationProvider } from './components/NotificationContext'
import { TransitionProvider, useTransition } from './components/PageTransition'
import { FetchSessionProvider } from './components/FetchSession'
import HomePage from './components/HomePage'
import BookingFlow from './components/BookingFlow'
import SelectProvider from './components/SelectProvider'
import SelectSlot from './components/SelectSlot'
import SelectPatient from './components/SelectPatient'
import ConfirmBooking from './components/ConfirmBooking'
import DoctorProfile from './components/DoctorProfile'
import DoctorReviews from './components/DoctorReviews'
import PatientProfile from './components/PatientProfile'
import PersonalWorkspace from './components/profile/PersonalWorkspace'
import MedicalWorkspace from './components/profile/MedicalWorkspace'
import RecordsWorkspace from './components/profile/RecordsWorkspace'
import InsuranceWorkspace from './components/profile/InsuranceWorkspace'
import SupportWorkspace from './components/profile/SupportWorkspace'
import AccountWorkspace from './components/profile/AccountWorkspace'
import AppointmentDetail from './components/AppointmentDetail'
import PreVisitCheckIn from './components/PreVisitCheckIn'
import PrepareVisit from './components/PrepareVisit'
import CancelCheckIn from './components/CancelCheckIn'
import RescheduleAppointment from './components/RescheduleAppointment'
import ConfirmReschedule from './components/ConfirmReschedule'
import ProcessPayment from './components/ProcessPayment'
import VerifyPayment from './components/VerifyPayment'
import RescheduleSuccess from './components/RescheduleSuccess'
import TreatPage from './components/TreatPage'
import PostVisitSummary from './components/PostVisitSummary'
import PharmacyPage from './components/PharmacyPage'
import CentersPage from './components/CentersPage'
import SettingsPage from './components/SettingsPage'
import NotificationsPage from './components/NotificationsPage'
import ExploreSpecialisationsPage from './components/ExploreSpecialisationsPage'
import ExploreSpecialtyPage from './components/ExploreSpecialtyPage'
import ServicesBottomSheet from './components/ServicesBottomSheet'
import InsightsBottomSheet from './components/InsightsBottomSheet'
import TopDoctorsOverlay from './components/TopDoctorsOverlay'
import ArticlePage from './components/ArticlePage'
import { SharedHeroProvider } from './components/SharedHero'
import { DemoPreviewProvider } from './components/DemoPreviewModal'
import AppShell from './components/AppShell'
import BottomNav from './components/BottomNav'
import { OnboardingProvider } from './components/Onboarding'
import AuthGate from './components/auth/AuthGate'
import { AuthProvider } from './features/auth/AuthProvider'
import { SyncProvider } from './features/sync'
import { UserProvider, useUser } from './user'
import { isHomePath } from './lib/careFlow'
import { isSupabaseConfigured, supabaseConfigError } from './lib/supabase'
import DesignSystemLayout from './design-system/DesignSystemLayout'
import { FabProvider } from './features/fab'
import { NotificationIsland, NotificationPresentationSync } from './features/notifications'
import ChatInboxPage from './features/conversations/pages/ChatInboxPage'
import NewConversationPage from './features/conversations/pages/NewConversationPage'
import ConversationThreadPage from './features/conversations/pages/ConversationThreadPage'
import SupportThreadPage from './features/conversations/pages/SupportThreadPage'
import AgentInboxPage from './features/conversations/pages/AgentInboxPage'
import AppScrimHost, { useAppScrim } from './components/AppScrim'
import { SheetPortal } from './components/PageTransition'
import { PushStack } from './features/pushNav'

function ExploreIndexRedirect() {
  const navigate = useNavigate()
  const { openSpecialisations } = useTransition()

  useEffect(() => {
    openSpecialisations()
    navigate('/', { replace: true })
  }, [navigate, openSpecialisations])

  return null
}

/** Bridges TransitionProvider overlay state → global phone-screen scrim + page recession. */
function OverlayScrimBridge() {
  const { isAnyOverlayActive } = useTransition()
  useAppScrim(isAnyOverlayActive)

  useEffect(() => {
    const screen = document.getElementById('phone-screen')
    if (!screen) return undefined
    screen.classList.toggle('is-sheet-presented', Boolean(isAnyOverlayActive))
    return () => screen.classList.remove('is-sheet-presented')
  }, [isAnyOverlayActive])

  return null
}

function ChildPageLayout() {
  const location = useLocation()
  const onHome = isHomePath(location.pathname)
  return (
    <div className={`page-layer-inner ${onHome ? 'is-empty' : ''}`}>
      <PushStack />
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  const { isTopDoctorsOpen, isTopDoctorsSlidingOut, isSpecialisationsOpen } = useTransition()
  const homeFront = isHomePath(location.pathname)

  return (
    <>
      <div className="page-layer">
        <div className={`home-layer ${homeFront ? '' : 'is-behind'}`} aria-hidden={!homeFront}>
          <HomePage />
        </div>
        <Routes>
          {/* Pathless layout stays mounted so push→home pop can finish animating. */}
          <Route element={<ChildPageLayout />}>
            <Route index element={null} />
            <Route path="search" element={null} />
            <Route path="/profile" element={<PatientProfile />} />
            <Route path="/profile/personal" element={<PersonalWorkspace />} />
            <Route path="/profile/medical" element={<MedicalWorkspace />} />
            <Route path="/profile/records" element={<RecordsWorkspace />} />
            <Route path="/profile/insurance" element={<InsuranceWorkspace />} />
            <Route path="/profile/support" element={<SupportWorkspace />} />
            <Route path="/profile/account" element={<AccountWorkspace />} />
            <Route path="/appointment" element={<AppointmentDetail />} />
            <Route path="/prepare-visit" element={<PrepareVisit />} />
            <Route path="/pre-checkin" element={<PreVisitCheckIn />} />
            <Route path="/cancel-checkin" element={<CancelCheckIn />} />
            <Route path="/reschedule" element={<RescheduleAppointment />} />
            <Route path="/confirm-reschedule" element={<ConfirmReschedule />} />
            <Route path="/process-payment" element={<ProcessPayment />} />
            <Route path="/verify-payment" element={<VerifyPayment />} />
            <Route path="/reschedule-success" element={<RescheduleSuccess />} />
            <Route path="/treat" element={<TreatPage />} />
            <Route path="/post-visit-summary" element={<PostVisitSummary />} />
            <Route path="/pharmacy" element={<PharmacyPage />} />
            <Route path="/centers" element={<CentersPage />} />
            <Route path="/calendar" element={<CentersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/chat" element={<ChatInboxPage />} />
            <Route path="/chat/new" element={<NewConversationPage />} />
            <Route path="/chat/agent" element={<AgentInboxPage />} />
            <Route path="/chat/support/:conversationId" element={<SupportThreadPage />} />
            <Route path="/chat/:conversationId" element={<ConversationThreadPage />} />
            <Route path="/insights/:id" element={<ArticlePage />} />
            <Route path="/explore" element={<ExploreIndexRedirect />} />
            <Route path="/explore/:specialty" element={<ExploreSpecialtyPage />} />
            <Route path="/doctor/:id" element={<DoctorProfile />} />
            <Route path="/doctor/:id/reviews" element={<DoctorReviews />} />
            {/* Sibling steps (not nested Outlet) so PushStack can keep prior
                booking screens mounted as underlays for mirrored pop. */}
            <Route path="/booking" element={<BookingFlow><SelectProvider /></BookingFlow>} />
            <Route path="/booking/slot" element={<BookingFlow><SelectSlot /></BookingFlow>} />
            <Route path="/booking/patient" element={<BookingFlow><SelectPatient /></BookingFlow>} />
            <Route path="/booking/confirm" element={<BookingFlow><ConfirmBooking /></BookingFlow>} />
          </Route>
        </Routes>
      </div>
      {isSpecialisationsOpen && (
        <SheetPortal to="screen">
          <ExploreSpecialisationsPage />
        </SheetPortal>
      )}
      {(isTopDoctorsOpen || isTopDoctorsSlidingOut) && (
        <SheetPortal to="screen">
          <TopDoctorsOverlay />
        </SheetPortal>
      )}
      <SheetPortal to="screen">
        <ServicesBottomSheet />
      </SheetPortal>
      <SheetPortal to="screen">
        <InsightsBottomSheet />
      </SheetPortal>
    </>
  )
}

function AppProviders() {
  const { user } = useUser()
  return (
    <BookingProvider key={user?.id || 'anon'}>
      <NotificationProvider>
        <OnboardingProvider>
          <TransitionProvider>
            <AuthGate>
              <DemoPreviewProvider>
                <FetchSessionProvider>
                  <SharedHeroProvider>
                    <FabProvider>
                      <AppRoutes />
                      <BottomNav />
                      <NotificationPresentationSync />
                      <NotificationIsland />
                    </FabProvider>
                  </SharedHeroProvider>
                </FetchSessionProvider>
              </DemoPreviewProvider>
            </AuthGate>
            <OverlayScrimBridge />
            <AppScrimHost />
          </TransitionProvider>
        </OnboardingProvider>
      </NotificationProvider>
    </BookingProvider>
  )
}

function DesignSystemGate() {
  const location = useLocation()
  if (!location.pathname.startsWith('/design')) return null
  return <DesignSystemLayout />
}

function ConfigErrorScreen({ message }) {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
        background: '#fff',
        color: '#1a1a2e',
        fontFamily: 'inherit',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22 }}>Configuration needed</h1>
      <p style={{ margin: 0, maxWidth: 320, lineHeight: 1.45, color: '#5c5c70', fontSize: 14 }}>
        {message}
      </p>
    </div>
  )
}

function AppGate() {
  const location = useLocation()
  if (location.pathname.startsWith('/design')) return null
  if (!isSupabaseConfigured) {
    return (
      <AppShell>
        <ConfigErrorScreen message={supabaseConfigError} />
      </AppShell>
    )
  }
  return (
    <AppShell>
      <AuthProvider>
        <SyncProvider>
          <UserProvider>
            <AppProviders />
          </UserProvider>
        </SyncProvider>
      </AuthProvider>
    </AppShell>
  )
}

function App() {
  return (
    <BrowserRouter>
      <DesignSystemGate />
      <AppGate />
    </BrowserRouter>
  )
}

export default App
