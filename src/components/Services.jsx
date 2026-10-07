import { useNavigate } from 'react-router-dom'
import { useTransition } from './PageTransition'
import { useDemoPreview } from './DemoPreviewModal'
import { runServiceAction } from '../lib/serviceActions'
import ActionGrid from './ActionGrid'
import { HOME_SERVICES } from './serviceCatalog'
import { SectionHead } from './ui'
import './Services.css'

export default function Services() {
  const navigate = useNavigate()
  const { openServices } = useTransition()
  const { show: showDemoPreview } = useDemoPreview()

  const handleService = (item) => {
    runServiceAction(item.label, {
      navigate,
      onPreview: showDemoPreview,
    })
  }

  return (
    <section className="services" aria-label="Our services">
      <SectionHead
        title="Our Services"
        action={(
          <button type="button" className="ds-link" onClick={openServices} aria-haspopup="dialog">
            View all
          </button>
        )}
      />
      <ActionGrid items={HOME_SERVICES} label="Our services" onSelect={handleService} />
    </section>
  )
}
