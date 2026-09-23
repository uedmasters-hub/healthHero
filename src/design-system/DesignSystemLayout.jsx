import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './DesignSystemLayout.css'

import DesignPage from './pages/DesignPage'
import DevelopPage from './pages/DevelopPage'
import ContentDesignPage from './pages/ContentDesignPage'
import AboutPage from './pages/AboutPage'
import TokensPage from './pages/TokensPage'
import AccessibilityPage from './pages/AccessibilityPage'
import ContentPage from './pages/ContentPage'
import SpacingPage from './pages/SpacingPage'
import GridPage from './pages/GridPage'
import ColorPage from './pages/ColorPage'
import TypographyPage from './pages/TypographyPage'
import MotionPage from './pages/MotionPage'
import IconographyPage from './pages/IconographyPage'
import IllustrationsPage from './pages/IllustrationsPage'
import LogosPage from './pages/LogosPage'
import ElevationPage from './pages/ElevationPage'
import BorderPage from './pages/BorderPage'
import RadiusPage from './pages/RadiusPage'
import ButtonsPage from './pages/ButtonsPage'
import InputsPage from './pages/InputsPage'
import CardsPage from './pages/CardsPage'
import ModalsPage from './pages/ModalsPage'
import NavigationPage from './pages/NavigationPage'
import ChipsPage from './pages/ChipsPage'
import SkeletonsPage from './pages/SkeletonsPage'
import RovoUIPage from './pages/RovoUIPage'
import BookingFlowPage from './pages/BookingFlowPage'
import ProfileHubPage from './pages/ProfileHubPage'
import AuthFlowPage from './pages/AuthFlowPage'
import AppointmentDetailPage from './pages/AppointmentDetailPage'
import SkeletonStrategyPage from './pages/SkeletonStrategyPage'
import OverlaySystemPage from './pages/OverlaySystemPage'
import EmptyStatePage from './pages/EmptyStatePage'
import ToolsPage from './pages/ToolsPage'
import ReleasePhasesPage from './pages/ReleasePhasesPage'
import ContactPage from './pages/ContactPage'
import HomePage from './pages/HomePage'

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

const sections = [
  {
    title: 'Get started',
    items: [
      { label: 'Design', path: '/design/get-started/design' },
      { label: 'Develop', path: '/design/get-started/develop' },
      { label: 'Content design', path: '/design/get-started/content-design' },
      { label: 'About the design system', path: '/design/get-started/about' },
    ],
  },
  {
    title: 'Foundations',
    items: [
      { label: 'Tokens', path: '/design/foundations/tokens' },
      { label: 'Accessibility', path: '/design/foundations/accessibility' },
      { label: 'Content', path: '/design/foundations/content' },
      { label: 'Spacing', path: '/design/foundations/spacing' },
      { label: 'Grid', path: '/design/foundations/grid' },
      { label: 'Color', path: '/design/foundations/color' },
      { label: 'Typography', path: '/design/foundations/typography' },
      { label: 'Motion', path: '/design/foundations/motion' },
      { label: 'Iconography', path: '/design/foundations/iconography' },
      { label: 'Illustrations', path: '/design/foundations/illustrations' },
      { label: 'Logos', path: '/design/foundations/logos' },
      { label: 'Elevation', path: '/design/foundations/elevation' },
      { label: 'Border', path: '/design/foundations/border', badge: 'Beta' },
      { label: 'Radius', path: '/design/foundations/radius', badge: 'Beta' },
    ],
  },
  {
    title: 'Components',
    items: [
      { label: 'Buttons', path: '/design/components/buttons' },
      { label: 'Inputs', path: '/design/components/inputs' },
      { label: 'Cards', path: '/design/components/cards' },
      { label: 'Modals', path: '/design/components/modals' },
      { label: 'Navigation', path: '/design/components/navigation' },
      { label: 'Chips', path: '/design/components/chips' },
      { label: 'Skeletons', path: '/design/components/skeletons' },
      { label: 'Empty States', path: '/design/components/empty-states' },
    ],
  },
  {
    title: 'Rovo UI',
    items: [
      { label: 'Rovo UI patterns', path: '/design/rovo-ui' },
      { label: 'Booking Flow', path: '/design/rovo-ui/booking-flow' },
      { label: 'Profile Hub', path: '/design/rovo-ui/profile-hub' },
      { label: 'Auth Flow', path: '/design/rovo-ui/auth-flow' },
      { label: 'Appointment Detail', path: '/design/rovo-ui/appointment-detail' },
      { label: 'Skeleton Strategy', path: '/design/rovo-ui/skeleton-strategy' },
      { label: 'Overlay System', path: '/design/rovo-ui/overlay-system' },
    ],
  },
  {
    title: '',
    items: [
      { label: 'Tools', path: '/design/tools' },
      { label: 'Release phases', path: '/design/release-phases' },
      { label: 'Contact us', path: '/design/contact' },
    ],
  },
]

function Sidebar() {
  const location = useLocation()
  const [openSections, setOpenSections] = useState(() => {
    const initial = {}
    sections.forEach((s, i) => {
      initial[i] = s.items.some((item) => location.pathname.startsWith(item.path))
    })
    return initial
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggle = (i) => setOpenSections((prev) => ({ ...prev, [i]: !prev[i] }))

  return (
    <>
      <button className="ds-sidebar-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
        <MenuIcon />
      </button>
      <div className={`ds-sidebar-backdrop ${mobileOpen ? 'is-visible' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`ds-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="ds-sidebar-header">
          <NavLink to="/design" className="ds-sidebar-logo">
            <div className="ds-sidebar-logo-icon">e</div>
            <span className="ds-sidebar-logo-text">eMedicalls DS</span>
            <span className="ds-sidebar-logo-badge">v1.0</span>
          </NavLink>
        </div>
        <nav className="ds-sidebar-nav">
          {sections.map((section, i) => (
            <div key={i} className={`ds-sidebar-section ${openSections[i] ? 'is-open' : ''}`}>
              {section.title && (
                <button className="ds-sidebar-section-toggle" onClick={() => toggle(i)}>
                  <ChevronIcon />
                  {section.title}
                </button>
              )}
              <div className="ds-sidebar-section-items">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `ds-sidebar-link ${isActive ? 'is-active' : ''}`}
                  >
                    {item.label}
                    {item.badge && (
                      <span className={`ds-sidebar-link-badge ${item.badge === 'Beta' ? 'is-beta' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="ds-sidebar-footer">
          <span>eMedicalls Design System</span>
          <span>v1.0.0</span>
        </div>
      </aside>
    </>
  )
}

export default function DesignSystemLayout() {
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'ds-root-override'
    style.textContent = `
      html, body, #root {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        overscroll-behavior: auto !important;
      }
      body { background: var(--pp-page) !important; }
      #root { background: transparent !important; }
      ::-webkit-scrollbar { display: auto !important; }
    `
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [])

  return (
    <div className="ds-docs">
      <Sidebar />
      <main className="ds-main">
        <div className="ds-content">
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="get-started/design" element={<DesignPage />} />
            <Route path="get-started/develop" element={<DevelopPage />} />
            <Route path="get-started/content-design" element={<ContentDesignPage />} />
            <Route path="get-started/about" element={<AboutPage />} />
            <Route path="foundations/tokens" element={<TokensPage />} />
            <Route path="foundations/accessibility" element={<AccessibilityPage />} />
            <Route path="foundations/content" element={<ContentPage />} />
            <Route path="foundations/spacing" element={<SpacingPage />} />
            <Route path="foundations/grid" element={<GridPage />} />
            <Route path="foundations/color" element={<ColorPage />} />
            <Route path="foundations/typography" element={<TypographyPage />} />
            <Route path="foundations/motion" element={<MotionPage />} />
            <Route path="foundations/iconography" element={<IconographyPage />} />
            <Route path="foundations/illustrations" element={<IllustrationsPage />} />
            <Route path="foundations/logos" element={<LogosPage />} />
            <Route path="foundations/elevation" element={<ElevationPage />} />
            <Route path="foundations/border" element={<BorderPage />} />
            <Route path="foundations/radius" element={<RadiusPage />} />
            <Route path="components/buttons" element={<ButtonsPage />} />
            <Route path="components/inputs" element={<InputsPage />} />
            <Route path="components/cards" element={<CardsPage />} />
            <Route path="components/modals" element={<ModalsPage />} />
            <Route path="components/navigation" element={<NavigationPage />} />
            <Route path="components/chips" element={<ChipsPage />} />
            <Route path="components/skeletons" element={<SkeletonsPage />} />
            <Route path="components/empty-states" element={<EmptyStatePage />} />
            <Route path="rovo-ui" element={<RovoUIPage />} />
            <Route path="rovo-ui/booking-flow" element={<BookingFlowPage />} />
            <Route path="rovo-ui/profile-hub" element={<ProfileHubPage />} />
            <Route path="rovo-ui/auth-flow" element={<AuthFlowPage />} />
            <Route path="rovo-ui/appointment-detail" element={<AppointmentDetailPage />} />
            <Route path="rovo-ui/skeleton-strategy" element={<SkeletonStrategyPage />} />
            <Route path="rovo-ui/overlay-system" element={<OverlaySystemPage />} />
            <Route path="tools" element={<ToolsPage />} />
            <Route path="release-phases" element={<ReleasePhasesPage />} />
            <Route path="contact" element={<ContactPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
