import { useNavigate } from 'react-router-dom'
import { useTransition } from './PageTransition'
import { useDemoPreview } from './DemoPreviewModal'
import { runServiceAction } from '../lib/serviceActions'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import './Services.css'

const services = [
  {
    name: 'Book Appointment',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    name: 'Video Consultation',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    name: 'Pharmacy',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
        <path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
        <path d="M9 9h6" />
        <path d="M12 6v6" />
      </svg>
    ),
  },
  {
    name: 'Pathology Labs',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    ),
  },
  {
    name: 'Emergency',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
  },
  {
    name: 'Home Sample Collection',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
]

export default function Services() {
  const navigate = useNavigate()
  const { openServices } = useTransition()
  const { show: showDemoPreview } = useDemoPreview()
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({
    dataset: 'home:services',
  })

  const handleService = (name) => {
    runServiceAction(name, {
      navigate,
      onPreview: showDemoPreview,
    })
  }

  return (
    <div className="services">
      <div className="section-header">
        <h2 className="section-title">Our Services</h2>
        <a className="view-all-link" onClick={openServices}>View all &gt;</a>
      </div>
      <div className="services-grid" ref={containerRef}>
        {services.map((service, i) => (
          <RevealItem
            as="button"
            type="button"
            className="service-card"
            key={service.name}
            revealed={isRevealed(i)}
            cached={isCached}
            ref={setItemRef(i)}
            onClick={() => handleService(service.name)}
          >
            <div className="service-icon-wrapper">
              {service.icon}
            </div>
            <span className="service-name">{service.name}</span>
          </RevealItem>
        ))}
      </div>
    </div>
  )
}
