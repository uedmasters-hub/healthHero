import useStaggerReveal from '../useStaggerReveal'
import { usePushBack } from '../../features/pushNav'
import '../PatientProfile.css'

export const CARE_SUPPORT = {
  phone: '+919845271970',
  phoneLabel: '+91 9845 271 970',
  email: 'support@healthhero.com',
}

export function dash(value) {
  if (value == null || String(value).trim() === '') return ''
  return value
}

export function ProfilePage({ title, onBack, action, children, dataset }) {
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({ delay: 160, dataset })
  const defaultBack = usePushBack('/profile')
  const goBack = onBack || defaultBack

  return (
    <div className="user-profile-page page-push-in">
      <div className="user-profile-header-bar">
        <button type="button" className="user-profile-back-btn" data-push-back onClick={goBack} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="user-profile-header-title">{title}</h1>
        {action ? action : <div className="user-profile-header-spacer" />}
      </div>
      <div className="user-profile-content" ref={containerRef}>
        {typeof children === 'function' ? children({ setItemRef, isRevealed, isCached }) : children}
        <div className="user-profile-footer">- You've reached the end -</div>
      </div>
    </div>
  )
}

export function SectionHead({ title, action, onAction }) {
  return (
    <div className="health-section-head">
      <h3 className="user-profile-section-title">{title}</h3>
      {action ? (
        <button type="button" className="health-add-btn" onClick={onAction}>{action}</button>
      ) : null}
    </div>
  )
}

export function InfoCard({ children, className = '' }) {
  return <div className={`user-profile-info-card ${className}`.trim()}>{children}</div>
}

export function InfoRow({ label, value, extra, emptyLabel = 'Add this detail' }) {
  const filled = value != null && String(value).trim() !== ''
  return (
    <div className="user-profile-info-row">
      <span className="user-profile-info-label">{label}</span>
      <span className={`user-profile-info-value ${filled ? '' : 'is-empty'}`}>{filled ? value : emptyLabel}</span>
      {extra ? <span className="profile-row-aside">{extra}</span> : null}
    </div>
  )
}

export function NavGroup({ children }) {
  return <div className="profile-nav-card">{children}</div>
}

export function NavRow({ icon, label, onClick, href }) {
  const Tag = href ? 'a' : 'button'
  return (
    <Tag
      type={href ? undefined : 'button'}
      className="profile-nav-row"
      onClick={onClick}
      href={href}
    >
      <span className="profile-nav-icon">{icon}</span>
      <span className="profile-nav-label">{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Tag>
  )
}

export function GuidedEmpty({ title, body, cta, onClick }) {
  return (
    <div className="profile-guided-empty">
      <p className="profile-guided-title">{title}</p>
      {body ? <p className="profile-guided-body">{body}</p> : null}
      {cta ? (
        <button type="button" className="health-empty-cta" onClick={onClick}>{cta}</button>
      ) : null}
    </div>
  )
}

export function MapThumb({ seed = '' }) {
  const n = [...String(seed)].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const y1 = 18 + (n % 10)
  const y2 = 38 + (n % 8)
  const x = 22 + (n % 18)
  return (
    <div className="profile-map-thumb" aria-hidden="true">
      <svg viewBox="0 0 84 64">
        <rect width="84" height="64" fill="#e7efe4" />
        <path d={`M0 ${y1} H84`} stroke="#c9d8c4" strokeWidth="6" />
        <path d={`M0 ${y2} H84`} stroke="#d5e3d1" strokeWidth="4" />
        <path d={`M${x} 0 V64`} stroke="#c9d8c4" strokeWidth="5" />
        <path d={`M${x + 28} 0 V64`} stroke="#dbe8d7" strokeWidth="3" />
        <circle cx="42" cy="32" r="7" fill="var(--primary)" />
        <circle cx="42" cy="32" r="3" fill="var(--white)" />
      </svg>
    </div>
  )
}

export const ProfileIcons = {
  person: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  medical: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  records: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  insurance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  message: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  call: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  account: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}
