import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransition } from './PageTransition'
import { useDemoPreview } from './DemoPreviewModal'
import { runServiceAction } from '../lib/serviceActions'
import ActionGrid from './ActionGrid'
import { SERVICE_SECTIONS } from './serviceCatalog'
import './Services.css'
import { EndOfPage, SheetHeader } from './ui'

export default function ServicesBottomSheet() {
  const navigate = useNavigate()
  const { isServicesOpen, isServicesSlidingOut, closeServices } = useTransition()
  const { show: showDemoPreview } = useDemoPreview()
  const contentRef = useRef(null)
  const open = isServicesOpen || isServicesSlidingOut

  useEffect(() => {
    if (!isServicesOpen || isServicesSlidingOut) return undefined
    if (contentRef.current) contentRef.current.scrollTop = 0
    const onKey = (event) => {
      if (event.key === 'Escape') closeServices()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isServicesOpen, isServicesSlidingOut, closeServices])

  const handleClose = () => {
    if (isServicesSlidingOut) return
    closeServices()
  }

  const handleService = (item) => {
    runServiceAction(item.label, {
      navigate,
      onCloseOverlays: closeServices,
      onPreview: showDemoPreview,
    })
  }

  if (!open) return null

  return (
    <div className={`services-bottom-sheet-overlay ${isServicesSlidingOut ? 'closing' : ''}`} onClick={handleClose}>
      <div className="services-bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="services-sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="ds-sheet-handle" aria-hidden="true" />
        <SheetHeader as="h2" className="sheet-page-header" titleId="services-sheet-title" title="All Services" onClose={handleClose} />
        <div className="services-bottom-sheet-content" ref={contentRef}>
          {SERVICE_SECTIONS.map((section, index) => (
            <section
              key={section.title}
              className="services-bottom-sheet-section"
              aria-labelledby={`services-sheet-${index}`}
              style={{ '--section-index': index }}
            >
              <h3 className="services-bottom-sheet-section-title" id={`services-sheet-${index}`}>{section.title}</h3>
              <ActionGrid items={section.items} label={section.title} onSelect={handleService} />
            </section>
          ))}
          <EndOfPage />
        </div>
      </div>
    </div>
  )
}
