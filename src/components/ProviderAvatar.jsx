/**
 * Shared circular provider avatar — Home, Treat, Ready for Visit, Provider Chat.
 * Keeps the frame stable while the image resolves; falls back to the existing
 * provider placeholder only after a genuine load failure (or missing src).
 */
import { useEffect, useState } from 'react'
import { resolveProviderPhoto } from '../lib/providerPhoto'
import './ProviderAvatar.css'

export default function ProviderAvatar({
  doctor = null,
  src = null,
  alt = '',
  className = '',
  imgClassName = 'provider-avatar__img',
  placeholder = null,
  size = null,
}) {
  const resolved = src || resolveProviderPhoto(doctor)
  const [status, setStatus] = useState(resolved ? 'loading' : 'empty')
  const [currentSrc, setCurrentSrc] = useState(resolved)

  useEffect(() => {
    const next = src || resolveProviderPhoto(doctor)
    setCurrentSrc(next)
    setStatus(next ? 'loading' : 'empty')
  }, [src, doctor])

  const showImage = currentSrc && status !== 'error' && status !== 'empty'
  const showPlaceholder = !showImage || status === 'error' || status === 'empty'

  const style = size
    ? { width: size, height: size, minWidth: size, minHeight: size }
    : undefined

  return (
    <span
      className={[
        'provider-avatar',
        status === 'loading' ? 'is-loading' : '',
        showPlaceholder ? 'is-placeholder' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      aria-hidden={alt ? undefined : true}
    >
      {status === 'loading' ? <span className="provider-avatar__shine" /> : null}
      {showImage ? (
        <img
          src={currentSrc}
          alt={alt}
          className={imgClassName}
          decoding="async"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      ) : null}
      {showPlaceholder ? (
        <span className="provider-avatar__fallback">
          {placeholder}
        </span>
      ) : null}
    </span>
  )
}
