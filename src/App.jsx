import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
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
import ProfileRoute from './components/profile/ProfileRoute'
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
import CancelAppointment from './components/CancelAppointment'
import RescheduleAppointment from './components/RescheduleAppointment'
import ConfirmReschedule from './components/ConfirmReschedule'
import ProcessPayment from './components/ProcessPayment'
import VerifyPayment from './components/VerifyPayment'
import RescheduleSuccess from './components/RescheduleSuccess'
import TreatPage from './components/TreatPage'
import PostVisitSummary from './components/PostVisitSummary'
import PostVisitReport from './components/PostVisitReport'
import PharmacyPage from './components/PharmacyPage'
import PharmacyBrowsePage from './components/PharmacyBrowsePage'
import PharmacyDetailPage from './components/PharmacyDetailPage'
import { FacilityReviewsPage, PharmacyReviewsPage } from './components/PlaceReviews'
import PharmacyProductPage from './components/pharmacy/PharmacyProductPage'
import PharmacyCartPage from './components/pharmacy/PharmacyCartPage'
import PharmacyCheckoutPage from './components/pharmacy/PharmacyCheckoutPage'
import PharmacyOrdersPage from './components/pharmacy/PharmacyOrdersPage'
import PharmacyOrderPage from './components/pharmacy/PharmacyOrderPage'
import PharmacyStorePage from './components/pharmacy/PharmacyStorePage'
import CentersPage from './components/CentersPage'
import FacilityPage from './components/FacilityPage'
import SettingsPage from './components/SettingsPage'
import SearchRadiusSettingsPage from './components/SearchRadiusSettingsPage'
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
import AppErrorBoundary from './components/AppErrorBoundary'
import { SystemState } from './components/system'
import ConnectionBanner from './features/connection/ConnectionBanner'

const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true'
import BottomNav from './components/BottomNav'
import { OnboardingProvider } from './components/Onboarding'
import AuthGate from './components/auth/AuthGate'
import { AuthProvider } from './features/auth/AuthProvider'
import { LocationProvider } from './features/location'
import { SyncProvider } from './features/sync'
import { UserProvider, useUser } from './user'
import { I18nProvider } from './i18n'
import { SearchProvider } from './features/search'
import { isHomePath } from './lib/careFlow'
import { isSupabaseConfigured, supabaseConfigError } from './lib/supabase'
import DesignSystemLayout from './design-system/DesignSystemLayout'
import VideoConsultPage from './features/videoConsult/VideoConsultPage'
import ReadinessPage from './features/videoConsult/ReadinessPage'
import { FabProvider } from './features/fab'
import { NotificationIsland, NotificationPresentationSync } from './features/notifications'
import ChatInboxPage from './features/conversations/pages/ChatInboxPage'
import NewConversationPage from './features/conversations/pages/NewConversationPage'
import ConversationThreadPage from './features/conversations/pages/ConversationThreadPage'
import SupportThreadPage from './features/conversations/pages/SupportThreadPage'
import AgentInboxPage from './features/conversations/pages/AgentInboxPage'
import AppScrimHost, { useAppScrim } from './components/AppScrim'
import { useAdaptiveFooter } from './features/footer/useAdaptiveFooter'
import GuestJourney from './features/guest/GuestJourney'
import { SheetPortal } from './components/PageTransition'
import { PushStack } from './features/pushNav'

function VideoBookingEntry() {
  const location = useLocation()
  return (
    <Navigate
      to="/booking"
      replace
      state={{
        ...(location.state || {}),
        origin: location.state?.origin || 'services',
        returnTo: location.state?.returnTo || '/',
        entryReturnTo: location.state?.entryReturnTo || '/',
        videoLock: true,
        visitType: 'Video Consultation',
        preferredVisitType: 'Video Consultation',
      }}
    />
  )
}

function ExploreIndexRedirect() {
  const navigate = useNavigate()
  const { openSpecialisations } = useTransition()

  useEffect(() => {
    openSpecialisations()
    navigate('/', { replace: true })
  }, [navigate, openSpecialisations])

  return null
}

function AdaptiveFooterBridge() {
  useAdaptiveFooter()
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
            <Route path="/profile" element={<ProfileRoute />} />
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
            <Route path="/cancel-appointment" element={<CancelAppointment />} />
            <Route path="/reschedule" element={<RescheduleAppointment />} />
            <Route path="/confirm-reschedule" element={<ConfirmReschedule />} />
            <Route path="/process-payment" element={<ProcessPayment />} />
            <Route path="/verify-payment" element={<VerifyPayment />} />
            <Route path="/reschedule-success" element={<RescheduleSuccess />} />
            <Route path="/treat" element={<TreatPage />} />
            <Route path="/post-visit-summary" element={<PostVisitSummary />} />
            <Route path="/post-visit-report" element={<PostVisitReport />} />
            <Route path="/pharmacy" element={<PharmacyPage />} />
            <Route path="/pharmacy/browse" element={<PharmacyBrowsePage />} />
            <Route path="/pharmacy/product/:productId" element={<PharmacyProductPage />} />
            <Route path="/pharmacy/cart" element={<PharmacyCartPage />} />
            <Route path="/pharmacy/checkout" element={<PharmacyCheckoutPage />} />
            <Route path="/pharmacy/orders" element={<PharmacyOrdersPage />} />
            <Route path="/pharmacy/orders/:orderId" element={<PharmacyOrderPage />} />
            <Route path="/pharmacy/store/:storeId" element={<PharmacyStorePage />} />
            <Route path="/pharmacy/:pharmacyId/reviews" element={<PharmacyReviewsPage />} />
            <Route path="/pharmacy/:pharmacyId" element={<PharmacyDetailPage />} />
            <Route path="/centers" element={<CentersPage />} />
            <Route path="/centers/:centerId/reviews" element={<FacilityReviewsPage />} />
            <Route path="/centers/:centerId" element={<FacilityPage />} />
            <Route path="/calendar" element={<CentersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/search-radius" element={<SearchRadiusSettingsPage />} />
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
            <Route path="/video" element={<VideoBookingEntry />} />
            <Route path="/video/readiness" element={<ReadinessPage />} />
            <Route path="/video/join/:appointmentId" element={<VideoConsultPage />} />
            <Route path="/booking" element={<BookingFlow><SelectProvider /></BookingFlow>} />
            <Route path="/booking/slot" element={<BookingFlow><SelectSlot /></BookingFlow>} />
            <Route path="/booking/patient" element={<BookingFlow><SelectPatient /></BookingFlow>} />
            <Route path="/booking/confirm" element={<BookingFlow><ConfirmBooking /></BookingFlow>} />
            <Route path="/status/:state" element={<StatusPage />} />
            <Route path="*" element={<NotFoundPage />} />
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
          <GuestJourney />
          <TransitionProvider>
            <AuthGate>
              <DemoPreviewProvider>
                <FetchSessionProvider>
                  <SharedHeroProvider>
                    <FabProvider>
                      <AppRoutes />
                      <BottomNav />
                      <AdaptiveFooterBridge />
                      <NotificationPresentationSync />
                      <NotificationIsland />
                      <ConnectionBanner />
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
  // Nested <Routes> in the docs resolve relative to this parent route
  return (
    <Routes>
      <Route path="/design/*" element={<DesignSystemLayout />} />
    </Routes>
  )
}

function ConfigErrorScreen({ message }) {
  return (
    <div className="phone-app-state">
      <SystemState
        state="unavailable"
        title="eMedicalls is being set up"
        message="This build is missing its service configuration. Refresh in a moment."
        actions={['refresh']}
        details={import.meta.env.DEV ? message : null}
      />
    </div>
  )
}

function MaintenanceScreen() {
  return (
    <div className="phone-app-state">
      <SystemState state="maintenance" actions={['refresh']} />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="sys-route-page">
      <SystemState state="not-found" autoRedirect={{ to: '/', seconds: 10 }} />
    </div>
  )
}

/** /status/:state — preview or deep-link any system state (e.g. /status/503). */
function StatusPage() {
  const { state } = useParams()
  return (
    <div className="sys-route-page">
      <SystemState state={state} />
    </div>
  )
}

function AppGate() {
  const location = useLocation()
  if (location.pathname.startsWith('/design')) return null
  if (MAINTENANCE_MODE) {
    return (
      <AppShell>
        <MaintenanceScreen />
      </AppShell>
    )
  }
  if (!isSupabaseConfigured) {
    return (
      <AppShell>
        <ConfigErrorScreen message={supabaseConfigError} />
      </AppShell>
    )
  }
  return (
    <AppShell>
      <AppErrorBoundary>
        <AuthProvider>
          <LocationProvider>
            <SyncProvider>
              <UserProvider>
                <I18nProvider>
                  <SearchProvider>
                    <AppProviders />
                  </SearchProvider>
                </I18nProvider>
              </UserProvider>
            </SyncProvider>
          </LocationProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </AppShell>
  )
}

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <DesignSystemGate />
        <AppGate />
      </BrowserRouter>
    </AppErrorBoundary>
  )
}

export default App
