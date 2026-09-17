import { BrowserRouter, Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom'
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
import PhoneFrame from './components/PhoneFrame'
import BottomNav from './components/BottomNav'
import { OnboardingProvider } from './components/Onboarding'
import AuthGate from './components/auth/AuthGate'
import { UserProvider, useUser } from './user'
import { isHomePath } from './lib/careFlow'

function ExploreIndexRedirect() {
  const navigate = useNavigate()
  const { openSpecialisations } = useTransition()

  useEffect(() => {
    openSpecialisations()
    navigate('/', { replace: true })
  }, [navigate, openSpecialisations])

  return null
}

function DarkOverlay() {
  const { isAnyOverlayActive } = useTransition()
  return <div className={`dark-overlay ${isAnyOverlayActive ? 'active' : ''}`} />
}

function ChildPageLayout() {
  const location = useLocation()
  const { isAnyOverlayActive } = useTransition()
  const dimInner = isAnyOverlayActive && !isHomePath(location.pathname)
  return (
    <div className={`page-layer-inner ${dimInner ? 'is-dimmed' : ''}`}>
      <Outlet />
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
          <Route index element={null} />
          <Route path="search" element={null} />
          <Route element={<ChildPageLayout />}>
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
            <Route path="/insights/:id" element={<ArticlePage />} />
            <Route path="/explore" element={<ExploreIndexRedirect />} />
            <Route path="/explore/:specialty" element={<ExploreSpecialtyPage />} />
            <Route path="/doctor/:id" element={<DoctorProfile />} />
            <Route path="/doctor/:id/reviews" element={<DoctorReviews />} />
            <Route path="/booking" element={<BookingFlow />}>
              <Route index element={<SelectProvider />} />
              <Route path="slot" element={<SelectSlot />} />
              <Route path="patient" element={<SelectPatient />} />
              <Route path="confirm" element={<ConfirmBooking />} />
            </Route>
          </Route>
        </Routes>
      </div>
      <DarkOverlay />
      {isSpecialisationsOpen && <ExploreSpecialisationsPage />}
      {(isTopDoctorsOpen || isTopDoctorsSlidingOut) && <TopDoctorsOverlay />}
      <ServicesBottomSheet />
      <InsightsBottomSheet />
    </>
  )
}

function AppShell() {
  const { user } = useUser()
  return (
    <BookingProvider key={user?.id || 'anon'}>
      <NotificationProvider>
        <OnboardingProvider>
          <AuthGate>
            <TransitionProvider>
              <DemoPreviewProvider>
                <FetchSessionProvider>
                  <SharedHeroProvider>
                    <AppRoutes />
                    <BottomNav />
                  </SharedHeroProvider>
                </FetchSessionProvider>
              </DemoPreviewProvider>
            </TransitionProvider>
          </AuthGate>
        </OnboardingProvider>
      </NotificationProvider>
    </BookingProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <PhoneFrame>
        <UserProvider>
          <AppShell />
        </UserProvider>
      </PhoneFrame>
    </BrowserRouter>
  )
}

export default App
