import { useNavigate } from 'react-router-dom'
import { exploreSpecialtyPath } from '../data/specialisations'
import { useTransition } from './PageTransition'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import './Categories.css'

const categories = [
  { name: 'Neurologist', image: '/img/specilisations/Neurologist.png' },
  { name: 'Cardiologist', image: '/img/specilisations/Cardiologist.png' },
  { name: 'Orthopedist', image: '/img/specilisations/Orthopedist.png' },
  { name: 'Pulmonologist', image: '/img/specilisations/Pulmonologist.png' },
  { name: 'Dermatologist', image: '/img/specilisations/Dermatologist.png' },
  { name: 'Dentist', image: '/img/specilisations/Dentist.png' },
]

export default function Categories() {
  const navigate = useNavigate()
  const { openSpecialisations } = useTransition()
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal()
  const moreIdx = categories.length

  return (
    <div className="categories">
      <div className="categories-scroll" ref={containerRef}>
        {categories.map((cat, i) => (
          <RevealItem
            className="category-card"
            key={cat.name}
            revealed={isRevealed(i)}
            cached={isCached}
            ref={setItemRef(i)}
            onClick={() => navigate(exploreSpecialtyPath(cat.name))}
          >
            <div className="category-icon">
              <img src={cat.image} alt={cat.name} />
            </div>
            <span className="category-name">{cat.name}</span>
          </RevealItem>
        ))}
        <RevealItem
          as="button"
          type="button"
          className="category-card view-all-card"
          revealed={isRevealed(moreIdx)}
          cached={isCached}
          ref={setItemRef(moreIdx)}
          onClick={() => openSpecialisations()}
        >
          <div className="category-icon view-all-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <span className="category-name">More...</span>
        </RevealItem>
      </div>
    </div>
  )
}
