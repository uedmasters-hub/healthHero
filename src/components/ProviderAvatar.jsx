/**
 * Shared circular provider avatar — Home, Treat, Ready for Visit, Provider Chat.
 * Frame size/layout never changes with load state. Skeleton while resolving;
 * falls back to lavender initials (never an empty circle).
 */
import { useEffect, useState } from 'react'
import { resolveProviderPhoto } from '../lib/providerPhoto'
import { initialsFromName } from '../user'
import './ProviderAvatar.css'

export default function ProviderAvatar({
  doctor = null,
  src = null,
  alt = '',
  className = '',
  imgClassName = 'provider-avatar__img',
  placeholder = null,
  size = null,
  name = '',
}) {
  const resolved = src || resolveProviderPhoto(doctor) || ''
  const doctorId = doctor?.id ?? doctor?.doctorId ?? ''
  const srcKey = `${resolved}|${doctorId}`
  const initials = initialsFromName(name || doctor?.name || alt || '')

  const [status, setStatus] = useState(resolved ? 'loading' : 'empty')
  const [currentSrc, setCurrentSrc] = useState(resolved)
  useEffect(() => {
    const next = src || resolveProviderPhoto(doctor) || ''
    setCurrentSrc(next)
    setStatus(next ? 'loading' : 'empty')
  }, [srcKey]) // eslint-disable-line react-hooks/exhaustive-deps -- stabilize on src/id only

  const handleError = () => setStatus('error')

  const showImage = Boolean(currentSrc) && status !== 'error' && status !== 'empty'
  const showPlaceholder = status === 'error' || status === 'empty'

  const style = size
    ? { width: size, height: size, minWidth: size, minHeight: size }
    : undefined

  return (
    <span
      className={[
        'provider-avatar',
        status === 'loading' ? 'is-loading' : '',
        status === 'ready' ? 'is-ready' : '',
        showPlaceholder ? 'is-placeholder is-initials' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      aria-hidden={alt ? undefined : true}
    >
      {status === 'loading' ? <span className="provider-avatar__shine" aria-hidden="true" /> : null}
      {showImage ? (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={alt}
          className={imgClassName}
          decoding="async"
          onLoad={() => setStatus('ready')}
          onError={handleError}
        />
      ) : null}
      {showPlaceholder ? (
        <span className="provider-avatar__fallback">
          {placeholder || initials}
        </span>
      ) : null}
    </span>
  )
}
