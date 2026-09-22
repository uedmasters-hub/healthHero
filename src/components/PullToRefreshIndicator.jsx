import './PullToRefresh.css'

/**
 * Visual indicator for usePullToRefresh — place as first child of the scroller.
 */
export default function PullToRefreshIndicator({ pull = 0, refreshing = false, threshold = 64 }) {
  const visible = refreshing || pull > 8
  const progress = Math.min(1, (refreshing ? threshold : pull) / threshold)
  const height = refreshing ? threshold : pull

  return (
    <div
      className={`ptr-indicator ${visible ? 'is-visible' : ''} ${refreshing ? 'is-refreshing' : ''}`}
      style={{ height }}
      aria-hidden={!visible}
    >
      <div
        className="ptr-spinner"
        style={{ transform: `scale(${0.6 + progress * 0.4}) rotate(${progress * 220}deg)` }}
      />
      <span className="ptr-label">
        {refreshing ? 'Updating…' : pull >= threshold ? 'Release to refresh' : 'Pull to refresh'}
      </span>
    </div>
  )
}
