/**
 * Shared circular provider avatar — Home, Treat, Ready for Visit, Provider Chat.
 * Frame size/layout never changes with load state. Skeleton while resolving;
 * image content swaps to the catalog placeholder only after a genuine failure.
 */
import { useEffect, useRef, useState } from 'react'
import { resolveProviderPhoto } from '../lib/providerPhoto'
import './ProviderAvatar.css'

const CATALOG_PLACEHOLDER = '/img/doctors/new/doctor.png'

export default function ProviderAvatar({
  doctor = null,
  src = null,
  alt = '',
  className = '',
  imgClassName = 'provider-avatar__img',
  placeholder = null,
  size = null,
  /** When true, failed loads retry the shared catalog placeholder before icons. */
  useCatalogFallback = true,
}) {
  const resolved = src || resolveProviderPhoto(doctor) || ''
  const doctorId = doctor?.id ?? doctor?.doctorId ?? ''
  const srcKey = `${resolved}|${doctorId}`

  const [status, setStatus] = useState(resolved ? 'loading' : 'empty')
  const [currentSrc, setCurrentSrc] = useState(resolved)
  const triedCatalog = useRef(false)

  useEffect(() => {
    triedCatalog.current = false
    const next = src || resolveProviderPhoto(doctor) || ''
    setCurrentSrc(next)
    setStatus(next ? 'loading' : 'empty')
  }, [srcKey]) // eslint-disable-line react-hooks/exhaustive-deps -- stabilize on src/id only

  const handleError = () => {
    if (
      useCatalogFallback
      && !triedCatalog.current
      && currentSrc
      && currentSrc !== CATALOG_PLACEHOLDER
    ) {
      triedCatalog.current = true
      setCurrentSrc(CATALOG_PLACEHOLDER)
      setStatus('loading')
      return
    }
    setStatus('error')
  }

  const showImage = Boolean(currentSrc) && status !== 'error' && status !== 'empty'
  // Only show icon/initials fallback after genuine failure — never during load.
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
        showPlaceholder ? 'is-placeholder' : '',
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
      {showPlaceholder && placeholder ? (
        <span className="provider-avatar__fallback">
          {placeholder}
        </span>
      ) : null}
    </span>
  )
}
