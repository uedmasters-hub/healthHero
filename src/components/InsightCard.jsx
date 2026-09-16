export default function InsightCard({ article, onClick, className = '' }) {
  if (!article) return null

  return (
    <button
      type="button"
      className={`insight-card ${className}`.trim()}
      onClick={onClick}
    >
      <InsightCardBody article={article} />
    </button>
  )
}

export function InsightCardBody({ article }) {
  return (
    <>
      <div className="insight-content">
        <div className="insight-title">{article.title}</div>
        <div className="insight-meta">{article.readTime}</div>
      </div>
      <div className="insight-image">
        <div className="insight-image-placeholder" aria-hidden="true">{article.emoji}</div>
      </div>
    </>
  )
}
