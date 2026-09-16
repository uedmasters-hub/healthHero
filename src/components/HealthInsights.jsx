import { useNavigate } from 'react-router-dom'
import { articlePath, getHomeInsights } from '../data/articles'
import { useTransition } from './PageTransition'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import { InsightCardBody } from './InsightCard'
import './HealthInsights.css'

export default function HealthInsights() {
  const navigate = useNavigate()
  const { openInsights } = useTransition()
  const insights = getHomeInsights()
  const { containerRef, setItemRef, isRevealed, isCached } = useStaggerReveal({ delay: 420 })

  const openArticle = (article) => {
    navigate(articlePath(article.id), {
      state: { origin: 'home', returnTo: '/' },
    })
  }

  return (
    <div className="health-insights">
      <div className="section-header">
        <h2 className="section-title">Health Insights</h2>
        <button type="button" className="view-all-link" onClick={openInsights}>
          View all &gt;
        </button>
      </div>
      <div className="insights-scroll" ref={containerRef}>
        {insights.map((insight, i) => (
          <RevealItem
            as="button"
            type="button"
            className="insight-card"
            key={insight.id}
            revealed={isRevealed(i)}
            cached={isCached}
            ref={setItemRef(i)}
            onClick={() => openArticle(insight)}
          >
            <InsightCardBody article={insight} />
          </RevealItem>
        ))}
      </div>
    </div>
  )
}
