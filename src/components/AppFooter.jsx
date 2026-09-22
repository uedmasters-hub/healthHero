import { ONBOARD_LOGO } from '../lib/onboarding'
import { BRAND_NAME, BRAND_NAME_LEGAL, BRAND_SUPPORT_EMAIL } from '../lib/brand'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import './AppFooter.css'

const SERVICE_LINKS = [
  'Video Consultations',
  'Pathology Labs',
  'Online Pharmacy',
  'Home Sample Collection',
]

const SUPPORT_LINKS = [
  'Help Center / FAQ',
  'Booking Guide',
  'Terms of Service',
  'Privacy Policy',
]

const CONTACT = [
  {
    id: 'phone',
    label: '+977 9845 271 970',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    id: 'email',
    label: BRAND_SUPPORT_EMAIL,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  {
    id: 'location',
    label: 'Durbar Marg, Kathmandu, Nepal',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
    ),
  },
]

const SOCIAL = [
  {
    id: 'facebook',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M14 8.2h2.8V5H14c-2.4 0-4 1.5-4 4v2.2H7.5V14H10v8h3.4v-8h2.7l.6-2.8h-3.3V9.2c0-.6.3-1 1.1-1z" />
      </svg>
    ),
  },
  {
    id: 'twitter',
    label: 'Twitter',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M19.6 7.4c.5-.3.8-.8.9-1.4-.5.3-1 .5-1.6.6A2.6 2.6 0 0 0 14.4 9c0 .2 0 .4.1.6-2.2-.1-4.1-1.1-5.4-2.7-.2.4-.3.8-.3 1.3 0 .9.5 1.7 1.2 2.2-.4 0-.8-.1-1.2-.3v.1c0 1.3 1 2.3 2.2 2.6-.2.1-.5.1-.7.1h-.5c.3 1 1.3 1.8 2.4 1.8A5.3 5.3 0 0 1 6 16.1 7.4 7.4 0 0 0 10 17.3c4.8 0 7.4-4 7.4-7.4v-.3c.5-.4.9-.8 1.2-1.3-.5.2-1 .4-1.5.5z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="16.7" cy="7.3" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M7.3 9.3H4.6V20h2.7V9.3zM6 4.2A1.6 1.6 0 1 0 6 7.4 1.6 1.6 0 0 0 6 4.2zM19.4 20h-2.7v-5.2c0-1.5-.5-2.5-1.8-2.5-1 0-1.5.7-1.8 1.3-.1.2-.1.5-.1.8V20h-2.7s.1-9.2 0-10.7h2.7v1.5c.4-.6 1.4-1.7 3.3-1.7 2.4 0 4.1 1.6 4.1 4.9V20z" />
      </svg>
    ),
  },
]

function Chevron() {
  return (
    <svg className="app-footer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  )
}

function FooterLink({ label }) {
  return (
    <button type="button" className="app-footer-link">
      <Chevron />
      <span>{label}</span>
    </button>
  )
}

export default function AppFooter({ page = 'home' }) {
  const delay = page === 'treat' ? 220 : 480
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({
    dataset: `app-footer:${page}`,
    delay,
    batchSize: 1,
    stagger: 72,
  })

  return (
    <footer className="app-footer" aria-label={BRAND_NAME}>
      <RevealItem
        className="app-footer-block"
        revealed={isRevealed(0)}
        cached={isCached}
        ref={setItemRef(0)}
      >
        <div className="app-footer-brand">
          <div className="app-footer-wordmark">
            <img src={ONBOARD_LOGO} alt="" className="app-footer-logo" />
            <p className="app-footer-name">{BRAND_NAME}</p>
            <span className="app-footer-badge">24/7 Care</span>
          </div>
          <p className="app-footer-tagline">
            Your trusted companion for instant medical advice, digital prescriptions, lab tests, and doorstep pharmacy delivery.
          </p>
        </div>
      </RevealItem>

      <RevealItem
        className="app-footer-block is-divided"
        revealed={isRevealed(1)}
        cached={isCached}
        ref={setItemRef(1)}
      >
        <div className="app-footer-columns">
          <div>
            <h2 className="app-footer-heading">Our Services</h2>
            <div className="app-footer-links">
              {SERVICE_LINKS.map((label) => (
                <FooterLink key={label} label={label} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="app-footer-heading">Support &amp; Help</h2>
            <div className="app-footer-links">
              {SUPPORT_LINKS.map((label) => (
                <FooterLink key={label} label={label} />
              ))}
            </div>
          </div>
        </div>
      </RevealItem>

      <RevealItem
        className="app-footer-block is-divided"
        revealed={isRevealed(2)}
        cached={isCached}
        ref={setItemRef(2)}
      >
        <h2 className="app-footer-heading">Contact Info</h2>
        <div className="app-footer-contact">
          {CONTACT.map((item) => (
            <button key={item.id} type="button" className="app-footer-contact-row">
              <span className="app-footer-well">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </RevealItem>

      <RevealItem
        className="app-footer-block is-divided"
        revealed={isRevealed(3)}
        cached={isCached}
        ref={setItemRef(3)}
      >
        <div className="app-footer-social" aria-label="Social">
          {SOCIAL.map((item) => (
            <button key={item.id} type="button" className="app-footer-social-btn" aria-label={item.label}>
              {item.icon}
            </button>
          ))}
        </div>
        <p className="app-footer-legal">© 2026 {BRAND_NAME_LEGAL}.</p>
        <p className="app-footer-legal">ISO 27001 Certified • Secure Medical Records</p>
      </RevealItem>
    </footer>
  )
}
