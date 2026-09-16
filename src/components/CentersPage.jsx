import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import EmptyState from './EmptyState'
import './PlaceholderPage.css'

export default function CentersPage() {
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({ delay: 200 })

  return (
    <div className="placeholder-page">
      <div className="placeholder-header">
        <h1 className="placeholder-title">Healthcare Centers</h1>
        <p className="placeholder-subtitle">Discover nearby hospitals and clinics</p>
      </div>
      <RevealItem className="placeholder-content" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
        <EmptyState
          image="/img/empty_state/hospital.png"
          alt=""
          title="Coming soon"
          message="Nearby hospitals and clinics across India will appear here soon."
        />
      </RevealItem>
    </div>
  )
}
