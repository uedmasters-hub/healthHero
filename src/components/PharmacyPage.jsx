import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import EmptyState from './EmptyState'
import './PlaceholderPage.css'

export default function PharmacyPage() {
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({ delay: 200 })

  return (
    <div className="placeholder-page">
      <div className="placeholder-header">
        <h1 className="placeholder-title">Pharmacy</h1>
        <p className="placeholder-subtitle">Order medicines and get them delivered</p>
      </div>
      <RevealItem className="placeholder-content" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
        <EmptyState
          image="/img/empty_state/pharmacy.png"
          alt=""
          title="Coming soon"
          message="Online pharmacy and medicine delivery will be available here soon."
        />
      </RevealItem>
    </div>
  )
}
