import { SheetPortal } from './PageTransition'
import './GalleryLightbox.css'

export default function GalleryLightbox({ images, isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <SheetPortal>
      <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Clinic photos">
        <button type="button" className="gallery-lightbox-close" onClick={onClose} aria-label="Close gallery">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="gallery-lightbox-scroll">
          {images.map((src) => (
            <img key={src} className="gallery-lightbox-img" src={src} alt="" />
          ))}
        </div>
      </div>
    </SheetPortal>
  )
}
