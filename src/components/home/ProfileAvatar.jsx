import { useNavigate } from 'react-router-dom'
import { useUser } from '../../user'

/** Permanent 44×44 profile control — never animates with the notification capsule. */
export default function ProfileAvatar({ className = '' }) {
  const navigate = useNavigate()
  const { profile, isDemo } = useUser()

  return (
    <button
      type="button"
      className={['profile-avatar', className].filter(Boolean).join(' ')}
      onClick={() => navigate('/profile')}
      aria-label="Open profile"
    >
      {profile?.avatar ? (
        <img src={profile.avatar} alt="" className="profile-avatar-img" />
      ) : (
        <span className="profile-avatar-placeholder">{profile?.initials || 'U'}</span>
      )}
      {isDemo ? <span className="profile-avatar-pro">PRO</span> : null}
    </button>
  )
}
