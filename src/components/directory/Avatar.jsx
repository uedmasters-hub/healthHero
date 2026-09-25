import { useEffect, useState } from 'react'
import { initialsFromName } from '../../user'
import { resolveProviderPhoto } from '../../lib/providerPhoto'
import './Avatar.css'

/**
 * Shared directory avatar — photo when available, lavender initials otherwise.
 * Never leaves an empty placeholder circle.
 */
export default function Avatar({
  name = '',
  src = null,
  doctor = null,
  alt = '',
  size = 56,
  className = '',
}) {
  const resolved = src || resolveProviderPhoto(doctor) || ''
  const initials = initialsFromName(name || doctor?.name || '')
  const [status, setStatus] = useState(resolved ? 'loading' : 'empty')
  const [currentSrc, setCurrentSrc] = useState(resolved)
  const srcKey = `${resolved}|${doctor?.id || ''}|${name}`

  useEffect(() => {
    const next = src || resolveProviderPhoto(doctor) || ''
    setCurrentSrc(next)
    setStatus(next ? 'loading' : 'empty')
  }, [srcKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const showImage = Boolean(currentSrc) && status !== 'error' && status !== 'empty'
  const showInitials = !showImage

  return (
    <span
      className={[
        'dir-avatar',
        status === 'loading' ? 'is-loading' : '',
        status === 'ready' ? 'is-ready' : '',
        showInitials ? 'is-initials' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-hidden={alt ? undefined : true}
    >
      {status === 'loading' ? <span className="dir-avatar__shine" aria-hidden="true" /> : null}
      {showImage ? (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={alt}
          className="dir-avatar__img"
          decoding="async"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      ) : null}
      {showInitials ? (
        <span className="dir-avatar__initials">{initials}</span>
      ) : null}
    </span>
  )
}
